from typing import Generic, TypeVar, Optional, List, Any
from django.db import models
import uuid

T = TypeVar('T', bound=models.Model)

class BaseRepository(Generic[T]):
    """
    المستودع الأساسي (Base Repository Pattern) لتجريد عمليات الوصول للبيانات
    """
    def __init__(self, model: type[T]):
        self.model = model

    def get_by_id(self, id: uuid.UUID) -> Optional[T]:
        try:
            return self.model.objects.get(id=id)
        except self.model.DoesNotExist:
            return None

    def list_all(self) -> models.QuerySet[T]:
        return self.model.objects.all()

    def filter(self, **kwargs) -> models.QuerySet[T]:
        return self.model.objects.filter(**kwargs)

    def create(self, **kwargs) -> T:
        return self.model.objects.create(**kwargs)

    def update(self, instance: T, **kwargs) -> T:
        for attr, value in kwargs.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

    def delete(self, instance: T):
        instance.delete()


class TenantRepository(BaseRepository[T]):
    """مستودع المستأجرين لعزل البيانات تلقائياً"""
    def list_for_tenant(self, tenant_id: uuid.UUID) -> models.QuerySet[T]:
        if hasattr(self.model.objects, 'for_tenant'):
            return self.model.objects.for_tenant(tenant_id)
        return self.model.objects.filter(tenant_id=tenant_id)

    def get_for_tenant(self, id: uuid.UUID, tenant_id: uuid.UUID) -> Optional[T]:
        try:
            return self.list_for_tenant(tenant_id).get(id=id)
        except self.model.DoesNotExist:
            return None