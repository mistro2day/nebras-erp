from typing import Generic, TypeVar, List, Optional
from apps.shared.application.repositories import BaseRepository
import uuid

T = TypeVar('T')

class BaseService:
    """الخدمة الأساسية لطبقة التطبيق (Base Application Service)"""
    pass


class CRUDService(Generic[T], BaseService):
    """
    خدمة العمليات الأساسية المشتركة (CRUD Application Service)
    """
    def __init__(self, repository: BaseRepository[T]):
        self.repository = repository

    def get_details(self, id: uuid.UUID) -> Optional[T]:
        return self.repository.get_by_id(id)

    def get_all(self) -> List[T]:
        return list(self.repository.list_all())

    def create_item(self, **kwargs) -> T:
        return self.repository.create(**kwargs)

    def update_item(self, id: uuid.UUID, **kwargs) -> Optional[T]:
        item = self.repository.get_by_id(id)
        if item:
            return self.repository.update(item, **kwargs)
        return None

    def delete_item(self, id: uuid.UUID) -> bool:
        item = self.repository.get_by_id(id)
        if item:
            self.repository.delete(item)
            return True
        return False