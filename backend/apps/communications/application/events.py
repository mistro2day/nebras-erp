import logging
from django.utils import timezone

from apps.communications.domain.models import CommunicationEvent, CommunicationLog

logger = logging.getLogger('nebras.communications.events')


# ============================================================
# ناقل الأحداث — Event Bus Consumer
# ============================================================
class EventBusConsumer:
    """
    مستهلك أحداث النطاق (Domain Events).
    يستقبل الأحداث من جميع الموديولات ويحولها إلى وظائف اتصال.
    
    الاستخدام من أي موديول:
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='StudentCreated',
            source_module='students',
            event_data={'student_name': 'أحمد', 'school_name': 'مدرسة نبراس'},
            created_by=user_id,
        )
    """

    # سجل الأحداث المسجلة والمعالجات المرتبطة
    _handlers = {}

    @classmethod
    def publish(cls, tenant_id, event_type, source_module, event_data=None, created_by=None):
        """
        نشر حدث من أي موديول.
        يتم البحث عن تكوين الحدث المطابق وتنفيذ الإجراء المناسب.
        """
        logger.info(f"[EventBus] استقبال حدث: {event_type} من {source_module}")

        # 1. البحث عن تكوين الحدث في قاعدة البيانات
        event_configs = CommunicationEvent.objects.filter(
            tenant_id=tenant_id,
            event_type=event_type,
            source_module=source_module,
            is_active=True,
        )

        if not event_configs.exists():
            logger.debug(f"[EventBus] لا يوجد تكوين للحدث: {event_type}")
            return []

        # 2. معالجة كل تكوين
        results = []
        for event_config in event_configs:
            try:
                result = CommunicationEventHandler.handle(
                    tenant_id=tenant_id,
                    event_config=event_config,
                    event_data=event_data or {},
                    created_by=created_by,
                )
                results.append(result)
            except Exception as e:
                logger.error(f"[EventBus] خطأ في معالجة الحدث {event_type}: {e}")
                CommunicationLog.objects.create(
                    tenant_id=tenant_id,
                    level='error',
                    action='event_processing_failed',
                    description=f"فشل معالجة الحدث {event_type}: {str(e)}",
                    details={'event_type': event_type, 'source_module': source_module,
                             'error': str(e)},
                    created_by=created_by,
                )

        return results

    @classmethod
    def register_handler(cls, event_type, handler_func):
        """تسجيل معالج مخصص لنوع حدث محدد."""
        cls._handlers[event_type] = handler_func

    @classmethod
    def get_registered_events(cls):
        """الحصول على قائمة الأحداث المسجلة."""
        return list(cls._handlers.keys())


# ============================================================
# معالج أحداث الاتصال
# ============================================================
class CommunicationEventHandler:
    """
    معالج الأحداث. يحول الحدث إلى وظيفة اتصال بناءً على تكوين الحدث.
    """

    @classmethod
    def handle(cls, tenant_id, event_config, event_data, created_by=None):
        """
        معالجة حدث واحد وإنشاء رسالة/إشعار.
        """
        from apps.communications.application.services import (
            CommunicationService, NotificationCenterService
        )

        # 1. تجهيز المتغيرات من بيانات الحدث
        variables = cls._map_variables(event_config.variable_mapping, event_data)

        # 2. تحديد المستلمين
        recipients = cls._resolve_recipients(
            tenant_id, event_config.recipient_config, event_data
        )

        if not recipients:
            logger.warning(f"[EventHandler] لا يوجد مستلمون للحدث: {event_config.event_type}")
            return None

        # 3. إرسال الرسالة عبر القناة المحددة (إذا كان هناك قالب وقناة)
        message = None
        if event_config.template and event_config.channel and event_config.auto_send:
            message = CommunicationService.send_message(
                tenant_id=tenant_id,
                channel_code=event_config.channel.code,
                recipients=recipients,
                template_code=event_config.template.code if event_config.template else None,
                variables=variables,
                priority=event_config.priority,
                source_module=event_config.source_module,
                source_event=event_config.event_type,
                created_by=created_by,
            )

        # 4. إنشاء إشعار داخلي لكل مستلم
        for recipient in recipients:
            if recipient.get('entity_id'):
                user_id = recipient.get('user_id') or recipient.get('entity_id')
                NotificationCenterService.create_notification(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    title=event_config.name,
                    body=CommunicationService._render_template(
                        event_config.template.body if event_config.template else event_config.description or '',
                        variables
                    ),
                    category=event_config.template.category if event_config.template else 'general',
                    priority=event_config.priority,
                    source_module=event_config.source_module,
                    source_event=event_config.event_type,
                    message_id=message.id if message else None,
                    created_by=created_by,
                )

        # 5. تسجيل العملية
        CommunicationLog.objects.create(
            tenant_id=tenant_id,
            message=message,
            level='info',
            action='event_processed',
            description=f"تم معالجة الحدث {event_config.event_type} — المستلمين: {len(recipients)}",
            details={
                'event_type': event_config.event_type,
                'source_module': event_config.source_module,
                'recipients_count': len(recipients),
                'variables': variables,
            },
            created_by=created_by,
        )

        return message

    @classmethod
    def _map_variables(cls, variable_mapping, event_data):
        """
        تعيين المتغيرات من بيانات الحدث إلى متغيرات القالب.
        variable_mapping: {"student_name": "data.name", "school_name": "data.school"}
        """
        if not variable_mapping or not event_data:
            return event_data or {}

        variables = {}
        for template_var, data_path in variable_mapping.items():
            value = cls._get_nested_value(event_data, data_path)
            if value is not None:
                variables[template_var] = value
            elif template_var in event_data:
                variables[template_var] = event_data[template_var]

        # إضافة أي متغيرات غير معينة من event_data مباشرة
        for key, value in event_data.items():
            if key not in variables:
                variables[key] = value

        return variables

    @classmethod
    def _get_nested_value(cls, data, path):
        """الحصول على قيمة من مسار متداخل (مثل 'data.student.name')."""
        if not path or not data:
            return None
        keys = path.split('.')
        current = data
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current

    @classmethod
    def _resolve_recipients(cls, tenant_id, recipient_config, event_data):
        """
        تحديد المستلمين من تكوين الحدث وبيانات الحدث.
        recipient_config: {
            "type": "from_event_data",
            "field": "recipients",
            "default_entity_type": "student"
        }
        """
        if not recipient_config:
            # محاولة استخراج المستلمين من بيانات الحدث مباشرة
            if 'recipients' in event_data:
                return event_data['recipients']
            if 'recipient_email' in event_data:
                return [{'address': event_data['recipient_email'], 'type': 'to',
                         'entity_type': 'user', 'name': event_data.get('recipient_name', '')}]
            return []

        config_type = recipient_config.get('type', 'from_event_data')

        if config_type == 'from_event_data':
            field = recipient_config.get('field', 'recipients')
            return event_data.get(field, [])

        if config_type == 'static':
            return recipient_config.get('recipients', [])

        return []


# ============================================================
# قائمة الأحداث المعروفة (للتوثيق والتسجيل)
# ============================================================
KNOWN_EVENTS = {
    # الطلاب
    'StudentCreated': {'module': 'students', 'description': 'تم إنشاء طالب جديد'},
    'StudentEnrolled': {'module': 'students', 'description': 'تم تسجيل طالب في صف'},
    'StudentGraduated': {'module': 'students', 'description': 'تم تخريج طالب'},

    # المعلمون
    'TeacherCreated': {'module': 'faculty', 'description': 'تم إضافة معلم جديد'},
    'TeacherAssigned': {'module': 'faculty', 'description': 'تم تعيين معلم لمادة'},

    # الموظفون
    'EmployeeCreated': {'module': 'employees', 'description': 'تم إضافة موظف جديد'},
    'EmployeeTerminated': {'module': 'employees', 'description': 'تم إنهاء خدمة موظف'},

    # القبول
    'AdmissionApproved': {'module': 'admissions', 'description': 'تم الموافقة على طلب قبول'},
    'AdmissionRejected': {'module': 'admissions', 'description': 'تم رفض طلب قبول'},

    # الحضور
    'AttendanceRecorded': {'module': 'attendance', 'description': 'تم تسجيل حضور/غياب'},
    'AttendanceAlert': {'module': 'attendance', 'description': 'تنبيه غياب متكرر'},

    # الرواتب
    'PayrollApproved': {'module': 'payroll', 'description': 'تم اعتماد مسير الرواتب'},
    'PayrollGenerated': {'module': 'payroll', 'description': 'تم إنشاء مسير الرواتب'},
    'PayslipGenerated': {'module': 'payroll', 'description': 'تم إنشاء كشف راتب'},

    # المالية
    'InvoiceGenerated': {'module': 'finance', 'description': 'تم إنشاء فاتورة'},
    'PaymentReceived': {'module': 'finance', 'description': 'تم استلام دفعة'},
    'FeeReminder': {'module': 'finance', 'description': 'تذكير بالرسوم المستحقة'},

    # الاختبارات
    'ExamResultPublished': {'module': 'academics', 'description': 'تم نشر نتائج الاختبار'},
    'ExamScheduled': {'module': 'academics', 'description': 'تم جدولة اختبار'},

    # مسارات العمل
    'WorkflowCompleted': {'module': 'workflow', 'description': 'تم إكمال مسار عمل'},
    'ApprovalRequired': {'module': 'workflow', 'description': 'مطلوب موافقة'},
    'ApprovalCompleted': {'module': 'workflow', 'description': 'تم إكمال الموافقة'},

    # النظام
    'SystemAlert': {'module': 'system', 'description': 'تنبيه نظام'},
    'CertificateIssued': {'module': 'academics', 'description': 'تم إصدار شهادة'},

    # الإجازات
    'LeaveApproved': {'module': 'hr', 'description': 'تم الموافقة على إجازة'},
    'LeaveRejected': {'module': 'hr', 'description': 'تم رفض طلب إجازة'},
}
