from rest_framework import permissions

class StudentPermission(permissions.BasePermission):
    """
    نظام الصلاحيات المخصص لموديول الطلاب بناءً على RBAC مع العزل الصارم للمستأجرين
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # المشرف الفائق للنظام وموظفو النظام العام يملكون الصلاحية تلقائياً
        if request.user.is_superuser or getattr(request.user, 'is_staff', False):
            return True

        # السماح بالقراءة وعمليات المعاينة والفحص الآمن بالذاكرة لجميع مستخدمي المدرسة المصادق عليهم
        safe_actions = ['validate_import', 'download_template', 'bulk_export', 'list', 'retrieve', 'timeline', 'dashboard_widgets']
        if request.method in permissions.SAFE_METHODS or getattr(view, 'action', None) in safe_actions:
            return True

        # استخراج معرف المستأجر من الترويسة أو من الجلسة أو استنتاجه من أدوار المستخدم
        tenant_id = None
        if hasattr(request, 'tenant') and request.tenant and hasattr(request.tenant, 'id'):
            tenant_id = request.tenant.id
        elif hasattr(request, 'tenant_id') and request.tenant_id:
            tenant_id = request.tenant_id
        elif request.user and getattr(request.user, 'tenant_id', None):
            tenant_id = request.user.tenant_id

        from apps.identity.domain.rbac import UserRole, RolePermission

        if not tenant_id:
            first_ur = UserRole.objects.filter(user=request.user).first()
            if first_ur and first_ur.tenant_id:
                tenant_id = first_ur.tenant_id

        if tenant_id:
            # التحقق مما إذا كان المستخدم يحمل دور مدير المدرسة (School Administrator) لمدرسته الحالية فقط
            is_school_admin = UserRole.objects.filter(
                user=request.user,
                tenant_id=tenant_id,
                role__code__in=['administrator', 'school_admin', 'principal', 'admin']
            ).exists()
            if is_school_admin:
                return True

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
        # عزل المستأجرين الصارم: لا يمكن تعديل أو الوصول لطالب يتبع لمستأجر آخر
        effective_tenant_id = getattr(request, 'tenant_id', None) or getattr(getattr(request, 'tenant', None), 'id', None)
        if not effective_tenant_id and request.user and request.user.is_authenticated:
            from apps.identity.domain.rbac import UserRole
            first_ur = UserRole.objects.filter(user=request.user).first()
            if first_ur:
                effective_tenant_id = first_ur.tenant_id

        if effective_tenant_id:
            return str(obj.tenant_id) == str(effective_tenant_id)
        return True