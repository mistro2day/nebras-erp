import uuid
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q, Count

from apps.approval_center.domain.models import (
    ApprovalCategory, EnterpriseInbox, InboxItem, ApprovalRequest, ApprovalAction,
    ApprovalDecision, ApprovalHistory, ApprovalComment, ApprovalAttachment, ApprovalRule,
    ApprovalStep, ApprovalAssignment, ApprovalEscalation,
    ApprovalDelegation, ApprovalReminder, ApprovalPriority, ApprovalTemplate,
    ApprovalConfiguration, ApprovalAudit, ApprovalNotification, ApprovalStatistics,
    ApprovalDashboard, SLAConfiguration, SLATracking, ApprovalOutcome
)

# تكاملات المنصة
from apps.workflow.services import WorkflowEngine
from apps.workflow.models import WorkflowState, WorkflowInstance
from apps.rules.application.services import RuleEvaluationService
from apps.configuration.application.services import FeatureFlagService
from apps.configuration.domain.models import FeatureFlag
from apps.communications.application.events import EventBusConsumer
from apps.document_management.application.services import DmsLinkService

# معرّف فاعل النظام الافتراضي (يُستخدم عند اتخاذ قرارات آلية بلا مستخدم بشري فعلي)
SYSTEM_ACTOR_ID = uuid.UUID(int=0)


# ============================================================
# صندوق الوارد الموحد — Enterprise Inbox
# ============================================================
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
                "is_starred": it.is_starred,
                "priority_code": it.priority_code,
            })
        return results

    @staticmethod
    def sync_inbox_item(tenant_id, request, user_id):
        """
        إنشاء أو تحديث عنصر صندوق الوارد الموحد الخاص بطلب اعتماد معين لدى مستخدم محدد.
        """
        inbox, _ = EnterpriseInbox.objects.get_or_create(tenant_id=tenant_id, user_id=user_id)
        title_ar = request.title_ar or request.category.name_ar
        title_en = request.title_en or request.category.name_en
        priority_code = request.priority.code if request.priority_id else None
        item, created = InboxItem.objects.get_or_create(
            tenant_id=tenant_id, inbox=inbox, item_type='approval', item_id=request.id,
            defaults={
                'title_ar': title_ar, 'title_en': title_en,
                'status': request.status, 'priority_code': priority_code,
            }
        )
        if not created:
            item.title_ar = title_ar
            item.title_en = title_en
            item.status = request.status
            item.priority_code = priority_code
            item.save(update_fields=['title_ar', 'title_en', 'status', 'priority_code'])
        return item

    @staticmethod
    def mark_read(tenant_id, item_id):
        return InboxItem.objects.filter(tenant_id=tenant_id, id=item_id).update(status='read')

    @staticmethod
    def mark_unread(tenant_id, item_id):
        return InboxItem.objects.filter(tenant_id=tenant_id, id=item_id).update(status='pending')

    @staticmethod
    def toggle_star(tenant_id, item_id):
        item = InboxItem.objects.get(tenant_id=tenant_id, id=item_id)
        item.is_starred = not item.is_starred
        item.save(update_fields=['is_starred'])
        return item

    @staticmethod
    def archive_item(tenant_id, item_id):
        return InboxItem.objects.filter(tenant_id=tenant_id, id=item_id).update(status='archived')

    @staticmethod
    def bulk_update_status(tenant_id, item_ids, status):
        return InboxItem.objects.filter(tenant_id=tenant_id, id__in=item_ids).update(status=status)


# ============================================================
# دورة حياة طلب الاعتماد — Approval Request Lifecycle
# ============================================================
class ApprovalRequestService:
    @staticmethod
    def create_request(tenant_id, category_id, requester_id, title_ar='', title_en='',
                        payload=None, priority_code=None, assignee_id=None, user_id=None):
        """
        تسجيل طلب اعتماد جديد، وربطه بمسار عمل حقيقي في محرك سير العمل المركزي،
        وتوزيعه على صندوق الوارد الموحد، وتمريره عبر التوجيه الآلي لمحرك القواعد.
        """
        from apps.approval_center.infrastructure.workflow_config import setup_approval_workflow

        try:
            category = ApprovalCategory.objects.get(tenant_id=tenant_id, id=category_id)
        except ApprovalCategory.DoesNotExist:
            raise ValidationError("فئة الاعتماد المحددة غير موجودة.")

        workflow = setup_approval_workflow(tenant_id)
        initial_state = WorkflowState.objects.get(workflow=workflow, is_initial=True)

        priority = ApprovalPriority.objects.filter(tenant_id=tenant_id, code=priority_code).first() if priority_code else None
        first_step = ApprovalStep.objects.filter(tenant_id=tenant_id, category=category).order_by('step_number').first()

        request = ApprovalRequest.objects.create(
            tenant_id=tenant_id, category=category, requester_id=requester_id,
            title_ar=title_ar, title_en=title_en, payload=payload or {},
            priority=priority, current_step=first_step, status=initial_state.code,
        )

        instance = WorkflowInstance.objects.create(
            tenant_id=tenant_id, workflow=workflow, current_state=initial_state,
            content_type=ContentType.objects.get_for_model(ApprovalRequest), object_id=request.id,
        )
        request.workflow_instance_id = instance.id
        request.save(update_fields=['workflow_instance_id'])

        ApprovalHistory.objects.create(
            tenant_id=tenant_id, request=request, step_name='إنشاء الطلب',
            action_taken='submit', user_id=requester_id,
        )

        sla_config = SLAConfiguration.objects.filter(tenant_id=tenant_id, category=category).first()
        if sla_config:
            SLATrackingService.start_tracking(tenant_id, request, sla_config.limit_hours)

        if assignee_id:
            ApprovalAssignmentService.assign(tenant_id, request, assignee_id, assigned_by=user_id)
        else:
            EnterpriseInboxService.sync_inbox_item(tenant_id, request, requester_id)

        ApprovalRoutingService.route_request(tenant_id, request)

        try:
            EventBusConsumer.publish(
                tenant_id=tenant_id, event_type='ApprovalRequired', source_module='approval_center',
                event_data={'request_id': str(request.id), 'title_ar': title_ar or category.name_ar,
                            'category': category.code},
                created_by=user_id,
            )
        except Exception:
            pass

        ApprovalAuditService.log(tenant_id, user_id or requester_id, 'request_created',
                                  f"تم إنشاء طلب الاعتماد {request.id} في فئة {category.code}")
        return request

    @staticmethod
    def cancel_request(tenant_id, request_id, user_id, reason=None):
        try:
            req = ApprovalRequest.objects.get(tenant_id=tenant_id, id=request_id)
        except ApprovalRequest.DoesNotExist:
            raise ValidationError("طلب الاعتماد غير موجود.")

        if req.workflow_instance_id:
            try:
                instance = WorkflowEngine.trigger_transition(
                    instance_id=req.workflow_instance_id, action='cancel', user_id=user_id, comments=reason,
                )
                req.status = instance.current_state.code
            except ValidationError:
                req.status = 'cancelled'
        else:
            req.status = 'cancelled'
        req.save(update_fields=['status'])

        InboxItem.objects.filter(tenant_id=tenant_id, item_id=req.id).update(status=req.status)
        ApprovalAuditService.log(tenant_id, user_id, 'request_cancelled', reason or '')
        return req


class ApprovalDecisionService:
    @staticmethod
    def create_approval_request(tenant_id, category_id, workflow_instance_id, requester_id, payload=None):
        """
        محفوظة للتوافق الخلفي فقط — يُفضّل استخدام ApprovalRequestService.create_request
        الذي ينشئ مثيل مسار عمل حقيقياً بدلاً من استقبال معرف جاهز.
        """
        request = ApprovalRequest.objects.create(
            tenant_id=tenant_id, category_id=category_id, workflow_instance_id=workflow_instance_id,
            requester_id=requester_id, payload=payload or {}, status='pending',
        )
        return request

    @staticmethod
    def make_decision(tenant_id, request_id, approver_id, action_code, comments=None):
        """
        اتخاذ قرار (موافقة / رفض / إرجاع)، تنفيذ الانتقال في محرك سير العمل المركزي،
        وتحديث حالة طلب الاعتماد وسجل التاريخ والنتيجة النهائية.
        """
        try:
            req = ApprovalRequest.objects.get(tenant_id=tenant_id, id=request_id)
        except ApprovalRequest.DoesNotExist:
            raise ValidationError("طلب الاعتماد غير موجود.")

        action, _ = ApprovalAction.objects.get_or_create(
            tenant_id=tenant_id, code=action_code,
            defaults={'name_ar': action_code, 'name_en': action_code},
        )

        decision = ApprovalDecision.objects.create(
            tenant_id=tenant_id, request=req, approver_id=approver_id, action=action, comments=comments,
        )

        fallback_status = {'approve': 'approved', 'reject': 'rejected', 'return': 'returned'}.get(action_code)
        if req.workflow_instance_id:
            try:
                instance = WorkflowEngine.trigger_transition(
                    instance_id=req.workflow_instance_id, action=action_code, user_id=approver_id, comments=comments,
                )
                req.status = instance.current_state.code
            except ValidationError:
                if fallback_status:
                    req.status = fallback_status
        elif fallback_status:
            req.status = fallback_status
        req.save(update_fields=['status'])

        ApprovalHistory.objects.create(
            tenant_id=tenant_id, request=req, step_name="مرحلة المراجعة والاعتماد الموحدة",
            action_taken=action_code, user_id=approver_id,
        )

        if req.status in ('approved', 'rejected'):
            ApprovalOutcome.objects.update_or_create(
                tenant_id=tenant_id, request=req,
                defaults={'outcome_code': req.status, 'decided_by': approver_id, 'decided_at': timezone.now()},
            )
            event_type = 'ApprovalCompleted' if req.status == 'approved' else 'ApprovalRejected'
            try:
                EventBusConsumer.publish(
                    tenant_id=tenant_id, event_type=event_type, source_module='approval_center',
                    event_data={'request_id': str(req.id), 'status': req.status, 'comments': comments},
                    created_by=approver_id,
                )
            except Exception:
                pass

        InboxItem.objects.filter(tenant_id=tenant_id, item_id=req.id).update(status=req.status)
        ApprovalAuditService.log(tenant_id, approver_id, f'decision:{action_code}', comments or '')
        return decision


# ============================================================
# التوجيه الآلي عبر محرك القواعد — Rule-Based Routing
# ============================================================
class ApprovalRoutingService:
    @staticmethod
    def route_request(tenant_id, request):
        """
        فحص قواعد فئة الاعتماد المرتبطة بمحرك القواعد المركزي، وتنفيذ الاعتماد/الرفض/التنبيه
        الآلي عند تحقق الشروط (مثل حدود المبالغ لاعتماد آلي تحت سقف معين).
        """
        rules = ApprovalRule.objects.filter(tenant_id=tenant_id, category=request.category, rule_id__isnull=False)
        context_data = {'amount': request.payload.get('amount'), 'category_code': request.category.code}

        for rule in rules:
            result = RuleEvaluationService.evaluate_rule(rule.rule_id, context_data)
            if not result.get('is_matched'):
                continue
            for act in result.get('actions', []):
                action_type = act.get('action_type')
                if action_type == 'allow':
                    ApprovalDecisionService.make_decision(
                        tenant_id, request.id, SYSTEM_ACTOR_ID, 'approve',
                        comments='اعتماد آلي بواسطة محرك القواعد',
                    )
                elif action_type == 'deny':
                    ApprovalDecisionService.make_decision(
                        tenant_id, request.id, SYSTEM_ACTOR_ID, 'reject',
                        comments='رفض آلي بواسطة محرك القواعد',
                    )
                elif action_type == 'notify':
                    ApprovalNotificationService.notify_user(
                        tenant_id, request.requester_id,
                        f"تنبيه بخصوص طلب الاعتماد {request.id}", request_id=request.id,
                    )


class ApprovalAssignmentService:
    @staticmethod
    def assign(tenant_id, request, assigned_to, assigned_by=None):
        assignment = ApprovalAssignment.objects.create(tenant_id=tenant_id, request=request, assigned_to=assigned_to)
        EnterpriseInboxService.sync_inbox_item(tenant_id, request, assigned_to)
        ApprovalAuditService.log(tenant_id, assigned_by, 'request_assigned',
                                  f"تم تكليف {assigned_to} بطلب الاعتماد {request.id}")
        return assignment

    @staticmethod
    def reassign(tenant_id, assignment_id, new_assignee, assigned_by=None):
        assignment = ApprovalAssignment.objects.get(tenant_id=tenant_id, id=assignment_id)
        assignment.assigned_to = new_assignee
        assignment.save(update_fields=['assigned_to'])
        EnterpriseInboxService.sync_inbox_item(tenant_id, assignment.request, new_assignee)
        ApprovalAuditService.log(tenant_id, assigned_by, 'request_reassigned',
                                  f"تم إعادة تكليف الطلب {assignment.request_id} إلى {new_assignee}")
        return assignment


# ============================================================
# التفويض — Delegation
# ============================================================
class ApprovalDelegationService:
    @staticmethod
    def create_delegation(tenant_id, user_id, delegate_to_id, start_date, end_date,
                           category_id=None, department_id=None, reason=None):
        # لا يتم فرض بوابة الميزة إلا إذا كانت معرّفة فعلياً لهذا المستأجر، تفادياً لحظر التفويض
        # افتراضياً في المستأجرات التي لم تُهيّئ لوحة الميزات بعد
        flag_configured = FeatureFlag.objects.filter(
            tenant_id=tenant_id, code='approval_center.delegation_enabled'
        ).exists()
        if flag_configured and not FeatureFlagService.is_feature_enabled(
            tenant_id, 'approval_center.delegation_enabled', user_id
        ):
            raise ValidationError("خاصية تفويض الاعتمادات غير مفعّلة لهذا المستأجر.")

        overlapping = ApprovalDelegation.objects.filter(
            tenant_id=tenant_id, user_id=user_id, is_active=True,
            start_date__lte=end_date, end_date__gte=start_date,
        )
        if category_id:
            overlapping = overlapping.filter(category_id=category_id)
        if overlapping.exists():
            raise ValidationError("يوجد تفويض نشط متداخل مع هذه الفترة بالفعل.")

        delegation = ApprovalDelegation.objects.create(
            tenant_id=tenant_id, user_id=user_id, delegate_to_id=delegate_to_id,
            start_date=start_date, end_date=end_date, category_id=category_id,
            department_id=department_id, reason=reason,
        )
        try:
            EventBusConsumer.publish(
                tenant_id=tenant_id, event_type='ApprovalDelegated', source_module='approval_center',
                event_data={'delegation_id': str(delegation.id), 'user_id': str(user_id),
                            'delegate_to_id': str(delegate_to_id)},
                created_by=user_id,
            )
        except Exception:
            pass
        ApprovalAuditService.log(tenant_id, user_id, 'delegation_created',
                                  f"تفويض من {user_id} إلى {delegate_to_id}")
        return delegation

    @staticmethod
    def get_active_delegate(tenant_id, user_id, category_id=None):
        now = timezone.now()
        qs = ApprovalDelegation.objects.filter(
            tenant_id=tenant_id, user_id=user_id, is_active=True,
            start_date__lte=now, end_date__gte=now,
        )
        if category_id:
            qs = qs.filter(Q(category_id=category_id) | Q(category__isnull=True))
        delegation = qs.first()
        return delegation.delegate_to_id if delegation else None

    @staticmethod
    def deactivate_delegation(tenant_id, delegation_id, user_id):
        delegation = ApprovalDelegation.objects.get(tenant_id=tenant_id, id=delegation_id)
        delegation.is_active = False
        delegation.save(update_fields=['is_active'])
        ApprovalAuditService.log(tenant_id, user_id, 'delegation_deactivated', str(delegation_id))
        return delegation


# ============================================================
# التصعيد — Escalation
# ============================================================
class ApprovalEscalationService:
    @staticmethod
    def escalate_request(tenant_id, request_id, original_approver_id, escalated_to_id, reason=None, user_id=None):
        try:
            req = ApprovalRequest.objects.get(tenant_id=tenant_id, id=request_id)
        except ApprovalRequest.DoesNotExist:
            raise ValidationError("طلب الاعتماد غير موجود.")

        last_level = ApprovalEscalation.objects.filter(
            tenant_id=tenant_id, request=req
        ).order_by('-escalation_level').first()
        next_level = (last_level.escalation_level + 1) if last_level else 1

        escalation = ApprovalEscalation.objects.create(
            tenant_id=tenant_id, request=req, original_approver_id=original_approver_id,
            escalated_to_id=escalated_to_id, escalation_level=next_level, reason=reason,
        )
        ApprovalAssignmentService.assign(tenant_id, req, escalated_to_id, assigned_by=user_id)

        if req.workflow_instance_id:
            try:
                instance = WorkflowEngine.trigger_transition(
                    instance_id=req.workflow_instance_id, action='escalate',
                    user_id=user_id or original_approver_id, comments=reason,
                )
                req.status = instance.current_state.code
                req.save(update_fields=['status'])
            except ValidationError:
                pass

        try:
            EventBusConsumer.publish(
                tenant_id=tenant_id, event_type='ApprovalEscalated', source_module='approval_center',
                event_data={'request_id': str(req.id), 'escalated_to_id': str(escalated_to_id), 'level': next_level},
                created_by=user_id,
            )
        except Exception:
            pass
        ApprovalAuditService.log(tenant_id, user_id, 'request_escalated',
                                  f"تصعيد الطلب {req.id} إلى {escalated_to_id}")
        return escalation

    @staticmethod
    def resolve_escalation(tenant_id, escalation_id, user_id):
        escalation = ApprovalEscalation.objects.get(tenant_id=tenant_id, id=escalation_id)
        escalation.resolved = True
        escalation.resolved_at = timezone.now()
        escalation.save(update_fields=['resolved', 'resolved_at'])
        ApprovalAuditService.log(tenant_id, user_id, 'escalation_resolved', str(escalation_id))
        return escalation

    @staticmethod
    def auto_escalate_overdue(tenant_id=None):
        """
        فحص كل تتبعات SLA المخالفة دون تصعيد نشط، وتصعيدها تلقائياً.
        ملاحظة: لا يوجد تسلسل هرمي للمدراء في هذا النظام بعد، لذا يُسجَّل التصعيد على نفس المُكلَّف
        الحالي مع رفع مستوى التصعيد، بينما يتولى حدث ApprovalEscalated توجيه التنبيه الفعلي عبر
        منصة الاتصالات إلى المستلمين المهيّئين تنظيمياً (مدراء/مشرفين) حسب إعدادات كل مستأجر.
        """
        breaches = SLATracking.objects.filter(is_violated=True)
        if tenant_id:
            breaches = breaches.filter(tenant_id=tenant_id)

        escalated = 0
        for tracking in breaches.select_related('request'):
            req = tracking.request
            if ApprovalEscalation.objects.filter(tenant_id=req.tenant_id, request=req, resolved=False).exists():
                continue
            assignment = ApprovalAssignment.objects.filter(
                tenant_id=req.tenant_id, request=req
            ).order_by('-assigned_at').first()
            current_holder = assignment.assigned_to if assignment else req.requester_id
            ApprovalEscalationService.escalate_request(
                req.tenant_id, req.id, current_holder, current_holder,
                reason='تصعيد آلي بسبب تجاوز مهلة اتفاقية مستوى الخدمة (SLA)',
            )
            escalated += 1
        return escalated


# ============================================================
# تتبع اتفاقية مستوى الخدمة — SLA Tracking
# ============================================================
class SLATrackingService:
    BUSINESS_START_HOUR = 9
    BUSINESS_END_HOUR = 17

    @classmethod
    def compute_due_at(cls, started_at, limit_hours, business_hours_only=False):
        if not business_hours_only:
            return started_at + timedelta(hours=limit_hours)

        remaining = timedelta(hours=limit_hours)
        current = started_at
        while remaining > timedelta(0):
            if current.weekday() >= 5:
                days_to_monday = 7 - current.weekday()
                current = (current + timedelta(days=days_to_monday)).replace(
                    hour=cls.BUSINESS_START_HOUR, minute=0, second=0, microsecond=0)
                continue
            if current.hour < cls.BUSINESS_START_HOUR:
                current = current.replace(hour=cls.BUSINESS_START_HOUR, minute=0, second=0, microsecond=0)
                continue
            if current.hour >= cls.BUSINESS_END_HOUR:
                current = (current + timedelta(days=1)).replace(
                    hour=cls.BUSINESS_START_HOUR, minute=0, second=0, microsecond=0)
                continue
            day_end = current.replace(hour=cls.BUSINESS_END_HOUR, minute=0, second=0, microsecond=0)
            slice_ = min(remaining, day_end - current)
            current += slice_
            remaining -= slice_
        return current

    @staticmethod
    def start_tracking(tenant_id, request, limit_hours, business_hours_only=False):
        started_at = timezone.now()
        due_at = SLATrackingService.compute_due_at(started_at, limit_hours, business_hours_only)
        warning_at = started_at + (due_at - started_at) * 0.8
        return SLATracking.objects.create(
            tenant_id=tenant_id, request=request, due_at=due_at, warning_at=warning_at,
            business_hours_only=business_hours_only,
        )

    @staticmethod
    def check_overdue(tenant_id=None):
        qs = SLATracking.objects.filter(is_violated=False, due_at__lt=timezone.now())
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        count = 0
        for tracking in qs.select_related('request'):
            tracking.is_violated = True
            tracking.violated_at = timezone.now()
            tracking.save(update_fields=['is_violated', 'violated_at'])
            try:
                EventBusConsumer.publish(
                    tenant_id=tracking.tenant_id, event_type='ApprovalOverdue', source_module='approval_center',
                    event_data={'request_id': str(tracking.request_id)},
                )
            except Exception:
                pass
            count += 1
        return count

    @staticmethod
    def check_warnings(tenant_id=None):
        now = timezone.now()
        qs = SLATracking.objects.filter(is_violated=False, warning_at__lte=now, due_at__gt=now)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        created = 0
        for tracking in qs.select_related('request'):
            already_pending = ApprovalReminder.objects.filter(
                tenant_id=tracking.tenant_id, request=tracking.request, is_sent=False
            ).exists()
            if not already_pending:
                ApprovalReminder.objects.create(
                    tenant_id=tracking.tenant_id, request=tracking.request, remind_at=now,
                    message=f"تنبيه: طلب الاعتماد {tracking.request_id} يقترب من انتهاء المهلة المحددة.",
                )
                created += 1
        return created


# ============================================================
# التعليقات والمرفقات — Comments & Attachments
# ============================================================
class ApprovalCollaborationService:
    @staticmethod
    def add_comment(tenant_id, request_id, user_id, comment):
        return ApprovalComment.objects.create(
            tenant_id=tenant_id, request_id=request_id, user_id=user_id, comment=comment,
        )

    @staticmethod
    def add_attachment(tenant_id, request_id, document_id):
        attachment = ApprovalAttachment.objects.create(
            tenant_id=tenant_id, request_id=request_id, document_id=document_id,
        )
        try:
            DmsLinkService.link_document(tenant_id, document_id, 'approval_request', request_id)
        except Exception:
            pass
        return attachment

    @staticmethod
    def list_attachments_with_documents(tenant_id, request_id):
        attachments = ApprovalAttachment.objects.filter(tenant_id=tenant_id, request_id=request_id)
        documents = {
            doc.id: doc for doc in DmsLinkService.get_entity_documents(tenant_id, 'approval_request', request_id)
        }
        results = []
        for att in attachments:
            doc = documents.get(att.document_id)
            results.append({
                'id': att.id,
                'document_id': att.document_id,
                'title': doc.title if doc else None,
                'file_size_bytes': doc.file_size_bytes if doc else None,
                'created_at': att.created_at,
            })
        return results


# ============================================================
# التحليلات والإحصاءات — Analytics & Statistics
# ============================================================
class ApprovalAnalyticsService:
    @staticmethod
    def get_dashboard_stats(tenant_id, user_id=None):
        requests_qs = ApprovalRequest.objects.filter(tenant_id=tenant_id)
        pending = requests_qs.filter(status='pending').count()
        approved = requests_qs.filter(status='approved').count()
        rejected = requests_qs.filter(status='rejected').count()
        overdue = SLATracking.objects.filter(tenant_id=tenant_id, is_violated=True).count()

        outcomes = ApprovalOutcome.objects.filter(
            tenant_id=tenant_id, decided_at__isnull=False
        ).select_related('request')
        durations = [
            (o.decided_at - o.request.created_at).total_seconds()
            for o in outcomes if o.request and o.request.created_at
        ]
        avg_seconds = int(sum(durations) / len(durations)) if durations else 0

        by_category = list(requests_qs.values('category__code').annotate(count=Count('id')))
        by_priority = list(
            requests_qs.exclude(priority__isnull=True).values('priority__code').annotate(count=Count('id'))
        )

        return {
            'pending': pending,
            'approved': approved,
            'rejected': rejected,
            'overdue': overdue,
            'avg_decision_seconds': avg_seconds,
            'by_category': by_category,
            'by_priority': by_priority,
        }

    @staticmethod
    def recalculate_statistics(tenant_id):
        stats_data = ApprovalAnalyticsService.get_dashboard_stats(tenant_id)
        stats, _ = ApprovalStatistics.objects.get_or_create(tenant_id=tenant_id)
        stats.total_processed = stats_data['approved'] + stats_data['rejected']
        stats.avg_decision_seconds = stats_data['avg_decision_seconds']
        stats.save(update_fields=['total_processed', 'avg_decision_seconds'])
        return stats

    @staticmethod
    def get_user_dashboard_config(tenant_id, user_id):
        dashboard, _ = ApprovalDashboard.objects.get_or_create(tenant_id=tenant_id, user_id=user_id)
        return dashboard

    @staticmethod
    def save_user_dashboard_config(tenant_id, user_id, config_json):
        dashboard, _ = ApprovalDashboard.objects.get_or_create(tenant_id=tenant_id, user_id=user_id)
        dashboard.config_json = config_json
        dashboard.save(update_fields=['config_json'])
        return dashboard


# ============================================================
# سجل التدقيق — Audit
# ============================================================
class ApprovalAuditService:
    @staticmethod
    def log(tenant_id, user_id, action, details=''):
        return ApprovalAudit.objects.create(
            tenant_id=tenant_id, user_id=user_id, action=action, details=details or '',
        )


# ============================================================
# الإشعارات — Notifications
# ============================================================
class ApprovalNotificationService:
    @staticmethod
    def notify_user(tenant_id, user_id, message, request_id=None, link=None):
        return ApprovalNotification.objects.create(
            tenant_id=tenant_id, user_id=user_id, message=message, request_id=request_id, link=link,
        )

    @staticmethod
    def mark_read(tenant_id, notification_id):
        return ApprovalNotification.objects.filter(tenant_id=tenant_id, id=notification_id).update(is_read=True)

    @staticmethod
    def unread_count(tenant_id, user_id):
        return ApprovalNotification.objects.filter(tenant_id=tenant_id, user_id=user_id, is_read=False).count()


# ============================================================
# القوالب والتهيئة المحلية — Templates & Local Configuration
# ============================================================
class ApprovalTemplateService:
    @staticmethod
    def apply_template(tenant_id, template_id, overrides=None):
        template = ApprovalTemplate.objects.get(tenant_id=tenant_id, id=template_id)
        payload = dict(template.template_json or {})
        payload.update(overrides or {})
        return payload

    @staticmethod
    def get_config(tenant_id, key, default=None):
        config = ApprovalConfiguration.objects.filter(tenant_id=tenant_id, key=key).first()
        return config.value if config else default

    @staticmethod
    def set_config(tenant_id, key, value):
        config, created = ApprovalConfiguration.objects.get_or_create(
            tenant_id=tenant_id, key=key, defaults={'value': value},
        )
        if not created and config.value != value:
            config.value = value
            config.save(update_fields=['value'])
        return config
