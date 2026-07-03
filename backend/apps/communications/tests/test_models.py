from django.test import TestCase
from django.contrib.auth import get_user_model
import uuid

from apps.communications.domain.models import (
    CommunicationChannel, CommunicationProvider, CommunicationTemplate,
    CommunicationTemplateVersion, CommunicationVariable, CommunicationMessage,
    CommunicationRecipient, CommunicationAttachment, CommunicationQueue,
    CommunicationLog, CommunicationPreference, CommunicationCampaign,
    CommunicationEvent, CommunicationWebhook, CommunicationStatistics,
    CommunicationFailure, CommunicationRetry, Notification,
)

User = get_user_model()


class CommunicationChannelModelTest(TestCase):
    """اختبارات نموذج قنوات الاتصال"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_channel(self):
        channel = CommunicationChannel.objects.create(
            tenant_id=self.tenant_id,
            name='بريد إلكتروني',
            code='email',
            channel_type='email',
            is_active=True,
        )
        self.assertEqual(channel.name, 'بريد إلكتروني')
        self.assertEqual(channel.channel_type, 'email')
        self.assertTrue(channel.is_active)

    def test_channel_str(self):
        channel = CommunicationChannel.objects.create(
            tenant_id=self.tenant_id, name='واتساب', code='whatsapp',
            channel_type='whatsapp',
        )
        self.assertIn('واتساب', str(channel))

    def test_soft_delete_channel(self):
        channel = CommunicationChannel.objects.create(
            tenant_id=self.tenant_id, name='SMS', code='sms_test',
            channel_type='sms',
        )
        channel.delete()
        self.assertIsNotNone(channel.deleted_at)
        self.assertEqual(CommunicationChannel.objects.filter(code='sms_test').count(), 0)


class CommunicationProviderModelTest(TestCase):
    """اختبارات نموذج مزودي الخدمة"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.channel = CommunicationChannel.objects.create(
            tenant_id=self.tenant_id, name='Email', code='email_ch',
            channel_type='email',
        )

    def test_create_provider(self):
        provider = CommunicationProvider.objects.create(
            tenant_id=self.tenant_id, channel=self.channel,
            name='SMTP Server', code='smtp_main',
            provider_type='smtp', is_default=True,
            config={'host': 'smtp.example.com', 'port': 587},
        )
        self.assertEqual(provider.provider_type, 'smtp')
        self.assertTrue(provider.is_default)

    def test_provider_credentials_stored(self):
        provider = CommunicationProvider.objects.create(
            tenant_id=self.tenant_id, channel=self.channel,
            name='SendGrid', code='sendgrid_test',
            provider_type='sendgrid',
            credentials={'api_key': 'test-key-123'},
        )
        self.assertEqual(provider.credentials['api_key'], 'test-key-123')


class CommunicationTemplateModelTest(TestCase):
    """اختبارات نموذج القوالب"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_template(self):
        template = CommunicationTemplate.objects.create(
            tenant_id=self.tenant_id,
            name='ترحيب بالطالب الجديد',
            code='welcome_student',
            category='admission',
            language='ar',
            subject='مرحباً {{student_name}} في {{school_name}}',
            body='<h1>أهلاً وسهلاً {{student_name}}</h1><p>نرحب بك في {{school_name}}.</p>',
        )
        self.assertEqual(template.category, 'admission')
        self.assertIn('{{student_name}}', template.body)


class CommunicationMessageModelTest(TestCase):
    """اختبارات نموذج الرسائل"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.channel = CommunicationChannel.objects.create(
            tenant_id=self.tenant_id, name='Email', code='email_msg',
            channel_type='email',
        )

    def test_create_message(self):
        message = CommunicationMessage.objects.create(
            tenant_id=self.tenant_id, channel=self.channel,
            subject='اختبار', body='محتوى تجريبي',
            status='draft', priority='normal',
            source_module='admissions',
        )
        self.assertEqual(message.status, 'draft')
        self.assertEqual(message.source_module, 'admissions')

    def test_message_default_status(self):
        message = CommunicationMessage.objects.create(
            tenant_id=self.tenant_id, channel=self.channel,
            body='رسالة اختبار',
        )
        self.assertEqual(message.status, 'draft')


class NotificationModelTest(TestCase):
    """اختبارات نموذج الإشعارات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

    def test_create_notification(self):
        notif = Notification.objects.create(
            tenant_id=self.tenant_id, user_id=self.user_id,
            title='طلب قبول جديد',
            body='تم تقديم طلب قبول للطالب أحمد.',
            category='admission', priority='high',
        )
        self.assertFalse(notif.is_read)
        self.assertEqual(notif.priority, 'high')

    def test_notification_default_values(self):
        notif = Notification.objects.create(
            tenant_id=self.tenant_id, user_id=self.user_id,
            title='إشعار عام', body='محتوى',
        )
        self.assertFalse(notif.is_read)
        self.assertFalse(notif.is_archived)
        self.assertFalse(notif.is_pinned)

    def test_tenant_isolation(self):
        tenant_a = uuid.uuid4()
        tenant_b = uuid.uuid4()
        Notification.objects.create(
            tenant_id=tenant_a, user_id=self.user_id,
            title='إشعار A', body='محتوى',
        )
        Notification.objects.create(
            tenant_id=tenant_b, user_id=self.user_id,
            title='إشعار B', body='محتوى',
        )
        a_count = Notification.objects.filter(tenant_id=tenant_a).count()
        b_count = Notification.objects.filter(tenant_id=tenant_b).count()
        self.assertEqual(a_count, 1)
        self.assertEqual(b_count, 1)


class CommunicationQueueModelTest(TestCase):
    """اختبارات نموذج الطابور"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.channel = CommunicationChannel.objects.create(
            tenant_id=self.tenant_id, name='SMS', code='sms_q',
            channel_type='sms',
        )
        self.message = CommunicationMessage.objects.create(
            tenant_id=self.tenant_id, channel=self.channel,
            body='رسالة اختبار',
        )

    def test_create_queue_entry(self):
        entry = CommunicationQueue.objects.create(
            tenant_id=self.tenant_id, message=self.message,
            status='queued', priority=0,
        )
        self.assertEqual(entry.status, 'queued')
        self.assertEqual(entry.attempt_count, 0)


class CommunicationPreferenceModelTest(TestCase):
    """اختبارات نموذج التفضيلات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.entity_id = uuid.uuid4()

    def test_create_preference(self):
        pref = CommunicationPreference.objects.create(
            tenant_id=self.tenant_id,
            entity_type='student', entity_id=self.entity_id,
            preferred_language='ar',
            quiet_hours_enabled=True,
        )
        self.assertEqual(pref.preferred_language, 'ar')
        self.assertTrue(pref.quiet_hours_enabled)

    def test_default_preferences(self):
        pref = CommunicationPreference.objects.create(
            tenant_id=self.tenant_id,
            entity_type='teacher', entity_id=self.entity_id,
        )
        self.assertTrue(pref.email_enabled)
        self.assertTrue(pref.sms_enabled)
        self.assertTrue(pref.whatsapp_enabled)
        self.assertFalse(pref.global_opt_out)
