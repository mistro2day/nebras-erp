from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class ApiClient(CombinedSharedModel):
    """
    بيانات العميل المتصل بالنظام (جهة خارجية أو تطبيق داخلي)
    """
    name = models.CharField(max_length=150)
    client_id = models.CharField(max_length=100, unique=True, db_index=True)
    client_secret = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_integration_api_clients'
        verbose_name = 'عميل بوابة التكامل'
        verbose_name_plural = 'عملاء بوابة التكامل'


class ApiKey(CombinedSharedModel):
    """
    مفاتيح الوصول للبوابة (API Keys)
    """
    client = models.ForeignKey(ApiClient, on_delete=models.CASCADE, related_name='api_keys')
    key_hash = models.CharField(max_length=255, unique=True, db_index=True)
    prefix = models.CharField(max_length=16)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_integration_api_keys'
        verbose_name = 'مفتاح الوصول'
        verbose_name_plural = 'مفاتيح الوصول للـ API'


class OAuthClient(CombinedSharedModel):
    """
    بيانات OAuth 2.0 للعملاء
    """
    client = models.OneToOneField(ApiClient, on_delete=models.CASCADE, related_name='oauth_details')
    redirect_uris = models.TextField(help_text="قائمة عناوين إعادة التوجيه مفصولة بمسافات")
    client_type = models.CharField(max_length=20, default='confidential') # confidential, public

    class Meta:
        db_table = 'nebras_integration_oauth_clients'


class AccessToken(CombinedSharedModel):
    """
    رموز الوصول المؤقتة
    """
    client = models.ForeignKey(ApiClient, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    scope = models.TextField(blank=True)

    class Meta:
        db_table = 'nebras_integration_access_tokens'


class RefreshToken(CombinedSharedModel):
    """
    رموز تحديث الـ tokens
    """
    access_token = models.OneToOneField(AccessToken, on_delete=models.CASCADE)
    token = models.CharField(max_length=255, unique=True, db_index=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'nebras_integration_refresh_tokens'


class ApiScope(CombinedSharedModel):
    """
    مجالات الصلاحيات المتاحة عبر الـ API (Scopes)
    """
    code = models.CharField(max_length=100, unique=True, db_index=True)
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)

    class Meta:
        db_table = 'nebras_integration_api_scopes'


class ApiRateLimit(CombinedSharedModel):
    """
    قواعد تحديد معدل الاستهلاك (Rate Limit) لكل Scope أو عميل
    """
    client = models.ForeignKey(ApiClient, on_delete=models.CASCADE, null=True, blank=True)
    scope = models.ForeignKey(ApiScope, on_delete=models.CASCADE, null=True, blank=True)
    requests_limit = models.IntegerField(default=1000)
    period_seconds = models.IntegerField(default=3600) # ساعة افتراضياً

    class Meta:
        db_table = 'nebras_integration_rate_limits'


class ApiQuota(CombinedSharedModel):
    """
    الحصص والقيود الدورية للاستهلاك (Quota)
    """
    client = models.ForeignKey(ApiClient, on_delete=models.CASCADE)
    monthly_limit = models.BigIntegerField(default=100000)
    current_usage = models.BigIntegerField(default=0)

    class Meta:
        db_table = 'nebras_integration_quotas'


class Webhook(CombinedSharedModel):
    """
    تعريف الويب هوكس المعرفة بالنظام
    """
    event_name = models.CharField(max_length=150, unique=True, db_index=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_integration_webhooks'


class WebhookSubscription(CombinedSharedModel):
    """
    اشتراكات العملاء في الويب هوكس لتلقي الأحداث
    """
    client = models.ForeignKey(ApiClient, on_delete=models.CASCADE, related_name='subscriptions')
    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE)
    target_url = models.URLField(max_length=500)
    secret_token = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_integration_webhook_subscriptions'


class WebhookDelivery(CombinedSharedModel):
    """
    سجلات توصيل أحداث الويب هوكس
    """
    subscription = models.ForeignKey(WebhookSubscription, on_delete=models.CASCADE, related_name='deliveries')
    payload = models.TextField()
    response_body = models.TextField(blank=True, null=True)
    response_code = models.IntegerField(null=True, blank=True)
    is_delivered = models.BooleanField(default=False)
    attempt_number = models.IntegerField(default=1)
    delivered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_integration_webhook_deliveries'


class IntegrationEndpoint(CombinedSharedModel):
    """
    نقاط الربط المعرفة في بوابة الـ API والـ Gateway
    """
    path = models.CharField(max_length=255, db_index=True)
    method = models.CharField(max_length=10, default='GET')
    target_service = models.CharField(max_length=100) # اسم التطبيق الداخلي
    is_public = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_integration_endpoints'


class ExternalProvider(CombinedSharedModel):
    """
    مزودي الخدمة الخارجيين (Google, Firebase, Microsoft, Moodle)
    """
    provider_code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    config_schema = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_integration_providers'


class ExternalConnection(CombinedSharedModel):
    """
    اتصالات المستأجرين بمزودي الخدمة الخارجيين
    """
    provider = models.ForeignKey(ExternalProvider, on_delete=models.CASCADE)
    config_values = models.JSONField(default=dict)
    is_connected = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_integration_connections'


class IntegrationLog(CombinedSharedModel):
    """
    سجلات نداءات البوابة والتكامل
    """
    client = models.ForeignKey(ApiClient, on_delete=models.SET_NULL, null=True, blank=True)
    path = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    status_code = models.IntegerField()
    latency_ms = models.IntegerField(default=0)
    correlation_id = models.UUIDField(db_index=True)

    class Meta:
        db_table = 'nebras_integration_logs'


class IntegrationJob(CombinedSharedModel):
    """
    وظائف التكامل الخلفية وعمليات المزامنة
    """
    job_type = models.CharField(max_length=100) # e.g., MOODLE_SYNC
    status = models.CharField(max_length=50, default='pending') # pending, running, completed, failed
    params = models.JSONField(default=dict)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_integration_jobs'


class IntegrationQueue(CombinedSharedModel):
    """
    طوابير الأحداث للتكامل غير المتزامن
    """
    event_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict)
    processed = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_integration_queue'


class IntegrationAudit(CombinedSharedModel):
    """
    سجلات التدقيق لعمليات تعديل الإعدادات والربط
    """
    user_id = models.UUIDField(null=True, blank=True)
    action = models.CharField(max_length=150)
    details = models.TextField()

    class Meta:
        db_table = 'nebras_integration_audit'


class GatewaySettings(CombinedSharedModel):
    """
    إعدادات بوابة التكامل الإدارية
    """
    maintenance_mode = models.BooleanField(default=False)
    allowed_ips = models.JSONField(default=list)
    blocked_ips = models.JSONField(default=list)

    class Meta:
        db_table = 'nebras_integration_settings'


class IntegrationStatistics(CombinedSharedModel):
    """
    إحصائيات المرور والاستخدام لـ API Gateway
    """
    endpoint_path = models.CharField(max_length=255, db_index=True)
    total_calls = models.BigIntegerField(default=0)
    error_calls = models.BigIntegerField(default=0)
    avg_latency_ms = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_integration_statistics'
