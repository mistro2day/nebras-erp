"""
Nebras Automation Platform — Python SDK.

A thin, dependency-light client over the platform REST API. Uses the standard
``requests`` library if available; otherwise raises a clear error. Every call is
tenant-aware via the ``X-Tenant-ID`` header and returns the unwrapped ``data``
payload from the StandardResponse envelope.

Example
-------
>>> client = NebrasAutomationClient("https://erp.example.com", token="...", tenant_id="...")
>>> client.list_flows()
>>> client.run_flow(flow_id, payload={"score": 90})
"""
from __future__ import annotations
from typing import Any


class NebrasAutomationClient:
    BASE = "/api/v1/automation"

    def __init__(self, host: str, token: str | None = None, tenant_id: str | None = None, session: Any = None):
        self.host = host.rstrip("/")
        self.token = token
        self.tenant_id = tenant_id
        if session is None:
            try:
                import requests  # noqa: PLC0415
                session = requests.Session()
            except ImportError as exc:  # pragma: no cover
                raise RuntimeError("The Python SDK requires the 'requests' package.") from exc
        self._session = session

    # --- low level ---
    def _headers(self) -> dict:
        h = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        if self.tenant_id:
            h["X-Tenant-ID"] = str(self.tenant_id)
        return h

    def _url(self, path: str) -> str:
        return f"{self.host}{self.BASE}/{path.lstrip('/')}"

    def _unwrap(self, resp: Any) -> Any:
        data = resp.json()
        return data.get("data", data) if isinstance(data, dict) else data

    def get(self, path: str, **params) -> Any:
        return self._unwrap(self._session.get(self._url(path), headers=self._headers(), params=params))

    def post(self, path: str, payload: dict | None = None) -> Any:
        return self._unwrap(self._session.post(self._url(path), headers=self._headers(), json=payload or {}))

    # --- high level helpers ---
    def list_flows(self) -> Any:
        return self.get("flows/")

    def run_flow(self, flow_id: str, payload: dict | None = None) -> Any:
        return self.post(f"flows/{flow_id}/run/", {"payload": payload or {}})

    def list_diagrams(self) -> Any:
        return self.get("workflow-diagrams/")

    def publish_diagram(self, diagram_id: str) -> Any:
        return self.post(f"workflow-diagrams/{diagram_id}/publish/")

    def evaluate_decision_table(self, table_id: str, context: dict) -> Any:
        return self.post(f"decision-tables/{table_id}/evaluate/", {"context": context})

    def generate_entity(self, entity_id: str) -> Any:
        return self.post(f"entities/{entity_id}/generate/")

    def operations_overview(self) -> Any:
        return self.get("operations/overview/")

    def ai_assist(self, kind: str, prompt: str, context: dict | None = None) -> Any:
        return self.post("ai/assist/", {"kind": kind, "prompt": prompt, "context": context or {}})
