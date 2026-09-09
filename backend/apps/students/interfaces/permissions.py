from rest_framework import permissions

class StudentPermission(permissions.BasePermission):
    """
    نظام الصلاحيات المخصص لموديول الطلاب بناءً على RBAC
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # المشرف الفائق للنظام وموظفو النظام يملكون الصلاحية تلقائياً
        if request.user.is_superuser or getattr(request.user, 'is_staff', False):
            return True

        # السماح بالقراءة لجميع مستخدمي المدرسة المصادق عليهم
        if request.method in permissions.SAFE_METHODS:
            return True

        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        if tenant_id:
            from apps.identity.domain.rbac import UserRole, RolePermission
            role_ids = list(UserRole.objects.filter(user=request.user, tenant_id=tenant_id).values_list('role_id', flat=True))
            if role_ids:
                if request.method == 'POST':
                    return RolePermission.objects.filter(role_id__in=role_ids, permission__code__in=['students:create', 'students.create']).exists() or request.user.has_perm('students.create')
                if request.method in ['PUT', 'PATCH']:
                    return RolePermission.objects.filter(role_id__in=role_ids, permission__code__in=['students:update', 'students.update']).exists() or request.user.has_perm('students.update')
                if request.method == 'DELETE':
                    return RolePermission.objects.filter(role_id__in=role_ids, permission__code__in=['students:delete', 'students.delete']).exists() or request.user.has_perm('students.delete')

        # السماح بالعمليات لباقي الحالات إن لم تكن هناك قيود صريحة
        return True

    def has_object_permission(self, request, view, obj):
        # عزل المستأجرين
        if hasattr(request, 'tenant') and request.tenant:
            return obj.tenant_id == request.tenant.id
        return True