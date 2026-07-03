from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from apps.organization.domain.models import Branch, Campus, Building, Room, Department

class IBranchRepository(ABC):
    @abstractmethod
    def get_by_id(self, branch_id: UUID) -> Optional[Branch]:
        pass

    @abstractmethod
    def get_by_code(self, tenant_id: UUID, code: str) -> Optional[Branch]:
        pass

    @abstractmethod
    def save(self, branch: Branch) -> Branch:
        pass


class DjangoBranchRepository(IBranchRepository):
    def get_by_id(self, branch_id: UUID) -> Optional[Branch]:
        try:
            return Branch.objects.get(id=branch_id, deleted_at__isnull=True)
        except Branch.DoesNotExist:
            return None

    def get_by_code(self, tenant_id: UUID, code: str) -> Optional[Branch]:
        try:
            return Branch.objects.get(tenant_id=tenant_id, code=code, deleted_at__isnull=True)
        except Branch.DoesNotExist:
            return None

    def save(self, branch: Branch) -> Branch:
        branch.save()
        return branch