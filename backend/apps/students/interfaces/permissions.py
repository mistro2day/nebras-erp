from rest_framework import permissions

class StudentPermission(permissions.BasePermission):
    """
    نظام الصلاحيات المخصص لموديول الطلاب بناءً على RBAC
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # الصلاحيات الافتراضية بناءً على الأسلوب (Method)
        if request.method in permissions.SAFE_METHODS:
            return request.user.has_perm('students.view') or request.user.has_perm('students.view_student')
            
        if request.method == 'POST':
            return request.user.has_perm('students.create') or request.user.has_perm('students.add_student')
            
        if request.method in ['PUT', 'PATCH']:
            return request.user.has_perm('students.update') or request.user.has_perm('students.change_student')
            
        if request.method == 'DELETE':
            return request.user.has_perm('students.delete') or request.user.has_perm('students.delete_student')
            
        return True

    def has_object_permission(self, request, view, obj):
        # عزل المستأجرين
        if hasattr(request, 'tenant') and request.tenant:
            return obj.tenant_id == request.tenant.id
        return True