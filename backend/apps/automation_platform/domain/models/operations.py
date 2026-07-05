"""
Enterprise Operations Platform domain models.

Point-in-time observability snapshots for system health, jobs, queues, workers,
cache/redis/celery, database, API health, storage and tenants. Snapshots are
persisted so the Operations Center can render trends without external tooling.
"""
from django.db import models
from apps.shared.domain.models import CombinedSharedModel


class SystemHealthSnapshot(CombinedSharedModel):
    """لقطة صحة النظام العامة."""
    STATUS = (('healthy', 'سليم'), ('degraded', 'متدهور'), ('down', 'متوقف'))
    component = models.CharField(max_length=100, db_index=True)  # api|db|redis|celery|storage
    status = models.CharField(max_length=20, choices=STATUS, default='healthy')
    latency_ms = models.IntegerField(default=0)
    details = models.JSONField(default=dict, blank=True)
    captured_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_health_snapshots'


class JobMetric(CombinedSharedModel):
    """مقياس مهام خلفية (Job / Background Tasks Dashboard)."""
    queue_name = models.CharField(max_length=100, db_index=True)
    pending = models.IntegerField(default=0)
    running = models.IntegerField(default=0)
    succeeded = models.BigIntegerField(default=0)
    failed = models.BigIntegerField(default=0)
    captured_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_job_metrics'


class QueueMetric(CombinedSharedModel):
    """مقياس طوابير (Queue Dashboard)."""
    broker = models.CharField(max_length=50, default='redis')
    queue_name = models.CharField(max_length=100, db_index=True)
    depth = models.IntegerField(default=0)
    consumers = models.IntegerField(default=0)
    oldest_message_age_s = models.IntegerField(default=0)
    captured_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_queue_metrics'


class WorkerMetric(CombinedSharedModel):
    """مقياس عمّال Celery (Worker Dashboard)."""
    worker_name = models.CharField(max_length=150, db_index=True)
    is_online = models.BooleanField(default=True)
    active_tasks = models.IntegerField(default=0)
    processed_total = models.BigIntegerField(default=0)
    load_avg = models.FloatField(default=0)
    captured_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_worker_metrics'


class ResourceMetric(CombinedSharedModel):
    """مقياس مورد (cache/redis/db/storage) عام قابل للتوسع."""
    resource_type = models.CharField(max_length=50, db_index=True)  # cache|redis|db|storage|api
    metric_name = models.CharField(max_length=100)
    metric_value = models.FloatField(default=0)
    unit = models.CharField(max_length=20, blank=True, null=True)
    labels = models.JSONField(default=dict, blank=True)
    captured_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_resource_metrics'


class TenantUsageMetric(CombinedSharedModel):
    """مقياس استهلاك مستأجر (Tenant Dashboard)."""
    active_users = models.IntegerField(default=0)
    storage_bytes = models.BigIntegerField(default=0)
    api_calls_24h = models.BigIntegerField(default=0)
    automations_run_24h = models.BigIntegerField(default=0)
    captured_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'nebras_ap_tenant_usage_metrics'


class OperationsAlert(CombinedSharedModel):
    """تنبيه تشغيلي مُولّد من العتبات."""
    SEVERITY = (('info', 'معلومة'), ('warning', 'تحذير'), ('critical', 'حرِج'))
    component = models.CharField(max_length=100, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY, default='warning')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, null=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_ap_operations_alerts'
