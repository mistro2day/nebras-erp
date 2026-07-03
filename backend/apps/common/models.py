from django.db import models
from django.utils import timezone
import uuid

# ملاحظة: الكلاسات المجردة الموحدة الجديدة متوفرة في apps.shared.domain.models
# الموديولات القادمة يجب أن تستورد من apps.shared بدلاً من هنا.
# هذا الملف محفوظ للتوافق الخلفي مع الموديولات الحالية.

class TenantQuerySet(models.QuerySet):
    """
    QuerySet مخصص يقوم تلقائياً بفلترة البيانات حسب المستأجر النشط وتجنب البيانات المحذوفة لطيفاً
    """
    def active(self):
        return self.filter(deleted_at__isnull=True)

    def by_tenant(self, tenant_id):
        return self.filter(tenant_id=tenant_id)


class TenantManager(models.Manager):
    def get_queryset(self):
        from apps.tenants.context import get_current_tenant_id
        qs = TenantQuerySet(self.model, using=self._db).active()
        tenant_id = get_current_tenant_id()
        if tenant_id:
            qs = qs.by_tenant(tenant_id)
        return qs


class CombinedBaseModel(models.Model):
    """
    النموذج المجرد الأساسي لجميع جداول قاعدة البيانات التشغيلية
    يحتوي على الـ UUID، وحقول التتبع والتواريخ والحذف اللطيف وعزل المستأجرين
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.UUIDField(db_index=True) # UUID الخاص بالمستأجر
    created_at = models.DateTimeField(db_index=True, default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.UUIDField(null=True, blank=True)
    updated_by = models.UUIDField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    version = models.IntegerField(default=1)

    # استخدام المدير المخصص للتصفية التلقائية وعزل البيانات
    objects = TenantManager()
    all_objects = models.Manager() # للوصول غير المفلتر (مثال: للعمليات الإدارية الفائقة)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        """تطبيق الحذف اللطيف (Soft Delete)"""
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    def restore(self):
        """استرجاع الكيان المحذوف لطيفاً"""
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])