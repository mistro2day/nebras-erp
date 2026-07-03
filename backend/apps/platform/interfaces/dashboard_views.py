from rest_framework import viewsets, permissions
from rest_framework.response import Response
from apps.common.responses import StandardResponse
from apps.students.domain.models import Student
from apps.admissions.domain.models import Applicant
from apps.organization.domain.models import Branch
from apps.platform.domain.models import AuditLog, Notification
from django.db.models import Count

class ERPDashboardViewSet(viewsets.ViewSet):
    """
    واجهة البيانات الشاملة للوحة التحكم المركزية للـ ERP
    تجمع المؤشرات من مختلف التطبيقات بشكل موحد وآمن للمستأجر
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        # 1. إحصائيات الطلاب
        student_qs = Student.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            student_qs = student_qs.filter(tenant_id=tenant_id)
        
        total_students = student_qs.count()
        active_students = student_qs.filter(status='active').count()
        
        # 2. إحصائيات المتقدمين والقبول
        applicant_qs = Applicant.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            applicant_qs = applicant_qs.filter(tenant_id=tenant_id)
            
        total_applicants = applicant_qs.count()
        pending_applicants = applicant_qs.filter(status='pending').count()
        
        # 3. إحصائيات الفروع والعمليات
        branch_qs = Branch.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            branch_qs = branch_qs.filter(tenant_id=tenant_id)
        total_branches = branch_qs.count()

        # 4. سجلات التدقيق والتنبيهات
        audit_qs = AuditLog.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            audit_qs = audit_qs.filter(tenant_id=tenant_id)
        latest_activities = list(audit_qs.order_by('-created_at')[:5].values('action', 'entity_name', 'created_at'))

        # 5. التنبيهات غير المقروءة
        notif_qs = Notification.objects.filter(deleted_at__isnull=True)
        if tenant_id:
            notif_qs = notif_qs.filter(tenant_id=tenant_id)
        unread_notifications = notif_qs.filter(status='pending').count()

        data = {
            'students': {
                'total': total_students,
                'active': active_students,
            },
            'applicants': {
                'total': total_applicants,
                'pending': pending_applicants,
            },
            'branches': {
                'total': total_branches,
            },
            'notifications': {
                'unread': unread_notifications,
            },
            'latestActivities': latest_activities
        }

        return StandardResponse(data, message="تم جلب إحصائيات المنصة بنجاح.")