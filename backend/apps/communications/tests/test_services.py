from django.test import TestCase
import uuid

from apps.communications.domain.models import (
    CommunicationChannel, CommunicationProvider, CommunicationTemplate,
    CommunicationMessage, CommunicationPreference, Notification,
)
from apps.communications.application.services import (
    CommunicationService, TemplateService, NotificationCenterService,
    PreferenceService, StatisticsService,
)


class CommunicationServiceTest(TestCase):
    """اختبارات خدمة الاتصالات الرئيسية"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.channel = CommunicationChannel.objects.create(
            tenant_id=self.tenant_id, name='بريد إلكتروني',
            code='email_svc', channel_type='email', is_active=True,
        )
        self.provider = CommunicationProvider.objects.create(
            tenant_id=self.tenant_id, channel=self.channel,
            name='SMTP Test', code='smtp_test_svc',
            provider_type='smtp', is_active=True, is_default=True,
        )

    def test_render_template(self):
        template_text = 'مرحباً {{student_name}} في {{school_name}}'
        variables = {'student_name': 'أحمد', 'school_name': 'مدرسة نبراس'}
        result = CommunicationService._render_template(template_text, variables)
        self.assertEqual(result, 'مرحباً أحمد في مدرسة نبراس')

    def test_render_template_missing_variable(self):
        template_text = 'مرحباً {{student_name}}'
        variables = {}
        result = CommunicationService._render_template(template_text, variables)
        self.assertEqual(result, 'مرحباً {{student_name}}')

    def test_render_template_none_value(self):
        template_text = 'القيمة: {{value}}'
        variables = {'value': None}
        result = CommunicationService._render_template(template_text, variables)
        self.assertEqual(result, 'القيمة: ')

    def test_send_message_creates_message(self):
        message = CommunicationService.send_message(
            tenant_id=self.tenant_id,
            channel_code='email_svc',
            recipients=[{'address': 'test@example.com', 'name': 'اختبار'}],
            subject='اختبار الإرسال',
            body='<p>محتوى تجريبي</p>',
            source_module='admissions',
        )
        self.assertIsNotNone(message)
        self.assertEqual(message.status, 'queued')
        self.assertEqual(message.source_module, 'admissions')
        self.assertEqual(message.recipients.count(), 1)

    def test_send_message_with_template(self):
        template = CommunicationTemplate.objects.create(
            tenant_id=self.tenant_id,
            name='ترحيب', code='welcome_svc',
            subject='مرحباً {{student_name}}',
            body='أهلاً {{student_name}} في {{school_name}}',
        )
        message = CommunicationService.send_message(
            tenant_id=self.tenant_id,
            channel_code='email_svc',
            recipients=[{'address': 'student@school.edu', 'name': 'أحمد'}],
            template_code='welcome_svc',
            variables={'student_name': 'أحمد', 'school_name': 'نبراس'},
        )
        self.assertIn('أحمد', message.subject)
        self.assertIn('نبراس', message.body)

    def test_send_message_invalid_channel(self):
        with self.assertRaises(ValueError):
            CommunicationService.send_message(
                tenant_id=self.tenant_id,
                channel_code='nonexistent_channel',
                recipients=[{'address': 'test@test.com'}],
                body='test',
            )

    def test_send_message_no_body(self):
        with self.assertRaises(ValueError):
            CommunicationService.send_message(
                tenant_id=self.tenant_id,
                channel_code='email_svc',
                recipients=[{'address': 'test@test.com'}],
            )

    def test_check_preferences_default_allow(self):
        result = CommunicationService.check_preferences(
            self.tenant_id, 'student', uuid.uuid4(), 'email'
        )
        self.assertTrue(result)

    def test_check_preferences_opt_out(self):
        entity_id = uuid.uuid4()
        CommunicationPreference.objects.create(
            tenant_id=self.tenant_id,
            entity_type='student', entity_id=entity_id,
            global_opt_out=True,
        )
        result = CommunicationService.check_preferences(
            self.tenant_id, 'student', entity_id, 'email'
        )
        self.assertFalse(result)

    def test_check_preferences_channel_disabled(self):
        entity_id = uuid.uuid4()
        CommunicationPreference.objects.create(
            tenant_id=self.tenant_id,
            entity_type='student', entity_id=entity_id,
            email_enabled=False,
        )
        result = CommunicationService.check_preferences(
            self.tenant_id, 'student', entity_id, 'email'
        )
        self.assertFalse(result)


class TemplateServiceTest(TestCase):
    """اختبارات خدمة القوالب"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.template = CommunicationTemplate.objects.create(
            tenant_id=self.tenant_id,
            name='قالب اختبار', code='test_tpl',
            subject='{{subject_var}}', body='{{body_var}}',
        )

    def test_extract_variables(self):
        text = 'مرحباً {{student_name}} في {{school_name}} - العام {{academic_year}}'
        variables = TemplateService.extract_variables(text)
        self.assertIn('student_name', variables)
        self.assertIn('school_name', variables)
        self.assertIn('academic_year', variables)

    def test_extract_variables_empty(self):
        variables = TemplateService.extract_variables('')
        self.assertEqual(variables, [])

    def test_create_version(self):
        version = TemplateService.create_version(
            tenant_id=self.tenant_id,
            template_id=self.template.id,
            body='محتوى جديد',
            change_log='تحديث أولي',
        )
        self.assertEqual(version.version_number, 1)
        self.assertEqual(version.status, 'draft')

    def test_create_version_increments(self):
        TemplateService.create_version(
            self.tenant_id, self.template.id, body='v1')
        v2 = TemplateService.create_version(
            self.tenant_id, self.template.id, body='v2')
        self.assertEqual(v2.version_number, 2)


class NotificationCenterServiceTest(TestCase):
    """اختبارات خدمة مركز الإشعارات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

    def test_create_notification(self):
        notif = NotificationCenterService.create_notification(
            tenant_id=self.tenant_id, user_id=self.user_id,
            title='إشعار جديد', body='محتوى الإشعار',
            category='academic', priority='high',
        )
        self.assertIsNotNone(notif)
        self.assertFalse(notif.is_read)

    def test_mark_as_read(self):
        notif = NotificationCenterService.create_notification(
            self.tenant_id, self.user_id, 'عنوان', 'محتوى')
        NotificationCenterService.mark_as_read(
            self.tenant_id, notif.id, self.user_id)
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)

    def test_mark_all_as_read(self):
        for i in range(5):
            NotificationCenterService.create_notification(
                self.tenant_id, self.user_id, f'إشعار {i}', 'محتوى')
        NotificationCenterService.mark_all_as_read(
            self.tenant_id, self.user_id)
        unread = Notification.objects.filter(
            tenant_id=self.tenant_id, user_id=self.user_id, is_read=False
        ).count()
        self.assertEqual(unread, 0)

    def test_unread_count(self):
        for i in range(3):
            NotificationCenterService.create_notification(
                self.tenant_id, self.user_id, f'إشعار {i}', 'محتوى')
        count = NotificationCenterService.get_unread_count(
            self.tenant_id, self.user_id)
        self.assertEqual(count, 3)

    def test_archive_notification(self):
        notif = NotificationCenterService.create_notification(
            self.tenant_id, self.user_id, 'عنوان', 'محتوى')
        NotificationCenterService.archive_notification(
            self.tenant_id, notif.id, self.user_id)
        notif.refresh_from_db()
        self.assertTrue(notif.is_archived)


class PreferenceServiceTest(TestCase):
    """اختبارات خدمة التفضيلات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.entity_id = uuid.uuid4()

    def test_get_or_create_preference(self):
        pref = PreferenceService.get_or_create_preference(
            self.tenant_id, 'student', self.entity_id)
        self.assertEqual(pref.preferred_language, 'ar')

    def test_update_preference(self):
        PreferenceService.get_or_create_preference(
            self.tenant_id, 'student', self.entity_id)
        pref = PreferenceService.update_preference(
            self.tenant_id, 'student', self.entity_id,
            preferred_language='en', email_enabled=False,
        )
        self.assertEqual(pref.preferred_language, 'en')
        self.assertFalse(pref.email_enabled)

    def test_register_device_token(self):
        pref = PreferenceService.register_device_token(
            self.tenant_id, 'student', self.entity_id, 'fcm-token-123')
        self.assertIn('fcm-token-123', pref.device_tokens)

    def test_remove_device_token(self):
        PreferenceService.register_device_token(
            self.tenant_id, 'student', self.entity_id, 'fcm-token-456')
        pref = PreferenceService.remove_device_token(
            self.tenant_id, 'student', self.entity_id, 'fcm-token-456')
        self.assertNotIn('fcm-token-456', pref.device_tokens)
