from abc import ABC, abstractmethod
from typing import List, Optional
from apps.identity.domain.models import User, PasswordHistory
from apps.identity.domain.rbac import Role, Permission, UserRole
from apps.identity.domain.sessions import UserSession
from apps.identity.domain.user_assignment import UserAssignment
from uuid import UUID

class IUserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: UUID) -> Optional[User]:
        pass

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    def save(self, user: User) -> User:
        pass


class IRoleRepository(ABC):
    @abstractmethod
    def get_by_id(self, role_id: UUID) -> Optional[Role]:
        pass

    @abstractmethod
    def get_by_code(self, tenant_id: UUID, code: str) -> Optional[Role]:
        pass

    @abstractmethod
    def list_roles(self, tenant_id: UUID) -> List[Role]:
        pass

    @abstractmethod
    def save(self, role: Role) -> Role:
        pass


class DjangoUserRepository(IUserRepository):
    def get_by_id(self, user_id: UUID) -> Optional[User]:
        try:
            return User.objects.get(id=user_id, deleted_at__isnull=True)
        except User.DoesNotExist:
            return None

    def get_by_email(self, email: str) -> Optional[User]:
        try:
            return User.objects.get(email=email, deleted_at__isnull=True)
        except User.DoesNotExist:
            return None

    def save(self, user: User) -> User:
        user.save()
        return user


class DjangoRoleRepository(IRoleRepository):
    def get_by_id(self, role_id: UUID) -> Optional[Role]:
        try:
            return Role.objects.get(id=role_id, deleted_at__isnull=True)
        except Role.DoesNotExist:
            return None

    def get_by_code(self, tenant_id: UUID, code: str) -> Optional[Role]:
        try:
            return Role.objects.get(tenant_id=tenant_id, code=code, deleted_at__isnull=True)
        except Role.DoesNotExist:
            return None

    def list_roles(self, tenant_id: UUID) -> List[Role]:
        return list(Role.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True))

    def save(self, role: Role) -> Role:
        role.save()
        return role