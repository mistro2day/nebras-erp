from rest_framework.permissions import BasePermission, SAFE_METHODS
from apps.identity.authorization import HasPermission
from apps.approval_center.application.services import ApprovalDelegationService
from apps.approval_center.domain.models import ApprovalAssignment


class TenantHeaderRequired(BasePermission):
    """
    بوابة عزل المستأجرين — رفض أي طلب كتابة لا يحمل ترويسة X-Tenant-ID صراحة.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return bool(request.headers.get('X-Tenant-ID'))


class CanManageApprovalConfig(BasePermission):
    """
    صلاحية إدارة عناصر التصنيف والتهيئة (الفئات، الأولويات، القواعد، القوالب، إعدادات SLA).
    القراءة متاحة لأي مستخدم مصادَق عليه ضمن المستأجر؛ الكتابة تتطلب الصلاحية الإدارية الصريحة.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return HasPermission('approval_center:config:manage').has_permission(request, view)


class CanDecide(BasePermission):
    """
    السماح باتخاذ قرار اعتماد إذا كان المستخدم يملك صلاحية القرار المباشرة، أو كان هو
    المُكلَّف الحالي بالطلب، أو كان مفوَّضاً حالياً من قبل المُكلَّف الحالي.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return True

    def has_object_permission(self, request, view, obj):
        guard = HasPermission('approval_center:requests:decide')
        if guard.has_permission(request, view):
            return True

        tenant_id = request.headers.get('X-Tenant-ID')
        user_id = getattr(request.user, 'id', None)
        request_obj = obj if hasattr(obj, 'category_id') else getattr(obj, 'request', None)
        if request_obj is None or not tenant_id or not user_id:
            return False

        if ApprovalAssignment.objects.filter(
            tenant_id=tenant_id, request=request_obj, assigned_to=user_id
        ).exists():
            return True

        assignment = ApprovalAssignment.objects.filter(
            tenant_id=tenant_id, request=request_obj
        ).order_by('-assigned_at').first()
        if assignment:
            delegate_id = ApprovalDelegationService.get_active_delegate(
                tenant_id, assignment.assigned_to, request_obj.category_id
            )
            if delegate_id and str(delegate_id) == str(user_id):
                return True
        return False


class CanEscalate(BasePermission):
    """صلاحية إدارة عمليات التصعيد (تصعيد/حل). القراءة متاحة للجميع، الكتابة تتطلب الصلاحية."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return HasPermission('approval_center:escalations:manage').has_permission(request, view)


class CanDelegate(BasePermission):
    """
    التفويض خدمة ذاتية: يمكن لأي مستخدم مصادَق عليه تفويض اعتماداته الخاصة؛ إدارة تفويضات
    الآخرين تتطلب صلاحية إدارية صريحة.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user_id = getattr(request.user, 'id', None)
        if user_id and str(obj.user_id) == str(user_id):
            return True
        guard = HasPermission('approval_center:delegations:manage')
        return guard.has_permission(request, view)
