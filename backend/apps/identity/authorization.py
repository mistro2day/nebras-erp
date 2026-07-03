from rest_framework import permissions
from apps.identity.domain.rbac import UserRole, RolePermission

class HasPermission(permissions.BasePermission):
    """
    فئة تحقق أمني ديناميكية مخصصة (Custom Permission Guard)
    تتحقق من امتلاك المستخدم للصلاحية المطلوبة على مستوى المستأجر الحالي
    """
    def __init__(self, permission_code: str):
        self.permission_code = permission_code

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # المشرف الفائق للنظام يملك كامل الصلاحيات تلقائياً
        if request.user.is_superuser:
            return True

        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        if not tenant_id:
            return False

        # جلب الصلاحيات الفعلية الفعالة للمستخدم الحالي
        user_roles = UserRole.objects.filter(user=request.user, tenant_id=tenant_id)
        role_ids = [ur.role_id for ur in user_roles]

        return RolePermission.objects.filter(
            role_id__in=role_ids,
            permission__code=self.permission_code
        ).exists()