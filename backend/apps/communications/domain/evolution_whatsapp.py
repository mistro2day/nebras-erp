# -*- coding: utf-8 -*-
"""
محرك ربط منصة نبراس بخادم Evolution API (Baileys Engine v2)
يتيح هذا المحرك ربط أي شريحة سودانية عادية (مثلاً: 0912345678) عبر مسح رمز QR Code 
وإرسال كافة رسائل وتنبيهات الواتساب مجاناً وبلا رسوم لكل رسالة.
"""
import requests
import json
import logging
import os

logger = logging.getLogger(__name__)

class EvolutionWhatsAppClient:
    def __init__(self, base_url: str = None, api_key: str = "evo_key_998237465", instance_name: str = "nebras-khartoum-instance"):
        env_url = os.getenv("EVOLUTION_API_URL")
        if env_url:
            self.base_url = env_url.rstrip('/')
        elif not base_url or "wa.nebras.edu.sd" in str(base_url):
            self.base_url = "http://localhost:8080"
        else:
            self.base_url = base_url.rstrip('/')

        self.api_key = api_key
        self.instance_name = instance_name
        self.headers = {
            "Content-Type": "application/json",
            "apikey": self.api_key
        }

    def format_phone_number(self, phone: str) -> str:
        """
        تنسيق رقم الهاتف السوداني للسيغة الدولية المطلوبة في الواتساب (+249)
        مثال: 0912345678 -> 249912345678
        """
        clean = ''.join(filter(str.isdigit, phone))
        if clean.startswith('0'):
            clean = '249' + clean[1:]
        elif clean.startswith('249'):
            pass
        else:
            clean = '249' + clean
        return clean

    def get_connection_state(self) -> dict:
        """فحص حالة اقتران الجلسة في الإيفولوشن (open / close / connecting)."""
        url = f"{self.base_url}/instance/connectionState/{self.instance_name}"
        try:
            res = requests.get(url, headers=self.headers, timeout=5)
            return res.json()
        except Exception as e:
            return {"instance": {"state": "close", "error": str(e)}}

    def create_instance(self) -> dict:
        """
        1. إنشاء جلسة جديدة (Instance) على خادم Evolution API
        """
        url = f"{self.base_url}/instance/create"
        payload = {
            "instanceName": self.instance_name,
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS"
        }
        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=10)
            return response.json()
        except Exception as e:
            logger.error(f"فشل إنشاء جلسة إيفولوشن: {str(e)}")
            return {"status": "error", "message": str(e)}

    def get_qr_code(self) -> dict:
        """
        2. جلب كود الـ QR Code الحقيقي المباشر لمسحه من شريحة الهاتف السوداني
        """
        state_data = self.get_connection_state()
        state = state_data.get("instance", {}).get("state", "close")
        if state == "open":
            return {
                "status": "success",
                "connected": True,
                "state": "open",
                "message": "الجلسة متصلة ومقترنة بالفعل بالواتساب."
            }

        url = f"{self.base_url}/instance/connect/{self.instance_name}"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            data = response.json()

            if response.status_code == 404 or "not found" in str(data).lower():
                self.create_instance()
                response = requests.get(url, headers=self.headers, timeout=10)
                data = response.json()

            qr_data = data.get("base64") or data.get("code") or data.get("qrcode", {}).get("base64")
            if qr_data:
                return {
                    "status": "success",
                    "connected": False,
                    "state": state,
                    "base64": qr_data,
                    "code": data.get("code")
                }
            return data
        except Exception as e:
            logger.error(f"فشل جلب QR Code: {str(e)}")
            return {"status": "error", "message": str(e)}

    def send_text_message(self, phone_number: str, message: str) -> dict:
        """
        3. إرسال رسالة نصية فورية عبر الواتساب (Text Message)
        """
        formatted_phone = self.format_phone_number(phone_number)
        url = f"{self.base_url}/message/sendText/{self.instance_name}"
        
        payload = {
            "number": formatted_phone,
            "options": {
                "delay": 1200, # تأخير طبيعي لمكافحة الحظر (1.2 ثانية)
                "presence": "composing"
            },
            "textMessage": {
                "text": message
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=15)
            logger.info(f"تم إرسال رسالة واتساب للرقم {formatted_phone}: {response.status_code}")
            return response.json()
        except Exception as e:
            logger.error(f"خطأ في إرسال رسالة الواتساب: {str(e)}")
            return {"status": "error", "message": str(e)}

    def send_document(self, phone_number: str, document_url: str, filename: str, caption: str = "") -> dict:
        """
        4. إرسال مستند PDF (فاتورة دراسية أو كشف درجات) عبر الواتساب
        """
        formatted_phone = self.format_phone_number(phone_number)
        url = f"{self.base_url}/message/sendMedia/{self.instance_name}"
        
        payload = {
            "number": formatted_phone,
            "mediaMessage": {
                "mediatype": "document",
                "fileName": filename,
                "caption": caption,
                "media": document_url # رابط المستند أو Base64
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=20)
            return response.json()
        except Exception as e:
            logger.error(f"خطأ في إرسال مستند الواتساب: {str(e)}")
            return {"status": "error", "message": str(e)}


# مثال للاختبار المباشر:
if __name__ == '__main__':
    client = EvolutionWhatsAppClient()
    print("--- تجربة إرسال رسالة عبر خادم Evolution API ---")
    result = client.send_text_message(
        phone_number="0912345678",
        message="عزيزي ولي الأمر عثمان إبراهيم الكباشي، تم إصدار الفاتورة رقم INV-2026-4409 بمبلغ 120,000 ج.س. مدارس نبراس السودان."
    )
    print("النتيجة:", json.dumps(result, ensure_ascii=False, indent=2))
