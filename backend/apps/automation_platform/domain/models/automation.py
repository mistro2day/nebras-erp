"""
Automation Engine domain models.

Event/schedule/webhook/API triggers -> automation flows -> actions. Execution of
any workflow action delegates to ``apps.workflow`` and any rule action delegates
to ``apps.rules``; notifications delegate to the platform notification service.
"""
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class AutomationFlow(CombinedSharedModel):
    """تدفق أتمتة قابل للتهيئة: محفّز واحد أو أكثر ينفّذ سلسلة إجراءات."""
    STATUS_CHOICES = (
        ('active', 'مفعل'),
        ('paused', 'موقوف مؤقتاً'),
        ('draft', 'مسودة'),
        ('archived', 'مؤرشف'),
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_enabled = models.BooleanField(default=True)

    # ربط اختياري بمخطط مصمم مسار العمل
    diagram_id = models.UUIDField(null=True, blank=True, db_index=True)

    concurrency_limit = models.IntegerField(default=0)  # 0 = بلا حد
    last_run_at = models.DateTimeField(null=True, blank=True)
    run_count = models.BigIntegerField(default=0)

    class Meta:
        db_table = 'nebras_ap_automation_flows'


class AutomationTrigger(CombinedSharedModel):
    """محفّز يبدأ تدفق الأتمتة."""
    TRIGGER_TYPES = (
        ('event', 'حدث نظام (Event Bus)'),
        ('schedule', 'جدولة زمنية / Cron'),
        ('webhook', 'Webhook خارجي'),
        ('api', 'استدعاء API'),
        ('database', 'حدث قاعدة بيانات'),
        ('workflow', 'حدث مسار عمل'),
        ('rule', 'حدث قاعدة'),
        ('manual', 'تشغيل يدوي'),
    )
    flow = models.ForeignKey(AutomationFlow, on_delete=models.CASCADE, related_name='triggers')
    trigger_type = models.CharField(max_length=30, choices=TRIGGER_TYPES)

    # مفتاح الحدث للـ event/workflow/rule/database ، أو cron للجدولة
    event_key = models.CharField(max_length=200, blank=True, null=True, db_index=True)
    cron_expression = models.CharField(max_length=100, blank=True, null=True)
    webhook_token = models.CharField(max_length=128, blank=True, null=True, db_index=True)

    condition_expression = models.TextField(blank=True, null=True)  # فلترة قبل التشغيل
    config = models.JSONField(default=dict, blank=True)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_ap_automation_triggers'


class AutomationAction(CombinedSharedModel):
    """إجراء ضمن تدفق الأتمتة (منفّذ عبر المحركات الحالية)."""
    ACTION_TYPES = (
        ('run_workflow', 'تشغيل مسار عمل'),
        ('evaluate_rule', 'تقييم قاعدة'),
        ('send_notification', 'إرسال إشعار'),
        ('call_webhook', 'استدعاء Webhook'),
        ('call_api', 'استدعاء API داخلي'),
        ('create_task', 'إنشاء مهمة خلفية'),
        ('update_record', 'تحديث سجل'),
        ('emit_event', 'إطلاق حدث'),
        ('delay', 'تأخير'),
        ('branch', 'تفرع شرطي'),
    )
    flow = models.ForeignKey(AutomationFlow, on_delete=models.CASCADE, related_name='actions')
    order = models.IntegerField(default=0)
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    config = models.JSONField(default=dict, blank=True)
    condition_expression = models.TextField(blank=True, null=True)
    continue_on_error = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_ap_automation_actions'
        ordering = ['order']


class RetryPolicy(CombinedSharedModel):
    """سياسة إعادة المحاولة لتدفق أو إجراء."""
    flow = models.OneToOneField(AutomationFlow, on_delete=models.CASCADE, related_name='retry_policy')
    max_retries = models.IntegerField(default=3)
    backoff_seconds = models.IntegerField(default=30)
    backoff_strategy = models.CharField(max_length=20, default='exponential')  # fixed|linear|exponential

    class Meta:
        db_table = 'nebras_ap_retry_policies'


class ScheduledJob(CombinedSharedModel):
    """مهمة مجدولة (Cron / فترات) — واجهة تهيئة فوق Celery beat."""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=100, unique=True, db_index=True)
    cron_expression = models.CharField(max_length=100)
    flow = models.ForeignKey(AutomationFlow, on_delete=models.SET_NULL, null=True, blank=True, related_name='scheduled_jobs')
    task_path = models.CharField(max_length=255, blank=True, null=True)  # مسار مهمة Celery اختياري
    is_enabled = models.BooleanField(default=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_scheduled_jobs'


class WebhookEndpoint(CombinedSharedModel):
    """نقطة استقبال Webhook واردة تربط بتدفق أتمتة."""
    name = models.CharField(max_length=200)
    slug = models.CharField(max_length=120, unique=True, db_index=True)
    token = models.CharField(max_length=128, db_index=True)
    flow = models.ForeignKey(AutomationFlow, on_delete=models.CASCADE, related_name='webhooks')
    secret = models.CharField(max_length=255, blank=True, null=True)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_ap_webhook_endpoints'


class AutomationRun(CombinedSharedModel):
    """سجل تشغيل واحد لتدفق أتمتة."""
    STATUS = (
        ('pending', 'قيد الانتظار'),
        ('running', 'قيد التنفيذ'),
        ('success', 'ناجح'),
        ('failed', 'فاشل'),
        ('retrying', 'إعادة محاولة'),
        ('cancelled', 'ملغى'),
    )
    flow = models.ForeignKey(AutomationFlow, on_delete=models.CASCADE, related_name='runs')
    trigger = models.ForeignKey(AutomationTrigger, on_delete=models.SET_NULL, null=True, blank=True, related_name='runs')
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    trigger_payload = models.JSONField(default=dict, blank=True)
    context = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    attempt = models.IntegerField(default=1)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_automation_runs'


class AutomationRunStep(CombinedSharedModel):
    """خطوة تنفيذ إجراء ضمن سجل التشغيل."""
    run = models.ForeignKey(AutomationRun, on_delete=models.CASCADE, related_name='steps')
    action = models.ForeignKey(AutomationAction, on_delete=models.SET_NULL, null=True, blank=True)
    order = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='pending')
    output = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_automation_run_steps'
        ordering = ['order']
