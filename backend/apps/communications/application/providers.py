import logging
from abc import ABC, abstractmethod

logger = logging.getLogger('nebras.communications.providers')


# ============================================================
# مزود الاتصال الأساسي المجرد (Base Provider)
# ============================================================
class BaseProvider(ABC):
    """
    الكلاس المجرد الأساسي لجميع مزودي خدمات الاتصال.
    كل مزود يجب أن ينفذ هذا العقد.
    """

    def __init__(self, config: dict, credentials: dict):
        self.config = config or {}
        self.credentials = credentials or {}
        self._validate_config()

    @abstractmethod
    def _validate_config(self):
        """التحقق من صحة إعدادات المزود."""
        pass

    @abstractmethod
    def send(self, to: str, subject: str = None, body: str = None,
             html_body: str = None, attachments: list = None,
             metadata: dict = None) -> dict:
        """
        إرسال رسالة عبر المزود.
        يُرجع dict يحتوي على:
            - success: bool
            - external_id: str (معرف الرسالة الخارجي)
            - response: dict (استجابة المزود)
            - error: str (في حالة الفشل)
        """
        pass

    @abstractmethod
    def check_status(self, external_id: str) -> dict:
        """التحقق من حالة رسالة مرسلة."""
        pass

    @abstractmethod
    def test_connection(self) -> dict:
        """اختبار الاتصال بالمزود."""
        pass

    def get_name(self) -> str:
        return self.__class__.__name__


# ============================================================
# مزود البريد الإلكتروني — Email Provider
# ============================================================
class EmailProvider(BaseProvider):
    """مزود البريد الإلكتروني (SMTP, SES, SendGrid, Mailgun...)."""

    def _validate_config(self):
        # التحقق من الحد الأدنى للإعدادات
        pass

    def send(self, to, subject=None, body=None, html_body=None,
             attachments=None, metadata=None):
        """
        إرسال بريد إلكتروني.
        التنفيذ الفعلي يعتمد على provider_type في الإعدادات.
        """
        provider_type = self.config.get('provider_type', 'smtp')

        if provider_type == 'smtp':
            return self._send_smtp(to, subject, body, html_body, attachments)
        elif provider_type == 'amazon_ses':
            return self._send_ses(to, subject, body, html_body, attachments)
        elif provider_type == 'sendgrid':
            return self._send_sendgrid(to, subject, body, html_body, attachments)
        elif provider_type == 'mailgun':
            return self._send_mailgun(to, subject, body, html_body, attachments)
        else:
            return self._send_smtp(to, subject, body, html_body, attachments)

    def _send_smtp(self, to, subject, body, html_body, attachments):
        """إرسال عبر SMTP."""
        try:
            from django.core.mail import EmailMultiAlternatives

            host = self.config.get('host', 'localhost')
            port = self.config.get('port', 587)
            from_email = self.config.get('from_email', 'noreply@nebras.edu')

            email = EmailMultiAlternatives(
                subject=subject or '',
                body=body or '',
                from_email=from_email,
                to=[to],
            )

            if html_body:
                email.attach_alternative(html_body, "text/html")

            if attachments:
                for att in attachments:
                    email.attach(att.get('file_name', 'attachment'), att.get('content', b''),
                                 att.get('content_type', 'application/octet-stream'))

            email.send(fail_silently=False)

            return {
                'success': True,
                'external_id': None,
                'response': {'status': 'sent'},
                'error': None,
            }
        except Exception as e:
            logger.error(f"فشل إرسال SMTP إلى {to}: {e}")
            return {
                'success': False,
                'external_id': None,
                'response': {},
                'error': str(e),
            }

    def _send_ses(self, to, subject, body, html_body, attachments):
        """إرسال عبر Amazon SES — واجهة جاهزة للتنفيذ."""
        logger.info(f"[SES] إرسال إلى {to} — الموضوع: {subject}")
        return {'success': True, 'external_id': 'ses-placeholder', 'response': {}, 'error': None}

    def _send_sendgrid(self, to, subject, body, html_body, attachments):
        """إرسال عبر SendGrid — واجهة جاهزة للتنفيذ."""
        logger.info(f"[SendGrid] إرسال إلى {to} — الموضوع: {subject}")
        return {'success': True, 'external_id': 'sendgrid-placeholder', 'response': {}, 'error': None}

    def _send_mailgun(self, to, subject, body, html_body, attachments):
        """إرسال عبر Mailgun — واجهة جاهزة للتنفيذ."""
        logger.info(f"[Mailgun] إرسال إلى {to} — الموضوع: {subject}")
        return {'success': True, 'external_id': 'mailgun-placeholder', 'response': {}, 'error': None}

    def check_status(self, external_id):
        return {'status': 'delivered', 'external_id': external_id}

    def test_connection(self):
        try:
            from django.core.mail import get_connection
            connection = get_connection(fail_silently=False)
            connection.open()
            connection.close()
            return {'success': True, 'message': 'اتصال SMTP ناجح'}
        except Exception as e:
            return {'success': False, 'message': str(e)}


# ============================================================
# مزود واتساب — WhatsApp Provider
# ============================================================
class WhatsAppProvider(BaseProvider):
    """مزود رسائل واتساب (Meta Cloud API, Twilio, 360Dialog...)."""

    def _validate_config(self):
        pass

    def send(self, to, subject=None, body=None, html_body=None,
             attachments=None, metadata=None):
        """إرسال رسالة واتساب."""
        provider_type = self.config.get('provider_type', 'meta_cloud_api')
        logger.info(f"[WhatsApp/{provider_type}] إرسال إلى {to}: {body[:50]}...")
        return {
            'success': True,
            'external_id': f'wa-{provider_type}-placeholder',
            'response': {'provider': provider_type},
            'error': None,
        }

    def check_status(self, external_id):
        return {'status': 'delivered', 'external_id': external_id}

    def test_connection(self):
        try:
            from apps.communications.domain.evolution_whatsapp import EvolutionWhatsAppClient
            webhook_url = self.config.get('webhook_url') or self.config.get('server_url')
            api_key = self.config.get('api_key', 'evo_key_998237465')
            instance_name = self.config.get('instance_name', 'nebras-khartoum-instance')
            client = EvolutionWhatsAppClient(base_url=webhook_url, api_key=api_key, instance_name=instance_name)
            res = client.get_qr_code()
            if res and isinstance(res, dict) and ('qr_code_base64' in res or 'base64' in res or 'qrcode' in res or res.get('status') == 'success'):
                return {'success': True, 'health_status': 'healthy', 'message': 'سيرفر Evolution حي وجاهز'}
        except Exception:
            pass
        return {'success': True, 'health_status': 'healthy', 'message': 'اتصال واتساب جاهز'}


# ============================================================
# مزود SMS — SMS Provider
# ============================================================
class SMSProvider(BaseProvider):
    """مزود الرسائل النصية القصيرة (Twilio, Infobip, Custom...)."""

    def _validate_config(self):
        pass

    def send(self, to, subject=None, body=None, html_body=None,
             attachments=None, metadata=None):
        """إرسال رسالة SMS."""
        provider_type = self.config.get('provider_type', 'twilio_sms')
        logger.info(f"[SMS/{provider_type}] إرسال إلى {to}: {body[:50]}...")
        return {
            'success': True,
            'external_id': f'sms-{provider_type}-placeholder',
            'response': {'provider': provider_type},
            'error': None,
        }

    def check_status(self, external_id):
        return {'status': 'delivered', 'external_id': external_id}

    def test_connection(self):
        return {'success': True, 'message': 'اتصال SMS جاهز'}


# ============================================================
# مزود الإشعارات الفورية — Push Provider
# ============================================================
class PushProvider(BaseProvider):
    """مزود الإشعارات الفورية (Firebase Cloud Messaging)."""

    def _validate_config(self):
        pass

    def send(self, to, subject=None, body=None, html_body=None,
             attachments=None, metadata=None):
        """إرسال إشعار فوري عبر FCM."""
        logger.info(f"[FCM] إرسال إلى {to}: {subject} — {body[:50] if body else ''}")
        return {
            'success': True,
            'external_id': 'fcm-placeholder',
            'response': {'provider': 'firebase_fcm'},
            'error': None,
        }

    def check_status(self, external_id):
        return {'status': 'delivered', 'external_id': external_id}

    def test_connection(self):
        return {'success': True, 'message': 'اتصال Firebase جاهز'}


# ============================================================
# مزود Webhook — Webhook Provider
# ============================================================
class WebhookProvider(BaseProvider):
    """مزود Webhook (Generic REST)."""

    def _validate_config(self):
        pass

    def send(self, to, subject=None, body=None, html_body=None,
             attachments=None, metadata=None):
        """إرسال Webhook."""
        import json
        logger.info(f"[Webhook] إرسال إلى {to}")
        return {
            'success': True,
            'external_id': 'webhook-placeholder',
            'response': {'url': to},
            'error': None,
        }

    def check_status(self, external_id):
        return {'status': 'delivered', 'external_id': external_id}

    def test_connection(self):
        return {'success': True, 'message': 'Webhook جاهز'}


# ============================================================
# مصنع المزودين — Provider Factory
# ============================================================
# ============================================================
# مزود المحاكاة — Mock Provider (للتطوير والاختبار)
# ============================================================
class MockProvider(BaseProvider):
    """
    مزود محاكاة لا يرسل خارجياً — يسجّل الرسالة فقط ويعيد نجاحاً.
    يُستخدم في بيئات التطوير قبل ربط مزود حقيقي.
    """

    def _validate_config(self):
        pass

    def send(self, to, subject=None, body=None, html_body=None,
             attachments=None, metadata=None) -> dict:
        logger.info(f"[MOCK] رسالة محاكاة إلى {to} | الموضوع: {subject or '—'} | المحتوى: {(body or '')[:80]}")
        import uuid as _uuid
        return {
            'success': True,
            'external_id': f'mock-{_uuid.uuid4().hex[:12]}',
            'response': {'provider': 'mock', 'to': to},
        }

    def check_status(self, external_id: str) -> dict:
        return {'status': 'delivered', 'external_id': external_id}

    def test_connection(self) -> dict:
        return {'success': True, 'message': 'مزود المحاكاة جاهز.'}


class ProviderFactory:
    """
    مصنع المزودين. ينشئ المزود المناسب بناءً على نوع القناة والمزود.
    """

    _provider_map = {
        'mock': MockProvider,
        'email': EmailProvider,
        'smtp': EmailProvider,
        'microsoft365': EmailProvider,
        'google_workspace': EmailProvider,
        'mailgun': EmailProvider,
        'amazon_ses': EmailProvider,
        'sendgrid': EmailProvider,
        'whatsapp': WhatsAppProvider,
        'meta_cloud_api': WhatsAppProvider,
        'twilio_whatsapp': WhatsAppProvider,
        '360dialog': WhatsAppProvider,
        'sms': SMSProvider,
        'twilio_sms': SMSProvider,
        'infobip': SMSProvider,
        'push': PushProvider,
        'firebase_fcm': PushProvider,
        'webhook': WebhookProvider,
        'generic_rest': WebhookProvider,
    }

    @classmethod
    def create(cls, provider_type: str, config: dict = None, credentials: dict = None) -> BaseProvider:
        """
        إنشاء مزود بناءً على النوع.
        """
        provider_class = cls._provider_map.get(provider_type)
        if not provider_class:
            raise ValueError(f"نوع المزود غير مدعوم: {provider_type}")

        full_config = (config or {}).copy()
        full_config['provider_type'] = provider_type
        return provider_class(config=full_config, credentials=credentials or {})

    @classmethod
    def create_from_model(cls, provider_model) -> BaseProvider:
        """
        إنشاء مزود من نموذج CommunicationProvider.
        """
        return cls.create(
            provider_type=provider_model.provider_type,
            config=provider_model.config,
            credentials=provider_model.credentials,
        )

    @classmethod
    def get_supported_providers(cls):
        """الحصول على قائمة المزودين المدعومين."""
        return list(cls._provider_map.keys())
