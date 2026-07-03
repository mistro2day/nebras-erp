from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel


# ============================================================
# 1. Communication Channel — تعريف القنوات المدعومة
# ============================================================
class CommunicationChannel(CombinedSharedModel):
    """
    تعريف قنوات الاتصال المتاحة في النظام.
    كل قناة تمثل وسيلة اتصال مثل البريد الإلكتروني أو الواتساب أو الرسائل النصية.
    """
    CHANNEL_TYPES = (
        ('email', 'بريد إلكتروني'),
        ('whatsapp', 'واتساب'),
        ('sms', 'رسائل نصية قصيرة'),
        ('push', 'إشعارات فورية (Push)'),
        ('in_app', 'إشعارات داخل التطبيق'),
        ('browser', 'إشعارات المتصفح'),
        ('webhook', 'ويب هوك'),
        ('voice', 'مكالمات صوتية'),
        ('telegram', 'تيليجرام'),
        ('teams', 'مايكروسوفت تيمز'),
        ('slack', 'سلاك'),
    )

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    channel_type = models.CharField(max_length=30, choices=CHANNEL_TYPES, db_index=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="اسم الأيقونة (Material Icon)")
    color = models.CharField(max_length=20, blank=True, null=True, help_text="لون القناة في الواجهة")
    is_active = models.BooleanField(default=True, db_index=True)
    is_future = models.BooleanField(default=False, help_text="قناة مستقبلية غير مفعلة بعد")
    priority = models.IntegerField(default=0, help_text="ترتيب الأولوية في الاختيار التلقائي")
    config = models.JSONField(default=dict, blank=True, help_text="إعدادات القناة العامة")

    class Meta:
        db_table = 'nebras_comm_channels'
        ordering = ['priority', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_channel_type_display()})"


# ============================================================
# 2. Communication Provider — مزودي خدمة الاتصال
# ============================================================
class CommunicationProvider(CombinedSharedModel):
    """
    مزود خدمة الاتصال (مثال: SMTP لـ Email، Twilio لـ SMS).
    يمكن لكل قناة أن تحتوي على عدة مزودين مع تحديد المزود الافتراضي.
    """
    PROVIDER_TYPES = (
        # Email
        ('smtp', 'SMTP'),
        ('microsoft365', 'Microsoft 365'),
        ('google_workspace', 'Google Workspace'),
        ('mailgun', 'Mailgun'),
        ('amazon_ses', 'Amazon SES'),
        ('sendgrid', 'SendGrid'),
        # WhatsApp
        ('meta_cloud_api', 'Meta Cloud API'),
        ('twilio_whatsapp', 'Twilio WhatsApp'),
        ('360dialog', '360Dialog'),
        # SMS
        ('twilio_sms', 'Twilio SMS'),
        ('infobip', 'Infobip'),
        # Push
        ('firebase_fcm', 'Firebase Cloud Messaging'),
        # Webhook
        ('generic_rest', 'Generic REST Webhook'),
        # Custom
        ('custom', 'مزود مخصص'),
    )

    channel = models.ForeignKey(
        CommunicationChannel, on_delete=models.CASCADE,
        related_name='providers', help_text="القناة التي ينتمي إليها المزود"
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    provider_type = models.CharField(max_length=30, choices=PROVIDER_TYPES, db_index=True)
    description = models.TextField(blank=True, null=True)

    # إعدادات الاتصال — مشفرة
    credentials = models.JSONField(default=dict, blank=True, help_text="بيانات الاعتماد المشفرة (API Key, Secret, etc.)")
    config = models.JSONField(default=dict, blank=True, help_text="إعدادات المزود (Host, Port, etc.)")
    endpoint_url = models.URLField(blank=True, null=True, help_text="رابط API المزود")

    is_active = models.BooleanField(default=True, db_index=True)
    is_default = models.BooleanField(default=False, help_text="المزود الافتراضي لهذه القناة")
    priority = models.IntegerField(default=0, help_text="ترتيب الأولوية عند الفشل (Failover)")

    # Rate limiting
    rate_limit_per_minute = models.IntegerField(default=60, help_text="الحد الأقصى للرسائل في الدقيقة")
    rate_limit_per_hour = models.IntegerField(default=1000, help_text="الحد الأقصى للرسائل في الساعة")
    daily_quota = models.IntegerField(default=10000, help_text="الحصة اليومية")

    # Health
    last_health_check = models.DateTimeField(null=True, blank=True)
    health_status = models.CharField(max_length=20, default='unknown',
                                     choices=(('healthy', 'سليم'), ('degraded', 'متدهور'), ('down', 'متوقف'), ('unknown', 'غير معروف')))

    class Meta:
        db_table = 'nebras_comm_providers'
        unique_together = ('tenant_id', 'code')
        ordering = ['priority', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_provider_type_display()})"


# ============================================================
# 3. Communication Template — قوالب الرسائل
# ============================================================
class CommunicationTemplate(CombinedSharedModel):
    """
    قالب رسالة قابل لإعادة الاستخدام.
    يدعم عدة لغات وعدة قنوات مع نظام إصدارات.
    """
    CONTENT_TYPES = (
        ('html', 'HTML'),
        ('plain_text', 'نص عادي'),
        ('markdown', 'Markdown'),
    )

    CATEGORY_CHOICES = (
        ('academic', 'أكاديمي'),
        ('admission', 'قبول وتسجيل'),
        ('attendance', 'حضور وغياب'),
        ('finance', 'مالي'),
        ('hr', 'موارد بشرية'),
        ('payroll', 'رواتب'),
        ('exam', 'اختبارات ونتائج'),
        ('workflow', 'مسارات العمل'),
        ('transport', 'نقل ومواصلات'),
        ('clinic', 'عيادة وصحة'),
        ('library', 'مكتبة'),
        ('general', 'عام'),
        ('system', 'نظام'),
        ('marketing', 'تسويق'),
        ('reminder', 'تذكير'),
        ('alert', 'تنبيه'),
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='general', db_index=True)

    channel = models.ForeignKey(
        CommunicationChannel, on_delete=models.CASCADE,
        related_name='templates', null=True, blank=True
    )
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default='html')
    language = models.CharField(max_length=10, default='ar', db_index=True,
                                help_text="رمز اللغة (ar, en)")

    subject = models.CharField(max_length=500, blank=True, null=True, help_text="عنوان الرسالة (للبريد الإلكتروني)")
    body = models.TextField(help_text="محتوى القالب مع المتغيرات الديناميكية {{variable}}")

    is_active = models.BooleanField(default=True, db_index=True)
    is_system = models.BooleanField(default=False, help_text="قالب نظام لا يمكن حذفه")
    requires_approval = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_comm_templates'
        unique_together = ('tenant_id', 'code', 'language')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} [{self.language}]"


# ============================================================
# 4. Communication Template Version — إصدارات القوالب
# ============================================================
class CommunicationTemplateVersion(CombinedSharedModel):
    """
    إصدار محدد من قالب الرسالة. يدعم التراجع والمراجعة.
    """
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('pending_approval', 'بانتظار الموافقة'),
        ('published', 'منشور'),
        ('archived', 'مؤرشف'),
    )

    template = models.ForeignKey(
        CommunicationTemplate, on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)

    subject = models.CharField(max_length=500, blank=True, null=True)
    body = models.TextField()
    content_type = models.CharField(max_length=20, default='html')

    change_log = models.TextField(blank=True, null=True, help_text="وصف التغييرات في هذا الإصدار")
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.UUIDField(null=True, blank=True)
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_comm_template_versions'
        unique_together = ('template', 'version_number')
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.template.name} v{self.version_number} ({self.get_status_display()})"


# ============================================================
# 5. Communication Variable — المتغيرات الديناميكية
# ============================================================
class CommunicationVariable(CombinedSharedModel):
    """
    تعريف المتغيرات الديناميكية المتاحة في القوالب.
    مثال: {{student_name}}, {{school_name}}, {{invoice_number}}
    """
    VARIABLE_SOURCES = (
        ('student', 'بيانات الطالب'),
        ('teacher', 'بيانات المعلم'),
        ('employee', 'بيانات الموظف'),
        ('guardian', 'بيانات ولي الأمر'),
        ('organization', 'بيانات المؤسسة'),
        ('academic', 'بيانات أكاديمية'),
        ('finance', 'بيانات مالية'),
        ('attendance', 'بيانات الحضور'),
        ('system', 'بيانات النظام'),
        ('custom', 'مخصص'),
    )

    name = models.CharField(max_length=100, help_text="اسم المتغير المعروض")
    key = models.CharField(max_length=100, db_index=True, help_text="مفتاح المتغير (مثال: student_name)")
    description = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=30, choices=VARIABLE_SOURCES, default='custom', db_index=True)
    default_value = models.CharField(max_length=255, blank=True, null=True, help_text="القيمة الافتراضية")
    data_type = models.CharField(max_length=20, default='string',
                                 choices=(('string', 'نص'), ('number', 'رقم'), ('date', 'تاريخ'),
                                          ('datetime', 'تاريخ ووقت'), ('boolean', 'منطقي'), ('url', 'رابط')))
    is_required = models.BooleanField(default=False)
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_comm_variables'
        unique_together = ('tenant_id', 'key')
        ordering = ['source', 'name']

    def __str__(self):
        return f"{{{{{self.key}}}}} — {self.name}"


# ============================================================
# 6. Communication Message — الرسائل الفعلية
# ============================================================
class CommunicationMessage(CombinedSharedModel):
    """
    الرسالة الفعلية المرسلة أو المنتظرة في النظام.
    كل رسالة مرتبطة بقناة ومزود وقالب اختياري.
    """
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('queued', 'في الطابور'),
        ('processing', 'قيد المعالجة'),
        ('sent', 'مرسلة'),
        ('delivered', 'تم التسليم'),
        ('read', 'مقروءة'),
        ('failed', 'فشلت'),
        ('cancelled', 'ملغاة'),
        ('bounced', 'مرتجعة'),
        ('expired', 'منتهية الصلاحية'),
    )

    PRIORITY_CHOICES = (
        ('critical', 'حرج'),
        ('high', 'عالي'),
        ('normal', 'عادي'),
        ('low', 'منخفض'),
    )

    # الربط بالقناة والمزود والقالب
    channel = models.ForeignKey(
        CommunicationChannel, on_delete=models.PROTECT,
        related_name='messages'
    )
    provider = models.ForeignKey(
        CommunicationProvider, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='messages'
    )
    template = models.ForeignKey(
        CommunicationTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='messages'
    )
    campaign = models.ForeignKey(
        'CommunicationCampaign', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='messages'
    )

    # محتوى الرسالة
    subject = models.CharField(max_length=500, blank=True, null=True)
    body = models.TextField()
    body_html = models.TextField(blank=True, null=True, help_text="محتوى HTML (للبريد الإلكتروني)")
    variables_data = models.JSONField(default=dict, blank=True, help_text="قيم المتغيرات المستخدمة")
    metadata = models.JSONField(default=dict, blank=True, help_text="بيانات وصفية إضافية")

    # حالة الرسالة
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal', db_index=True)

    # المرسل
    sender_name = models.CharField(max_length=255, blank=True, null=True)
    sender_address = models.CharField(max_length=255, blank=True, null=True)

    # المصدر (الموديول الذي طلب الإرسال)
    source_module = models.CharField(max_length=50, blank=True, null=True, db_index=True,
                                     help_text="الموديول المصدر (admissions, payroll, hr...)")
    source_event = models.CharField(max_length=100, blank=True, null=True, db_index=True,
                                    help_text="الحدث المصدر (StudentCreated, PayrollApproved...)")
    source_reference_id = models.UUIDField(null=True, blank=True, db_index=True,
                                           help_text="معرف الكيان المرتبط")

    # الجدولة
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True, db_index=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # تتبع خارجي
    external_id = models.CharField(max_length=255, blank=True, null=True, db_index=True,
                                   help_text="معرف الرسالة لدى المزود الخارجي")
    external_status = models.CharField(max_length=50, blank=True, null=True)

    # إعادة المحاولة
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    last_error = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_comm_messages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'status', 'channel']),
            models.Index(fields=['tenant_id', 'source_module', 'source_event']),
            models.Index(fields=['tenant_id', 'scheduled_at', 'status']),
            models.Index(fields=['tenant_id', 'priority', 'status']),
        ]

    def __str__(self):
        return f"رسالة #{str(self.id)[:8]} — {self.get_status_display()}"


# ============================================================
# 7. Communication Recipient — مستلمي الرسائل
# ============================================================
class CommunicationRecipient(CombinedSharedModel):
    """
    مستلم الرسالة. كل رسالة يمكن أن تحتوي على عدة مستلمين.
    """
    RECIPIENT_TYPES = (
        ('to', 'إلى'),
        ('cc', 'نسخة'),
        ('bcc', 'نسخة مخفية'),
    )

    ENTITY_TYPES = (
        ('student', 'طالب'),
        ('teacher', 'معلم'),
        ('employee', 'موظف'),
        ('guardian', 'ولي أمر'),
        ('user', 'مستخدم'),
        ('external', 'خارجي'),
    )

    message = models.ForeignKey(
        CommunicationMessage, on_delete=models.CASCADE,
        related_name='recipients'
    )
    recipient_type = models.CharField(max_length=10, choices=RECIPIENT_TYPES, default='to')
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES, default='user', db_index=True)
    entity_id = models.UUIDField(null=True, blank=True, db_index=True,
                                 help_text="معرف الكيان (الطالب، المعلم، الموظف...)")

    name = models.CharField(max_length=255, blank=True, null=True)
    address = models.CharField(max_length=255, db_index=True,
                               help_text="البريد الإلكتروني أو رقم الهاتف أو معرف الجهاز")

    # حالة التسليم لكل مستلم
    status = models.CharField(max_length=20, default='pending', db_index=True,
                               choices=(('pending', 'معلق'), ('sent', 'مرسل'), ('delivered', 'تم التسليم'),
                                        ('read', 'مقروء'), ('failed', 'فشل'), ('bounced', 'مرتجع')))
    delivered_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_comm_recipients'
        ordering = ['recipient_type', 'name']
        indexes = [
            models.Index(fields=['tenant_id', 'entity_type', 'entity_id']),
        ]

    def __str__(self):
        return f"{self.name or self.address} ({self.get_recipient_type_display()})"


# ============================================================
# 8. Communication Attachment — المرفقات
# ============================================================
class CommunicationAttachment(CombinedSharedModel):
    """
    مرفق مرتبط برسالة اتصال.
    يتكامل مع محرك المرفقات في Core Business.
    """
    message = models.ForeignKey(
        CommunicationMessage, on_delete=models.CASCADE,
        related_name='attachments'
    )
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500, help_text="مسار الملف في التخزين")
    file_size = models.BigIntegerField(default=0, help_text="حجم الملف بالبايت")
    content_type = models.CharField(max_length=100, help_text="نوع المحتوى (MIME type)")
    storage_reference_id = models.UUIDField(null=True, blank=True,
                                            help_text="مرجع محرك التخزين في Core Business")
    is_inline = models.BooleanField(default=False, help_text="مرفق مضمن في محتوى HTML")

    class Meta:
        db_table = 'nebras_comm_attachments'
        ordering = ['file_name']

    def __str__(self):
        return self.file_name


# ============================================================
# 9. Communication Queue — طابور الرسائل
# ============================================================
class CommunicationQueue(CombinedSharedModel):
    """
    طابور الرسائل غير المتزامن.
    يدعم الأولوية والجدولة وإعادة المحاولة.
    """
    QUEUE_STATUS = (
        ('queued', 'في الانتظار'),
        ('processing', 'قيد المعالجة'),
        ('completed', 'مكتمل'),
        ('failed', 'فشل'),
        ('retry', 'إعادة محاولة'),
        ('dead_letter', 'طابور الرسائل الميتة'),
        ('cancelled', 'ملغي'),
    )

    QUEUE_TYPES = (
        ('priority', 'أولوية'),
        ('scheduled', 'مجدول'),
        ('bulk', 'جماعي'),
        ('standard', 'عادي'),
    )

    message = models.OneToOneField(
        CommunicationMessage, on_delete=models.CASCADE,
        related_name='queue_entry'
    )
    queue_type = models.CharField(max_length=20, choices=QUEUE_TYPES, default='standard', db_index=True)
    status = models.CharField(max_length=20, choices=QUEUE_STATUS, default='queued', db_index=True)
    priority = models.IntegerField(default=0, help_text="0 = أعلى أولوية", db_index=True)

    # الجدولة
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # إعادة المحاولة
    attempt_count = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # Worker
    worker_id = models.CharField(max_length=100, blank=True, null=True, help_text="معرف الـ Celery Worker")
    celery_task_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_comm_queue'
        ordering = ['priority', 'scheduled_at', 'created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'status', 'priority']),
            models.Index(fields=['tenant_id', 'status', 'next_retry_at']),
        ]

    def __str__(self):
        return f"Queue #{str(self.id)[:8]} — {self.get_status_display()}"


# ============================================================
# 10. Communication Log — سجل التدقيق
# ============================================================
class CommunicationLog(CombinedSharedModel):
    """
    سجل تدقيق شامل لكل عملية اتصال.
    يسجل كل تغيير حالة ومحاولة إرسال.
    """
    LOG_LEVELS = (
        ('info', 'معلومات'),
        ('warning', 'تحذير'),
        ('error', 'خطأ'),
        ('debug', 'تتبع'),
    )

    message = models.ForeignKey(
        CommunicationMessage, on_delete=models.CASCADE,
        related_name='logs', null=True, blank=True
    )
    level = models.CharField(max_length=10, choices=LOG_LEVELS, default='info', db_index=True)
    action = models.CharField(max_length=100, db_index=True,
                              help_text="العملية (created, queued, sent, failed, retried...)")
    description = models.TextField()
    details = models.JSONField(default=dict, blank=True, help_text="تفاصيل إضافية")

    provider_response = models.JSONField(default=dict, blank=True, help_text="استجابة المزود الخارجي")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = 'nebras_comm_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'level', 'action']),
        ]

    def __str__(self):
        return f"[{self.get_level_display()}] {self.action}"


# ============================================================
# 11. Communication Preference — تفضيلات المستخدم
# ============================================================
class CommunicationPreference(CombinedSharedModel):
    """
    تفضيلات المستخدم للاتصالات والإشعارات.
    يمكن لكل مستخدم (طالب، معلم، موظف، ولي أمر) ضبط تفضيلاته.
    """
    ENTITY_TYPES = (
        ('student', 'طالب'),
        ('teacher', 'معلم'),
        ('employee', 'موظف'),
        ('guardian', 'ولي أمر'),
        ('user', 'مستخدم'),
    )

    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPES, db_index=True)
    entity_id = models.UUIDField(db_index=True, help_text="معرف الكيان (المستخدم)")
    user_id = models.UUIDField(null=True, blank=True, db_index=True, help_text="معرف حساب المستخدم")

    # التفضيلات
    preferred_language = models.CharField(max_length=10, default='ar',
                                          choices=(('ar', 'العربية'), ('en', 'English')))
    preferred_channel = models.ForeignKey(
        CommunicationChannel, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='preferred_by'
    )

    # ساعات الهدوء
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(null=True, blank=True)
    quiet_hours_end = models.TimeField(null=True, blank=True)
    quiet_hours_timezone = models.CharField(max_length=50, default='Africa/Khartoum')

    # التفضيلات التفصيلية
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=True)
    whatsapp_enabled = models.BooleanField(default=True)
    push_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    browser_enabled = models.BooleanField(default=True)

    # فئات الإشعارات
    enabled_categories = models.JSONField(default=list, blank=True,
                                          help_text="قائمة الفئات المفعلة (academic, finance...)")
    muted_categories = models.JSONField(default=list, blank=True,
                                        help_text="قائمة الفئات المكتومة")

    # Opt-out
    global_opt_out = models.BooleanField(default=False, help_text="إلغاء الاشتراك الكامل")

    # أجهزة الإشعارات
    device_tokens = models.JSONField(default=list, blank=True,
                                     help_text="قائمة رموز أجهزة الإشعارات (FCM tokens)")

    class Meta:
        db_table = 'nebras_comm_preferences'
        unique_together = ('tenant_id', 'entity_type', 'entity_id')

    def __str__(self):
        return f"تفضيلات {self.get_entity_type_display()} #{str(self.entity_id)[:8]}"


# ============================================================
# 12. Communication Campaign — الحملات
# ============================================================
class CommunicationCampaign(CombinedSharedModel):
    """
    حملة اتصال موجهة لجمهور محدد.
    تدعم الجدولة والتقسيم والتتبع.
    """
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('pending_approval', 'بانتظار الموافقة'),
        ('approved', 'تمت الموافقة'),
        ('scheduled', 'مجدولة'),
        ('running', 'قيد التنفيذ'),
        ('paused', 'متوقفة مؤقتاً'),
        ('completed', 'مكتملة'),
        ('cancelled', 'ملغاة'),
    )

    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)

    channel = models.ForeignKey(
        CommunicationChannel, on_delete=models.PROTECT,
        related_name='campaigns'
    )
    template = models.ForeignKey(
        CommunicationTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='campaigns'
    )

    # الجمهور المستهدف
    audience_type = models.CharField(max_length=30, default='manual',
                                     choices=(('manual', 'يدوي'), ('segment', 'شريحة'),
                                              ('all_students', 'جميع الطلاب'),
                                              ('all_teachers', 'جميع المعلمين'),
                                              ('all_employees', 'جميع الموظفين'),
                                              ('all_guardians', 'جميع أولياء الأمور'),
                                              ('custom_query', 'استعلام مخصص')))
    audience_filters = models.JSONField(default=dict, blank=True, help_text="فلاتر الجمهور المستهدف")
    audience_count = models.IntegerField(default=0)

    # الجدولة
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # الموافقة
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)

    # الإحصائيات
    total_messages = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    read_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_comm_campaigns'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


# ============================================================
# 13. Communication Event — أحداث النظام
# ============================================================
class CommunicationEvent(CombinedSharedModel):
    """
    ربط أحداث النطاق (Domain Events) بعمليات الاتصال.
    عند حدوث حدث معين، يتم إنشاء وظيفة اتصال تلقائياً.
    """
    name = models.CharField(max_length=255)
    event_type = models.CharField(max_length=100, db_index=True,
                                  help_text="نوع الحدث (StudentCreated, PayrollApproved...)")
    source_module = models.CharField(max_length=50, db_index=True,
                                     help_text="الموديول المصدر (students, payroll, hr...)")
    description = models.TextField(blank=True, null=True)

    # الربط بالقالب
    template = models.ForeignKey(
        CommunicationTemplate, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='events'
    )
    channel = models.ForeignKey(
        CommunicationChannel, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='events'
    )

    # التكوين
    is_active = models.BooleanField(default=True, db_index=True)
    auto_send = models.BooleanField(default=True, help_text="إرسال تلقائي عند حدوث الحدث")
    priority = models.CharField(max_length=20, default='normal')
    recipient_config = models.JSONField(default=dict, blank=True,
                                        help_text="تكوين المستلمين (من يتلقى الإشعار)")
    variable_mapping = models.JSONField(default=dict, blank=True,
                                        help_text="تعيين المتغيرات من بيانات الحدث")

    class Meta:
        db_table = 'nebras_comm_events'
        unique_together = ('tenant_id', 'event_type', 'source_module')
        ordering = ['source_module', 'event_type']

    def __str__(self):
        return f"{self.name} ({self.event_type})"


# ============================================================
# 14. Communication Webhook — تكوين Webhooks
# ============================================================
class CommunicationWebhook(CombinedSharedModel):
    """
    تكوين Webhooks الواردة والصادرة.
    """
    DIRECTION_CHOICES = (
        ('inbound', 'وارد'),
        ('outbound', 'صادر'),
    )

    name = models.CharField(max_length=255)
    url = models.URLField(help_text="رابط الـ Webhook")
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES, default='outbound')
    secret_key = models.CharField(max_length=255, blank=True, null=True, help_text="مفتاح التوقيع")
    headers = models.JSONField(default=dict, blank=True, help_text="الهيدرز المخصصة")

    events = models.JSONField(default=list, blank=True, help_text="قائمة الأحداث المشترك فيها")
    is_active = models.BooleanField(default=True)

    # الصحة
    last_triggered_at = models.DateTimeField(null=True, blank=True)
    last_response_code = models.IntegerField(null=True, blank=True)
    failure_count = models.IntegerField(default=0)
    max_failures = models.IntegerField(default=10, help_text="عدد الفشل قبل التعطيل التلقائي")

    class Meta:
        db_table = 'nebras_comm_webhooks'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_direction_display()})"


# ============================================================
# 15. Communication Statistics — الإحصائيات
# ============================================================
class CommunicationStatistics(CombinedSharedModel):
    """
    إحصائيات مجمعة لأداء الاتصالات.
    يتم تحديثها دورياً عبر مهام Celery.
    """
    PERIOD_CHOICES = (
        ('hourly', 'ساعي'),
        ('daily', 'يومي'),
        ('weekly', 'أسبوعي'),
        ('monthly', 'شهري'),
    )

    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES, db_index=True)
    period_start = models.DateTimeField(db_index=True)
    period_end = models.DateTimeField()

    channel = models.ForeignKey(
        CommunicationChannel, on_delete=models.CASCADE,
        null=True, blank=True, related_name='statistics'
    )
    provider = models.ForeignKey(
        CommunicationProvider, on_delete=models.CASCADE,
        null=True, blank=True, related_name='statistics'
    )

    # العدادات
    total_sent = models.IntegerField(default=0)
    total_delivered = models.IntegerField(default=0)
    total_failed = models.IntegerField(default=0)
    total_bounced = models.IntegerField(default=0)
    total_read = models.IntegerField(default=0)
    total_retried = models.IntegerField(default=0)

    # النسب
    delivery_rate = models.FloatField(default=0.0, help_text="نسبة التسليم %")
    read_rate = models.FloatField(default=0.0, help_text="نسبة القراءة %")
    failure_rate = models.FloatField(default=0.0, help_text="نسبة الفشل %")
    bounce_rate = models.FloatField(default=0.0, help_text="نسبة الارتجاع %")

    # الأداء
    avg_delivery_time_seconds = models.FloatField(default=0.0, help_text="متوسط وقت التسليم بالثواني")

    class Meta:
        db_table = 'nebras_comm_statistics'
        ordering = ['-period_start']
        indexes = [
            models.Index(fields=['tenant_id', 'period_type', 'period_start']),
        ]

    def __str__(self):
        return f"إحصائيات {self.get_period_type_display()} — {self.period_start.date()}"


# ============================================================
# 16. Communication Failure — سجل حالات الفشل
# ============================================================
class CommunicationFailure(CombinedSharedModel):
    """
    سجل تفصيلي لحالات الفشل في الإرسال.
    """
    FAILURE_TYPES = (
        ('temporary', 'مؤقت (يمكن إعادة المحاولة)'),
        ('permanent', 'دائم (لا يمكن إعادة المحاولة)'),
        ('rate_limit', 'تجاوز الحد المسموح'),
        ('invalid_recipient', 'مستلم غير صالح'),
        ('provider_error', 'خطأ في المزود'),
        ('timeout', 'انتهاء المهلة'),
        ('authentication', 'خطأ في المصادقة'),
        ('unknown', 'غير معروف'),
    )

    message = models.ForeignKey(
        CommunicationMessage, on_delete=models.CASCADE,
        related_name='failures'
    )
    failure_type = models.CharField(max_length=30, choices=FAILURE_TYPES, default='unknown', db_index=True)
    error_code = models.CharField(max_length=50, blank=True, null=True)
    error_message = models.TextField()
    provider_response = models.JSONField(default=dict, blank=True)
    stack_trace = models.TextField(blank=True, null=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_comm_failures'
        ordering = ['-created_at']

    def __str__(self):
        return f"فشل {self.get_failure_type_display()} — {self.error_code}"


# ============================================================
# 17. Communication Retry — إعادة المحاولة
# ============================================================
class CommunicationRetry(CombinedSharedModel):
    """
    سجل محاولات إعادة الإرسال مع سياسة التأخير الأسي.
    """
    message = models.ForeignKey(
        CommunicationMessage, on_delete=models.CASCADE,
        related_name='retries'
    )
    attempt_number = models.IntegerField()
    status = models.CharField(max_length=20, default='pending',
                               choices=(('pending', 'معلق'), ('processing', 'قيد المعالجة'),
                                        ('success', 'نجاح'), ('failed', 'فشل')))

    scheduled_at = models.DateTimeField(db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    delay_seconds = models.IntegerField(default=0, help_text="التأخير قبل المحاولة (بالثواني)")
    error_message = models.TextField(blank=True, null=True)
    provider_response = models.JSONField(default=dict, blank=True)

    # سياسة إعادة المحاولة
    is_manual = models.BooleanField(default=False, help_text="إعادة محاولة يدوية")
    triggered_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_comm_retries'
        unique_together = ('message', 'attempt_number')
        ordering = ['attempt_number']

    def __str__(self):
        return f"محاولة #{self.attempt_number} — {self.status}"


# ============================================================
# 18. Notification — مركز الإشعارات الداخلي
# ============================================================
class Notification(CombinedSharedModel):
    """
    إشعار داخل التطبيق (مركز الإشعارات).
    يدعم التجميع والأولوية والإجراءات والروابط العميقة.
    """
    PRIORITY_CHOICES = (
        ('urgent', 'عاجل'),
        ('high', 'مرتفع'),
        ('normal', 'عادي'),
        ('low', 'منخفض'),
    )

    CATEGORY_CHOICES = (
        ('academic', 'أكاديمي'),
        ('admission', 'قبول'),
        ('attendance', 'حضور'),
        ('finance', 'مالي'),
        ('hr', 'موارد بشرية'),
        ('payroll', 'رواتب'),
        ('exam', 'اختبارات'),
        ('workflow', 'مسارات عمل'),
        ('system', 'نظام'),
        ('general', 'عام'),
        ('alert', 'تنبيه'),
    )

    # المستلم
    user_id = models.UUIDField(db_index=True, help_text="معرف المستخدم المستلم")
    entity_type = models.CharField(max_length=20, blank=True, null=True)
    entity_id = models.UUIDField(null=True, blank=True)

    # المحتوى
    title = models.CharField(max_length=255)
    body = models.TextField()
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="أيقونة Material")
    image_url = models.URLField(blank=True, null=True)

    # التصنيف
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='general', db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal', db_index=True)

    # الحالة
    is_read = models.BooleanField(default=False, db_index=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    is_pinned = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)

    read_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    # الإجراءات والروابط
    action_url = models.CharField(max_length=500, blank=True, null=True, help_text="رابط عميق (Deep Link)")
    action_label = models.CharField(max_length=100, blank=True, null=True, help_text="نص زر الإجراء")
    actions = models.JSONField(default=list, blank=True,
                               help_text="قائمة الإجراءات [{label, url, type}]")
    metadata = models.JSONField(default=dict, blank=True)

    # التجميع
    group_key = models.CharField(max_length=100, blank=True, null=True, db_index=True,
                                 help_text="مفتاح التجميع (لتجميع إشعارات متشابهة)")

    # المصدر
    source_module = models.CharField(max_length=50, blank=True, null=True, db_index=True)
    source_event = models.CharField(max_length=100, blank=True, null=True)
    source_reference_id = models.UUIDField(null=True, blank=True)
    message = models.ForeignKey(
        CommunicationMessage, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='notifications'
    )

    # الصلاحية
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    reminder_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_comm_notifications'
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['tenant_id', 'user_id', 'is_read']),
            models.Index(fields=['tenant_id', 'user_id', 'category']),
            models.Index(fields=['tenant_id', 'user_id', 'is_archived']),
            models.Index(fields=['tenant_id', 'group_key']),
        ]

    def __str__(self):
        return f"{self.title} — {'مقروء' if self.is_read else 'غير مقروء'}"
