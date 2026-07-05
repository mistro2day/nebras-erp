"""
DevOps Platform domain models (interfaces / preparation only).

Environment, secrets, config, deployment history, rollback, feature flags,
version manager, health checks, maintenance mode, backup/restore, migrations,
logs, tracing, metrics. Cloud/Kubernetes deployment is intentionally NOT
implemented — these are configuration + history records and interface stubs.
"""
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class Environment(CombinedSharedModel):
    """بيئة تشغيل (Environment Manager) — dev/staging/prod."""
    KIND = (('development', 'تطوير'), ('staging', 'تجهيز'), ('production', 'إنتاج'), ('custom', 'مخصص'))
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    kind = models.CharField(max_length=20, choices=KIND, default='development')
    base_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    variables = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_ap_environments'


class Secret(CombinedSharedModel):
    """سر مُدار (Secrets Manager) — تُخزَّن القيمة مُرمّزة/مرجعية فقط."""
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='secrets')
    key = models.CharField(max_length=150, db_index=True)
    value_ref = models.CharField(max_length=300, blank=True, null=True)  # مرجع خزنة خارجية
    is_encrypted = models.BooleanField(default=True)
    last_rotated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_secrets'
        unique_together = ('environment', 'key')


class ConfigItem(CombinedSharedModel):
    """عنصر تهيئة بيئي (Configuration Manager)."""
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='config_items')
    key = models.CharField(max_length=150, db_index=True)
    value = models.JSONField(default=dict, blank=True)
    description = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_config_items'
        unique_together = ('environment', 'key')


class FeatureFlag(CombinedSharedModel):
    """راية ميزة (Feature Flags) على مستوى بيئة/مستأجر."""
    key = models.CharField(max_length=150, db_index=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    is_enabled = models.BooleanField(default=False)
    rollout_percentage = models.IntegerField(default=0)  # 0-100
    environment = models.ForeignKey(Environment, on_delete=models.SET_NULL, null=True, blank=True, related_name='feature_flags')
    conditions = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_ap_feature_flags'
        unique_together = ('tenant_id', 'key', 'environment')


class Deployment(CombinedSharedModel):
    """سجل نشر (Deployment History) — تحضير فقط، بلا تنفيذ سحابي."""
    STATUS = (('queued', 'بالانتظار'), ('running', 'جارٍ'), ('succeeded', 'ناجح'),
              ('failed', 'فاشل'), ('rolled_back', 'مُتراجَع'))
    environment = models.ForeignKey(Environment, on_delete=models.CASCADE, related_name='deployments')
    version = models.CharField(max_length=60)
    commit_ref = models.CharField(max_length=120, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='queued')
    notes = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    triggered_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_deployments'


class ReleaseVersion(CombinedSharedModel):
    """إصدار نظام (Version Manager)."""
    version = models.CharField(max_length=60, unique=True, db_index=True)
    release_notes = models.TextField(blank=True, null=True)
    is_current = models.BooleanField(default=False)
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_release_versions'


class HealthCheck(CombinedSharedModel):
    """فحص صحة مُهيّأ (Health Checks) — تعريف نقطة الفحص وحالتها الأخيرة."""
    name = models.CharField(max_length=150)
    target = models.CharField(max_length=300)  # url أو مكوّن داخلي
    method = models.CharField(max_length=10, default='GET')
    expected_status = models.IntegerField(default=200)
    interval_seconds = models.IntegerField(default=60)
    last_status = models.CharField(max_length=20, default='unknown')
    last_checked_at = models.DateTimeField(null=True, blank=True)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_ap_health_checks'


class MaintenanceWindow(CombinedSharedModel):
    """نافذة صيانة / وضع الصيانة (Maintenance Mode)."""
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, null=True)
    environment = models.ForeignKey(Environment, on_delete=models.SET_NULL, null=True, blank=True, related_name='maintenance_windows')
    is_active = models.BooleanField(default=False)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_maintenance_windows'


class BackupRecord(CombinedSharedModel):
    """سجل نسخة احتياطية (Backup Manager) — بيانات وصفية فقط."""
    STATUS = (('created', 'أُنشئت'), ('failed', 'فشلت'), ('restored', 'مُستعادة'))
    label = models.CharField(max_length=200)
    environment = models.ForeignKey(Environment, on_delete=models.SET_NULL, null=True, blank=True, related_name='backups')
    location_ref = models.CharField(max_length=300, blank=True, null=True)
    size_bytes = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS, default='created')
    checksum = models.CharField(max_length=128, blank=True, null=True)

    class Meta:
        db_table = 'nebras_ap_backup_records'


class MigrationRecord(CombinedSharedModel):
    """سجل ترحيل قاعدة بيانات (Migration Dashboard) — بيانات وصفية."""
    app_label = models.CharField(max_length=100, db_index=True)
    migration_name = models.CharField(max_length=255)
    applied = models.BooleanField(default=False)
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_migration_records'


class LogEntry(CombinedSharedModel):
    """قيد سجل مجمّع (Log Viewer) — يستقبل من المكوّنات المختلفة."""
    LEVEL = (('debug', 'debug'), ('info', 'info'), ('warning', 'warning'),
             ('error', 'error'), ('critical', 'critical'))
    source = models.CharField(max_length=120, db_index=True)
    level = models.CharField(max_length=20, choices=LEVEL, default='info')
    message = models.TextField()
    context = models.JSONField(default=dict, blank=True)
    trace_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_log_entries'


class TraceSpan(CombinedSharedModel):
    """مقطع تتبّع موزّع (Tracing) — تحضير واجهة."""
    trace_id = models.CharField(max_length=64, db_index=True)
    span_id = models.CharField(max_length=64, db_index=True)
    parent_span_id = models.CharField(max_length=64, blank=True, null=True)
    name = models.CharField(max_length=200)
    service = models.CharField(max_length=120, blank=True, null=True)
    duration_ms = models.IntegerField(default=0)
    attributes = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_ap_trace_spans'


class MetricSample(CombinedSharedModel):
    """عيّنة قياس زمنية (Metrics) — تحضير واجهة."""
    metric_name = models.CharField(max_length=150, db_index=True)
    value = models.FloatField(default=0)
    labels = models.JSONField(default=dict, blank=True)
    sampled_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_metric_samples'
