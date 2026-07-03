from rest_framework import permissions

class PlatformPermission(permissions.BasePermission):
    """
    نظام الصلاحيات لمشرفي النظام ومسؤولي البنية التحتية platform
    """
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # صلاحية الإدارة أو العرض العام
        return (
            request.user.has_perm('platform.manage') or 
            request.user.has_perm('platform.view') or
            request.user.has_perm('platform.audit') or
            request.user.has_perm('platform.configuration')
        )