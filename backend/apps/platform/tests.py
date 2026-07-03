from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from apps.platform.domain.models import SystemConfiguration, FeatureFlag, EventLog, AuditLog
from apps.platform.application.events import EventBus
from apps.platform.application.notifications import NotificationCenter
from apps.platform.application.audit import AuditEngine
from apps.platform.application.storage import FileStorageService
from apps.platform.application.services import (
    ConfigurationService, CacheService, FeatureFlagsService, SystemHealthService
)
import uuid

class PlatformInfrastructureTest(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()
        
    def test_configuration_service(self):
        """التحقق من حفظ واسترجاع الإعدادات العامة والخاصة بالمستأجر"""
        ConfigurationService.set_setting("school_name", "مدرسة نون", tenant_id=self.tenant_id)
        ConfigurationService.set_setting("system_version", "1.0.0")
        
        # استرجاع إعداد المستأجر
        self.assertEqual(ConfigurationService.get_setting("school_name", tenant_id=self.tenant_id), "مدرسة نون")
        # استرجاع إعداد عام
        self.assertEqual(ConfigurationService.get_setting("system_version"), "1.0.0")

    def test_cache_service(self):
        """التحقق من عمل الكاش وسرعة حفظ واسترجاع البيانات"""
        CacheService.set("test_key", "value_123", ttl=10)
        self.assertEqual(CacheService.get("test_key"), "value_123")
        CacheService.delete("test_key")
        self.assertIsNone(CacheService.get("test_key"))

    def test_event_bus(self):
        """التحقق من إمكانية الاشتراك ونشر الأحداث في ناقل الأحداث المركزي"""
        received = []
        def test_handler(payload, t_id):
            received.append(payload.get('data'))
            
        EventBus.subscribe("TestEvent", test_handler)
        EventBus.publish("TestEvent", {"data": "hello_event"}, tenant_id=self.tenant_id, async_dispatch=False)
        
        self.assertIn("hello_event", received)
        # التحقق من تسجيل الحدث في الـ EventLog
        self.assertTrue(EventLog.objects.filter(event_name="TestEvent").exists())

    def test_audit_engine(self):
        """التحقق من تسجيل العمليات وتغير القيم في سجل التدقيق بنجاح"""
        log = AuditEngine.log_action(
            user_id=self.user_id,
            action="update_profile",
            entity_name="Student",
            entity_id=uuid.uuid4(),
            old_values={"name": "قديم"},
            new_values={"name": "جديد"},
            tenant_id=self.tenant_id
        )
        self.assertEqual(log.action, "update_profile")
        self.assertTrue(AuditLog.objects.filter(action="update_profile").exists())

    def test_notification_center(self):
        """التحقق من إرسال التنبيهات الموحدة وتسجيلها"""
        notif = NotificationCenter.send(
            recipient_id=self.user_id,
            channel="email",
            title="تنبيه تجريبي",
            body="محتوى التنبيه",
            tenant_id=self.tenant_id,
            async_send=False
        )
        notif.refresh_from_db()
        self.assertEqual(notif.status, "sent")

    def test_file_storage_security(self):
        """التحقق من صحة رفع الملفات وحظر الملفات الضارة وغير الآمنة"""
        safe_file = SimpleUploadedFile("document.pdf", b"pdf content dummy", content_type="application/pdf")
        meta = FileStorageService.upload_file(safe_file, tenant_id=self.tenant_id, user_id=self.user_id)
        self.assertEqual(meta.file_name, "document.pdf")
        
        # محاولة رفع ملف ضار .sh
        malicious_file = SimpleUploadedFile("script.sh", b"echo 'bad'", content_type="application/x-sh")
        with self.assertRaises(ValidationError):
            FileStorageService.upload_file(malicious_file, tenant_id=self.tenant_id, user_id=self.user_id)

    def test_feature_flags(self):
        """التحقق من عمل الـ Feature Flags وتنشيط الميزات"""
        FeatureFlag.objects.create(
            flag_name="new_ui_theme",
            is_enabled=True,
            rollout_percentage=100,
            tenant_id=self.tenant_id
        )
        self.assertTrue(FeatureFlagsService.is_enabled("new_ui_theme", tenant_id=self.tenant_id))
        self.assertFalse(FeatureFlagsService.is_enabled("non_existing_flag"))

    def test_system_health(self):
        """التحقق من فحص صحة النظام وإعداد التقرير"""
        report = SystemHealthService.check_health()
        self.assertIn("database", report["services"])
        self.assertIn("cache", report["services"])
        self.assertIn("storage", report["services"])