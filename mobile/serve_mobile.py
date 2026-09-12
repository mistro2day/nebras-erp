import http.server
import urllib.request
import urllib.error
import ssl
import os
import sys

PORT = 8085
WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "web")
TARGET_API = "https://nebras-erp-api-85v9.onrender.com"

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

class UnifiedMobileHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Access-Control-Max-Age", "86400")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/v1"):
            self._proxy_api()
        else:
            # التحقق مما إذا كان الملف موجوداً، وإلا توجيه الـ SPA إلى index.html
            local_path = self.translate_path(self.path)
            if not os.path.exists(local_path) and not self.path.startswith("/assets/"):
                self.path = "/index.html"
            super().do_GET()

    def do_HEAD(self):
        if self.path.startswith("/api/v1"):
            self._proxy_api(is_head=True)
        else:
            super().do_HEAD()

    def do_POST(self):
        if self.path.startswith("/api/v1"):
            self._proxy_api()
        else:
            self.send_error(405, "Method Not Allowed")

    def do_PUT(self):
        if self.path.startswith("/api/v1"):
            self._proxy_api()
        else:
            self.send_error(405, "Method Not Allowed")

    def do_PATCH(self):
        if self.path.startswith("/api/v1"):
            self._proxy_api()
        else:
            self.send_error(405, "Method Not Allowed")

    def do_DELETE(self):
        if self.path.startswith("/api/v1"):
            self._proxy_api()
        else:
            self.send_error(405, "Method Not Allowed")

    def _proxy_api(self, is_head=False):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None

        target_url = TARGET_API + self.path
        req = urllib.request.Request(target_url, data=body, method=self.command)

        skip_headers = {"host", "content-length", "origin", "connection"}
        for k, v in self.headers.items():
            if k.lower() not in skip_headers:
                req.add_header(k, v)
        req.add_header("Host", "nebras-erp-api-85v9.onrender.com")

        try:
            with urllib.request.urlopen(req, context=ssl_context, timeout=40) as response:
                self.send_response(response.status)
                for header, val in response.headers.items():
                    if header.lower() not in {"transfer-encoding", "access-control-allow-origin", "connection"}:
                        self.send_header(header, val)
                self.end_headers()
                if not is_head:
                    self.wfile.write(response.read())
        except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
            pass
        except urllib.error.HTTPError as e:
            try:
                self.send_response(e.code)
                for header, val in e.headers.items():
                    if header.lower() not in {"transfer-encoding", "access-control-allow-origin", "connection"}:
                        self.send_header(header, val)
                self.end_headers()
                if not is_head:
                    self.wfile.write(e.read())
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                pass
        except Exception as e:
            try:
                self.send_response(502)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                if not is_head:
                    self.wfile.write(f'{{"error": "{str(e)}"}}'.encode("utf-8"))
            except (ConnectionResetError, ConnectionAbortedError, BrokenPipeError):
                pass

def run():
    server_address = ("0.0.0.0", PORT)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    httpd = http.server.ThreadingHTTPServer(server_address, UnifiedMobileHandler)
    print(f"Unified Mobile Web Server running on port {PORT} serving {WEB_DIR}", flush=True)
    httpd.serve_forever()

if __name__ == "__main__":
    run()
