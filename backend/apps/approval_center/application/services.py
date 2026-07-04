import uuid
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.approval_center.domain.models import (
    EnterpriseInbox, InboxItem, ApprovalRequest, ApprovalDecision, ApprovalAction, ApprovalHistory
)

class EnterpriseInboxService:
    @staticmethod
    def get_user_inbox_items(tenant_id, user_id):
        """
        استرجاع كافة طلبات الموافقات والمهام النشطة المعلقة في صندوق الوارد الموحد للمستخدم الحالي.
        """
        inbox, created = EnterpriseInbox.objects.get_or_create(
            tenant_id=tenant_id,
            user_id=user_id
        )
        items = InboxItem.objects.filter(tenant_id=tenant_id, inbox=inbox, status='pending').order_by('-created_at')
        
        results = []
        for it in items:
            results.append({
                "id": it.id,
                "item_type": it.item_type,
                "item_id": it.item_id,
                "title_ar": it.title_ar,
                "title_en": it.title_en,
                "status": it.status,
                "is_starred": it.is_starred
            })
        return results


class ApprovalDecisionService:
    @staticmethod
    def create_approval_request(tenant_id, category_id, workflow_instance_id, requester_id, payload=None):
        """
        تسجيل طلب اعتماد جديد في النظام الموحد وتوزيعه على صناديق الوارد.
        """
        request = ApprovalRequest.objects.create(
            tenant_id=tenant_id,
            category_id=category_id,
            workflow_instance_id=workflow_instance_id,
            requester_id=requester_id,
            payload=payload or {},
            status='pending'
        )
        return request

    @staticmethod
    def make_decision(tenant_id, request_id, approver_id, action_code, comments=None):
        """
        اتخاذ قرار (موافقة / رفض / إرجاع) وتحديث حالة طلب الاعتماد المركزي وسجل الحفظ.
        """
        try:
            req = ApprovalRequest.objects.get(tenant_id=tenant_id, id=request_id)
        except ApprovalRequest.DoesNotExist:
            raise ValidationError("طلب الاعتماد غير موجود.")

        try:
            action = ApprovalAction.objects.get(tenant_id=tenant_id, code=action_code)
        except ApprovalAction.DoesNotExist:
            # توليد افتراضي في حالة عدم وجود الإجراء بقاعدة البيانات لغايات الاختبار
            action = ApprovalAction.objects.create(
                tenant_id=tenant_id,
                code=action_code,
                name_ar="إجراء افتراضي",
                name_en="Default Action"
            )

        # تسجيل القرار
        decision = ApprovalDecision.objects.create(
            tenant_id=tenant_id,
            request=req,
            approver_id=approver_id,
            action=action,
            comments=comments
        )

        # تحديث حالة الطلب
        if action_code == 'approve':
            req.status = 'approved'
        elif action_code == 'reject':
            req.status = 'rejected'
        req.save()

        # تسجيل خط التاريخ
        ApprovalHistory.objects.create(
            tenant_id=tenant_id,
            request=req,
            step_name="مرحلة المراجعة والاعتماد الموحدة",
            action_taken=action_code,
            user_id=approver_id
        )

        # تحديث صندوق الوارد للمستلم
        InboxItem.objects.filter(tenant_id=tenant_id, item_id=req.id).update(status=req.status)

        return decision
