from rest_framework import permissions

class TenantPermission(permissions.BasePermission):
    """
    صلاحية التحقق من عزل المستأجر وصلاحيات المستخدم
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # يجب توفر المستأجر في الطلب
        if not hasattr(request, 'tenant') or not request.tenant:
            return False
            
        return True


class RolePermission(permissions.BasePermission):
    """
    صلاحية التحقق من الأدوار والمجموعات (Role-Based Access Control)
    """
    def __init__(self, required_roles: list[str]):
        self.required_roles = required_roles

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # التحقق من أن المستخدم لديه أحد الأدوار المطلوبة
        user_roles = request.user.groups.values_list('name', flat=True)
        return any(role in user_roles for role in self.required_roles)