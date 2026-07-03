from django.db import models
from django.utils import timezone
import uuid

# --- Managers ---

class SoftDeleteQuerySet(models.QuerySet):
    def delete(self):
        return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()


class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class TenantQuerySet(models.QuerySet):
    def filter_by_tenant(self, tenant_id):
        return self.filter(tenant_id=tenant_id)


class TenantManager(SoftDeleteManager):
    """مدير المستأجرين والحذف اللطيف المتكامل"""
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)

    def for_tenant(self, tenant_id):
        return self.get_queryset().filter(tenant_id=tenant_id)


# --- Models ---

class TimestampModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        self.deleted_at = timezone.now()
        self.save()

    def restore(self):
        self.deleted_at = None
        self.save()


class TenantModel(models.Model):
    tenant_id = models.UUIDField(db_index=True)

    class Meta:
        abstract = True


class AuditModel(models.Model):
    created_by = models.UUIDField(null=True, blank=True)
    updated_by = models.UUIDField(null=True, blank=True)

    class Meta:
        abstract = True


class CombinedSharedModel(UUIDModel, TimestampModel, SoftDeleteModel, TenantModel, AuditModel):
    """
    النموذج النموذجي الجامع لقواعد Nebras ERP
    يحتوي على الـ UUID، التاريخ، الحذف اللطيف، المستأجر، والتدقيق الأمني.
    """
    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True