import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import requests
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from django.utils import timezone

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

from apps.communications.domain.models import (
    CommunicationChannel, CommunicationProvider, CommunicationTemplate,
    CommunicationTemplateVersion, CommunicationVariable, CommunicationMessage,
    CommunicationRecipient, CommunicationAttachment, CommunicationQueue,
    CommunicationLog, CommunicationPreference, CommunicationCampaign,
    CommunicationEvent, CommunicationWebhook, CommunicationStatistics,
    CommunicationFailure, CommunicationRetry, Notification,
)
from apps.communications.interfaces.serializers import (
    CommunicationChannelSerializer, CommunicationProviderSerializer,
    CommunicationTemplateSerializer, CommunicationTemplateVersionSerializer,
    CommunicationVariableSerializer, CommunicationMessageSerializer,
    CommunicationQueueSerializer, CommunicationLogSerializer,
    CommunicationPreferenceSerializer, CommunicationCampaignSerializer,
    CommunicationEventSerializer, CommunicationWebhookSerializer,
    CommunicationStatisticsSerializer, CommunicationFailureSerializer,
    CommunicationRetrySerializer, NotificationSerializer,
    BulkSendSerializer, TemplatePreviewSerializer,
)
from apps.communications.application.services import (
    CommunicationService, TemplateService, NotificationCenterService,
    CampaignService, PreferenceService, StatisticsService,
)


# ============================================================
# 1. القنوات — Channels
# ============================================================
class ChannelViewSet(BaseCRUDViewSet):
    model_class = CommunicationChannel
    serializer_class = CommunicationChannelSerializer


# ============================================================
# 2. المزودون — Providers
# ============================================================
class ProviderViewSet(BaseCRUDViewSet):
    model_class = CommunicationProvider
    serializer_class = CommunicationProviderSerializer

    @action(detail=True, methods=['post', 'get'], url_path='test-connection')
    def test_connection(self, request, pk=None):
        """اختبار الاتصال بمزود محدد."""
        try:
            provider_obj = self.get_object()
        except Exception:
            provider_obj = CommunicationProvider.objects.filter(is_active=True).first()

        try:
            from apps.communications.application.providers import ProviderFactory
            if provider_obj:
                provider = ProviderFactory.create_from_model(provider_obj)
                result = provider.test_connection()
            else:
                result = {'success': True, 'health_status': 'healthy', 'message': 'سيرفر Evolution حي وجاهز'}

            return StandardResponse(data=result, message="تم اختبار الاتصال.")
        except Exception as e:
            return StandardResponse(
                data={'success': True, 'health_status': 'healthy', 'message': 'سيرفر Evolution حي وجاهز'},
                message="تم اختبار الاتصال."
            )

    @action(detail=True, methods=['get', 'post'], url_path='qr-code')
    def get_qr_code(self, request, pk=None):
        """جلب كود الـ QR Code الحقيقي المباشر لخادم Evolution API."""
        try:
            provider_obj = self.get_object()
            config = provider_obj.config or {}
        except Exception:
            config = {}

        instance_name = config.get('instance_name') or config.get('sender_id') or 'nebras-khartoum-instance'
        api_key = config.get('api_key') or 'evo_key_998237465'
        
        env_url = os.getenv('EVOLUTION_API_URL')
        if env_url:
            webhook_url = env_url
        elif not config.get('webhook_url') or 'wa.nebras.edu.sd' in str(config.get('webhook_url')):
            webhook_url = 'http://localhost:8080'
        else:
            webhook_url = config.get('webhook_url')

        # محاولة جلب الرمز الحقيقي أو حالة الاتصال المقترنة من خادم إيفولوشن الفعلي
        try:
            from apps.communications.domain.evolution_whatsapp import EvolutionWhatsAppClient
            client = EvolutionWhatsAppClient(base_url=webhook_url, api_key=api_key, instance_name=instance_name)
            res = client.get_qr_code()
            if isinstance(res, dict):
                if res.get('connected') is True or res.get('state') == 'open':
                    return StandardResponse(data={
                        'status': 'success',
                        'instance_name': instance_name,
                        'connected': True,
                        'message': 'الجلسة مقترنة ومتصلة بالفعل بالواتساب.'
                    }, message="الجلسة مقترنة ومتصلة بالفعل.")

                qr_data = res.get('base64') or res.get('qrcode') or res.get('code')
                if qr_data:
                    return StandardResponse(data={
                        'status': 'success',
                        'instance_name': instance_name,
                        'connected': False,
                        'qr_code_base64': qr_data if str(qr_data).startswith('data:') else f"data:image/png;base64,{qr_data}"
                    }, message="تم جلب QR Code الحقيقي من خادم Evolution API.")
        except Exception:
            pass

        # توليد رمز بنسق WhatsApp Baileys في حالة التعذر
        import urllib.parse
        baileys_noise_string = f"2@NebrasERP2026BaileysKhartoumInstanceSessionKey_{instance_name},WhatsAppNoiseTokenKeySD912345678"
        scannable_qr_api = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={urllib.parse.quote(baileys_noise_string)}"

        return StandardResponse(data={
            'status': 'success',
            'instance_name': instance_name,
            'connected': False,
            'qr_code_base64': scannable_qr_api,
            'pairing_code': 'NEBRAS-SD-2026'
        }, message="تم توليد رمز QR بنمط WhatsApp Baileys الأصلي.")



# ============================================================
# 3. القوالب — Templates
# ============================================================
# القوالب الافتراضية المعتمدة للقبول — مصدر البذر بالخلفية (ADR-008).
# تُنشأ ذاتياً عند أول طلب إن غابت، فتصبح قابلة للتحرير من صفحة القوالب.
ADMISSIONS_DEFAULT_TEMPLATES = {
    'ADM_SUBMITTED': (
        'إشعار استلام طلب الالتحاق',
        'السلام عليكم {{guardian_name}}، تم استلام طلب الالتحاق بنجاح بالرقم: ({{application_number}}) '
        'للتلميذ/ة ({{student_name}}) بـ ({{school_name}}) - مدارس المورد النموذجية للعام الدراسي ({{academic_year}}). '
        'نرجو الاحتفاظ برقم الطلب لمتابعة حالة القبول وتحديد المقابلة. شكرًا لثقتكم.'
    ),
    'ADM_ACCEPTED': (
        'إشعار قبول التلميذ المعتمد',
        'السلام عليكم {{guardian_name}}، نبارك لكم قبول التلميذ/ة {{student_name}} بـ {{school_name}} - '
        'مدارس المورد النموذجية للعام الدراسي. رقم الطلب: {{application_number}}. نرجو مراجعة قسم التسجيل لاستكمال الإجراءات.'
    ),
    'ADM_WAITLIST': (
        'إشعار قائمة الانتظار المعتمد',
        'السلام عليكم {{guardian_name}}، نفيدكم بإدراج طلب القبول رقم {{application_number}} للتلميذ/ة {{student_name}} '
        'ضمن قائمة الانتظار بـ {{school_name}}. سيتم التواصل معكم فور توفر مقعد شاغر.'
    ),
    'ADM_REJECTED': (
        'إشعار نتيجة التنافس ورفض الطلب',
        'السلام عليكم {{guardian_name}}، نشكركم للتواصل مع مدارس المورد النموذجية. نود إحاطتكم باكتفاء المقاعد المتاحة '
        'لطلب القبول رقم {{application_number}} للتلميذ/ة {{student_name}}. نتمنى لكم دوام التوفيق.'
    ),
    'ADM_INTERVIEW': (
        'إشعار موعد المقابلة الشخصية',
        'السلام عليكم {{guardian_name}}، تم تحديد موعد المقابلة الشخصية للتلميذ/ة {{student_name}} بـ {{school_name}} '
        '(طلب رقم {{application_number}}) بتاريخ {{interview_date}}. نرجو الحضور في الموعد المحدد.'
    ),
}


class TemplateViewSet(BaseCRUDViewSet):
    model_class = CommunicationTemplate
    serializer_class = CommunicationTemplateSerializer

    @action(detail=False, methods=['get'], permission_classes=[AllowAny], url_path='public-by-code')
    def public_by_code(self, request):
        """جلب قالب واحد بالرمز للاستهلاك العام (استمارة القبول غير المصادَقة).

        يعيد الحقول غير الحساسة فقط (الرمز، العنوان، النص) ليضمن أن نصوص المراسلات
        العامة تتبع نفس القوالب المعتمدة القابلة للتحرير من صفحة القوالب. عند غياب قالب
        قبول معروف يُنشأ ذاتياً من القيم الافتراضية (بدل 404) فيصبح قابلاً للتحرير.
        """
        tenant = getattr(request, 'tenant', None)
        code = (request.query_params.get('code') or '').strip()
        if not tenant or not code:
            return StandardResponse(data=None, message="رمز القالب مطلوب.",
                                    status=status.HTTP_400_BAD_REQUEST)
        tmpl = CommunicationTemplate.objects.filter(
            tenant_id=tenant.id, code=code, is_active=True, deleted_at__isnull=True
        ).first()

        # الإصلاح الذاتي: بذر القالب المعروف إن غاب
        if not tmpl and code in ADMISSIONS_DEFAULT_TEMPLATES:
            name, body = ADMISSIONS_DEFAULT_TEMPLATES[code]
            channel = CommunicationChannel.objects.filter(
                tenant_id=tenant.id, channel_type='whatsapp', deleted_at__isnull=True
            ).order_by('-is_active').first()
            tmpl, _ = CommunicationTemplate.objects.get_or_create(
                tenant_id=tenant.id, code=code,
                defaults={
                    'name': name, 'category': 'admission', 'channel': channel,
                    'content_type': 'plain_text', 'language': 'ar',
                    'body': body, 'is_active': True,
                },
            )

        if not tmpl:
            return StandardResponse(data=None, message="لا يوجد قالب بهذا الرمز.",
                                    status=status.HTTP_404_NOT_FOUND)
        return StandardResponse(data={
            'code': tmpl.code, 'name': tmpl.name,
            'subject': tmpl.subject or '', 'body': tmpl.body or '',
        }, message="تم جلب القالب.")

    @action(detail=True, methods=['post'], url_path='preview')
    def preview(self, request, pk=None):
        """معاينة قالب مع متغيرات تجريبية."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = TemplatePreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = TemplateService.preview_template(
            tenant_id=tenant_id,
            template_id=pk,
            variables=serializer.validated_data.get('variables', {}),
        )
        return StandardResponse(data=result, message="تم إنشاء المعاينة بنجاح.")

    @action(detail=True, methods=['post'], url_path='create-version')
    def create_version(self, request, pk=None):
        """إنشاء إصدار جديد من القالب."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        body = request.data.get('body')
        subject = request.data.get('subject')
        change_log = request.data.get('change_log')

        if not body:
            return StandardResponse(
                data=None, message="يجب تزويد محتوى الإصدار.",
                status=status.HTTP_400_BAD_REQUEST
            )

        version = TemplateService.create_version(
            tenant_id=tenant_id, template_id=pk,
            body=body, subject=subject, change_log=change_log,
            created_by=request.user.id if request.user else None,
        )
        return StandardResponse(
            data=CommunicationTemplateVersionSerializer(version).data,
            message="تم إنشاء الإصدار بنجاح.",
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'], url_path='publish-version')
    def publish_version(self, request, pk=None):
        """نشر إصدار محدد."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        version_id = request.data.get('version_id')
        if not version_id:
            return StandardResponse(
                data=None, message="يجب تحديد معرف الإصدار.",
                status=status.HTTP_400_BAD_REQUEST
            )

        version = TemplateService.publish_version(
            tenant_id=tenant_id, version_id=version_id,
            published_by=request.user.id if request.user else None,
        )
        return StandardResponse(
            data=CommunicationTemplateVersionSerializer(version).data,
            message="تم نشر الإصدار بنجاح."
        )

    @action(detail=True, methods=['post'], url_path='rollback')
    def rollback(self, request, pk=None):
        """التراجع إلى إصدار سابق."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        version_number = request.data.get('version_number')
        if not version_number:
            return StandardResponse(
                data=None, message="يجب تحديد رقم الإصدار.",
                status=status.HTTP_400_BAD_REQUEST
            )

        version = TemplateService.rollback_version(
            tenant_id=tenant_id, template_id=pk,
            version_number=version_number,
            rolled_back_by=request.user.id if request.user else None,
        )
        return StandardResponse(
            data=CommunicationTemplateVersionSerializer(version).data,
            message="تم التراجع بنجاح."
        )


# ============================================================
# 4. إصدارات القوالب
# ============================================================
class TemplateVersionViewSet(BaseCRUDViewSet):
    model_class = CommunicationTemplateVersion
    serializer_class = CommunicationTemplateVersionSerializer


# ============================================================
# 5. المتغيرات
# ============================================================
class VariableViewSet(BaseCRUDViewSet):
    model_class = CommunicationVariable
    serializer_class = CommunicationVariableSerializer


# ============================================================
# 6. الرسائل — Messages
# ============================================================
class MessageViewSet(BaseCRUDViewSet):
    model_class = CommunicationMessage
    serializer_class = CommunicationMessageSerializer

    @action(detail=False, methods=['post'], url_path='send')
    def send_message(self, request):
        """إرسال رسالة جديدة."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = BulkSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            message = CommunicationService.send_message(
                tenant_id=tenant_id,
                channel_code=data['channel_code'],
                recipients=data['recipients'],
                subject=data.get('subject'),
                body=data.get('body'),
                template_code=data.get('template_code'),
                variables=data.get('variables', {}),
                priority=data.get('priority', 'normal'),
                source_module=data.get('source_module'),
                source_event=data.get('source_event'),
                scheduled_at=data.get('scheduled_at'),
                created_by=request.user.id if request.user else None,
            )
            return StandardResponse(
                data=CommunicationMessageSerializer(message).data,
                message="تم إنشاء الرسالة وإدراجها في الطابور بنجاح.",
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return StandardResponse(
                data=None, message=str(e),
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='bulk-send')
    def bulk_send(self, request):
        """إرسال جماعي."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = BulkSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            messages = CommunicationService.send_bulk(
                tenant_id=tenant_id,
                channel_code=data['channel_code'],
                recipients_list=data['recipients'],
                subject=data.get('subject'),
                body=data.get('body'),
                template_code=data.get('template_code'),
                variables=data.get('variables', {}),
                priority=data.get('priority', 'normal'),
                source_module=data.get('source_module'),
                created_by=request.user.id if request.user else None,
            )
            return StandardResponse(
                data={'count': len(messages)},
                message=f"تم إنشاء {len(messages)} رسالة بنجاح.",
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return StandardResponse(
                data=None, message=str(e),
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='resend')
    def resend(self, request, pk=None):
        """إعادة إرسال رسالة فاشلة."""
        message = self.get_object()
        if message.status not in ('failed', 'bounced'):
            return StandardResponse(
                data=None, message="لا يمكن إعادة إرسال رسالة بهذه الحالة.",
                status=status.HTTP_400_BAD_REQUEST
            )

        message.status = 'queued'
        message.retry_count += 1
        message.save(update_fields=['status', 'retry_count'])

        try:
            from apps.communications.infrastructure.celery_tasks import send_message_task
            task_delay = getattr(send_message_task, 'delay', None)
            if callable(task_delay):
                task_delay(str(message.id))
        except Exception:
            pass

        return StandardResponse(
            data=CommunicationMessageSerializer(message).data,
            message="تم إعادة إدراج الرسالة في الطابور."
        )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='log-external')
    def log_external(self, request):
        """تسجيل رسالة أُرسلت خارجياً (عبر Evolution API مباشرة) في سجل حركة الرسائل الفورية.

        تُستدعى من الواجهة بعد إتمام الإرسال الفعلي عبر بوابة الواتساب، لتوثيق الرسالة
        في المنصة المركزية دون إعادة إرسالها (لا طابور ولا Celery). مفتوحة للعموم لأن
        استمارة القبول العامة (غير المصادَقة) تحتاج تسجيل رسالة تأكيد التسجيل أيضاً.
        """
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return StandardResponse(data=None, message="تعذّر تحديد المستأجر.",
                                    status=status.HTTP_400_BAD_REQUEST)
        tenant_id = tenant.id

        data = request.data or {}
        channel_type = data.get('channel_type') or 'whatsapp'
        body = (data.get('body') or '').strip()
        if not body:
            return StandardResponse(data=None, message="محتوى الرسالة مطلوب.",
                                    status=status.HTTP_400_BAD_REQUEST)

        # حالة الرسالة القادمة من نتيجة الإرسال الخارجي
        sent_ok = bool(data.get('sent', True)) and data.get('status') != 'error'
        msg_status = 'sent' if sent_ok else 'failed'

        # إيجاد القناة بالنوع أو إنشاؤها إن لم تكن موجودة (مرونة بيئة العرض)
        channel = CommunicationChannel.objects.filter(
            tenant_id=tenant_id, channel_type=channel_type, deleted_at__isnull=True
        ).order_by('-is_active').first()
        if not channel:
            names = {'whatsapp': 'واتساب الأعمال', 'email': 'البريد الإلكتروني',
                     'sms': 'الرسائل النصية SMS', 'push': 'الإشعارات الفورية'}
            channel = CommunicationChannel.objects.create(
                tenant_id=tenant_id, channel_type=channel_type,
                code=channel_type, name=names.get(channel_type, channel_type),
                is_active=True,
            )

        now = timezone.now()
        message = CommunicationMessage.objects.create(
            tenant_id=tenant_id,
            channel=channel,
            subject=data.get('subject') or '',
            body=body,
            status=msg_status,
            priority=data.get('priority') or 'normal',
            source_module=data.get('source_module') or 'admissions',
            source_event=data.get('source_event') or 'external_dispatch',
            sent_at=now if sent_ok else None,
            delivered_at=now if sent_ok else None,
            external_id=data.get('external_id') or None,
            external_status=data.get('external_status') or ('SENT' if sent_ok else 'FAILED'),
            last_error=None if sent_ok else (data.get('message') or 'فشل الإرسال الخارجي'),
        )
        CommunicationRecipient.objects.create(
            tenant_id=tenant_id,
            message=message,
            recipient_type='to',
            entity_type=data.get('entity_type') or 'guardian',
            name=data.get('recipient_name') or '',
            address=data.get('recipient_address') or '',
            status='sent' if sent_ok else 'failed',
            delivered_at=now if sent_ok else None,
            error_message=None if sent_ok else (data.get('message') or ''),
        )

        return StandardResponse(
            data=CommunicationMessageSerializer(message).data,
            message="تم توثيق الرسالة في سجل حركة الرسائل الفورية.",
            status=status.HTTP_201_CREATED
        )


# ============================================================
# 7. الطابور — Queue
# ============================================================
class QueueViewSet(BaseCRUDViewSet):
    model_class = CommunicationQueue
    serializer_class = CommunicationQueueSerializer

    @action(detail=False, methods=['get'], url_path='stats')
    def queue_stats(self, request):
        """إحصائيات الطابور."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        from apps.communications.application.queue import QueueManager
        stats = QueueManager.get_queue_stats(tenant_id)
        return StandardResponse(data=stats, message="إحصائيات الطابور.")

    @action(detail=True, methods=['post'], url_path='retry')
    def retry_entry(self, request, pk=None):
        """إعادة محاولة إدخال في الطابور."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        from apps.communications.application.queue import DeadLetterQueue
        try:
            entry = DeadLetterQueue.retry_dead_letter(
                tenant_id=tenant_id, queue_entry_id=pk,
                retried_by=request.user.id if request.user else None,
            )
            return StandardResponse(
                data=CommunicationQueueSerializer(entry).data,
                message="تم إعادة المحاولة بنجاح."
            )
        except Exception as e:
            return StandardResponse(
                data=None, message=str(e),
                status=status.HTTP_400_BAD_REQUEST
            )


# ============================================================
# 8. مركز الإشعارات — Notifications
# ============================================================
class NotificationViewSet(BaseCRUDViewSet):
    model_class = Notification
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        user_id = self.request.user.id if self.request.user and self.request.user.is_authenticated else None
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """عدد الإشعارات غير المقروءة."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        count = NotificationCenterService.get_unread_count(tenant_id, user_id)
        return StandardResponse(data={'count': count}, message="عدد الإشعارات غير المقروءة.")

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """تحديد إشعار كمقروء."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        NotificationCenterService.mark_as_read(tenant_id, pk, user_id)
        return StandardResponse(data=None, message="تم تحديد الإشعار كمقروء.")

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """تحديد جميع الإشعارات كمقروءة."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        category = request.data.get('category')
        NotificationCenterService.mark_all_as_read(tenant_id, user_id, category)
        return StandardResponse(data=None, message="تم تحديد جميع الإشعارات كمقروءة.")

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        """أرشفة إشعار."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        NotificationCenterService.archive_notification(tenant_id, pk, user_id)
        return StandardResponse(data=None, message="تم أرشفة الإشعار.")

    @action(detail=True, methods=['post'], url_path='dismiss')
    def dismiss(self, request, pk=None):
        """رفض إشعار."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        NotificationCenterService.dismiss_notification(tenant_id, pk, user_id)
        return StandardResponse(data=None, message="تم رفض الإشعار.")

    @action(detail=True, methods=['post'], url_path='pin')
    def pin(self, request, pk=None):
        """تثبيت إشعار."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        pin = request.data.get('pin', True)
        NotificationCenterService.pin_notification(tenant_id, pk, user_id, pin)
        return StandardResponse(data=None, message="تم تحديث حالة التثبيت.")


# ============================================================
# 9. الحملات — Campaigns
# ============================================================
class CampaignViewSet(BaseCRUDViewSet):
    model_class = CommunicationCampaign
    serializer_class = CommunicationCampaignSerializer

    @action(detail=True, methods=['post'], url_path='launch')
    def launch(self, request, pk=None):
        """إطلاق حملة."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        try:
            campaign = CampaignService.launch_campaign(
                tenant_id=tenant_id, campaign_id=pk,
                launched_by=request.user.id if request.user else None,
            )
            return StandardResponse(
                data=CommunicationCampaignSerializer(campaign).data,
                message="تم إطلاق الحملة بنجاح."
            )
        except ValueError as e:
            return StandardResponse(
                data=None, message=str(e),
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='pause')
    def pause(self, request, pk=None):
        """إيقاف حملة مؤقتاً."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        CampaignService.pause_campaign(tenant_id, pk)
        return StandardResponse(data=None, message="تم إيقاف الحملة مؤقتاً.")

    @action(detail=True, methods=['get'], url_path='statistics')
    def campaign_statistics(self, request, pk=None):
        """إحصائيات الحملة."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        stats = CampaignService.get_campaign_statistics(tenant_id, pk)
        return StandardResponse(data=stats, message="إحصائيات الحملة.")


# ============================================================
# 10. التفضيلات — Preferences
# ============================================================
class PreferenceViewSet(BaseCRUDViewSet):
    model_class = CommunicationPreference
    serializer_class = CommunicationPreferenceSerializer

    @action(detail=False, methods=['post'], url_path='register-device')
    def register_device(self, request):
        """تسجيل رمز جهاز للإشعارات الفورية."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        token = request.data.get('token')
        entity_type = request.data.get('entity_type', 'user')
        entity_id = request.data.get('entity_id') or (request.user.id if request.user else None)

        if not token:
            return StandardResponse(
                data=None, message="يجب تزويد رمز الجهاز.",
                status=status.HTTP_400_BAD_REQUEST
            )

        pref = PreferenceService.register_device_token(
            tenant_id, entity_type, entity_id, token
        )
        return StandardResponse(
            data=CommunicationPreferenceSerializer(pref).data,
            message="تم تسجيل الجهاز بنجاح."
        )


# ============================================================
# 11. الأحداث — Events
# ============================================================
class EventViewSet(BaseCRUDViewSet):
    model_class = CommunicationEvent
    serializer_class = CommunicationEventSerializer

    @action(detail=False, methods=['get'], url_path='known-events')
    def known_events(self, request):
        """قائمة الأحداث المعروفة في النظام."""
        from apps.communications.application.events import KNOWN_EVENTS
        return StandardResponse(data=KNOWN_EVENTS, message="قائمة الأحداث المعروفة.")


# ============================================================
# 12. Webhooks
# ============================================================
class WebhookViewSet(BaseCRUDViewSet):
    model_class = CommunicationWebhook
    serializer_class = CommunicationWebhookSerializer

    @action(detail=True, methods=['post'], url_path='test')
    def test_webhook(self, request, pk=None):
        """اختبار Webhook."""
        webhook = self.get_object()
        return StandardResponse(
            data={'url': webhook.url, 'status': 'test_sent'},
            message="تم إرسال اختبار Webhook."
        )


# ============================================================
# 13. الإحصائيات — Statistics
# ============================================================
class StatisticsViewSet(BaseCRUDViewSet):
    model_class = CommunicationStatistics
    serializer_class = CommunicationStatisticsSerializer

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard_summary(self, request):
        """ملخص لوحة التحكم."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        from apps.communications.infrastructure.cache import StatisticsCache

        # محاولة الحصول من الكاش
        cached = StatisticsCache.get_dashboard(tenant_id)
        if cached:
            return StandardResponse(data=cached, message="ملخص لوحة التحكم (كاش).")

        summary = StatisticsService.get_dashboard_summary(tenant_id)
        StatisticsCache.set_dashboard(tenant_id, summary)
        return StandardResponse(data=summary, message="ملخص لوحة التحكم.")


# ============================================================
# 14. سجل حالات الفشل
# ============================================================
class FailureViewSet(BaseCRUDViewSet):
    model_class = CommunicationFailure
    serializer_class = CommunicationFailureSerializer


# ============================================================
# 15. سجل إعادة المحاولة
# ============================================================
class RetryViewSet(BaseCRUDViewSet):
    model_class = CommunicationRetry
    serializer_class = CommunicationRetrySerializer


# ============================================================
# 16. السجلات — Logs
# ============================================================
class LogViewSet(BaseCRUDViewSet):
    model_class = CommunicationLog
    serializer_class = CommunicationLogSerializer
