from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.approval_center.domain.models import (
    ApprovalCategory, EnterpriseInbox, InboxItem, ApprovalRequest, ApprovalAction,
    ApprovalDecision, ApprovalHistory, ApprovalComment, ApprovalAttachment, ApprovalRule,
    ApprovalStep, ApprovalGroup, ApprovalQueue, ApprovalAssignment, ApprovalEscalation,
    ApprovalDelegation, ApprovalReminder, ApprovalPriority, ApprovalTemplate,
    ApprovalConfiguration, ApprovalAudit, ApprovalNotification, ApprovalStatistics,
    ApprovalDashboard, SLAConfiguration, SLATracking, ApprovalDeadline, ApprovalOutcome
)
from apps.approval_center.interfaces.serializers import (
    ApprovalCategorySerializer, ApprovalActionSerializer, ApprovalPrioritySerializer,
    ApprovalGroupSerializer, ApprovalQueueSerializer, ApprovalStepSerializer, ApprovalRuleSerializer,
    ApprovalTemplateSerializer, ApprovalConfigurationSerializer, SLAConfigurationSerializer,
    EnterpriseInboxSerializer, InboxItemSerializer,
    ApprovalRequestSerializer, ApprovalDecisionSerializer, ApprovalHistorySerializer,
    ApprovalCommentSerializer, ApprovalAttachmentSerializer, ApprovalAssignmentSerializer,
    ApprovalOutcomeSerializer, ApprovalDelegationSerializer, ApprovalEscalationSerializer,
    SLATrackingSerializer, ApprovalDeadlineSerializer, ApprovalReminderSerializer,
    ApprovalNotificationSerializer, ApprovalAuditSerializer, ApprovalStatisticsSerializer,
    ApprovalDashboardSerializer,
)
from apps.approval_center.interfaces.permissions import (
    TenantHeaderRequired, CanManageApprovalConfig, CanDecide, CanEscalate, CanDelegate,
)
from apps.approval_center.application.services import (
    EnterpriseInboxService, ApprovalRequestService, ApprovalDecisionService,
    ApprovalAssignmentService, ApprovalDelegationService, ApprovalEscalationService, SLATrackingService,
    ApprovalCollaborationService, ApprovalAnalyticsService, ApprovalNotificationService,
    ApprovalTemplateService,
)


class TenantScopedViewSetMixin:
    permission_classes = [IsAuthenticated, TenantHeaderRequired]

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        return qs.filter(tenant_id=tenant_id) if tenant_id else qs

    def perform_create(self, serializer):
        serializer.save(tenant_id=self.request.headers.get('X-Tenant-ID'))


def _validation_error_response(exc):
    return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


# ============================================================
# التصنيف والتهيئة — Taxonomy & Configuration
# ============================================================
class ApprovalCategoryViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalCategorySerializer
    queryset = ApprovalCategory.objects.all()


class ApprovalActionViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalActionSerializer
    queryset = ApprovalAction.objects.all()


class ApprovalPriorityViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalPrioritySerializer
    queryset = ApprovalPriority.objects.all()


class ApprovalGroupViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalGroupSerializer
    queryset = ApprovalGroup.objects.all()


class ApprovalQueueViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalQueueSerializer
    queryset = ApprovalQueue.objects.all()


class ApprovalStepViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalStepSerializer
    queryset = ApprovalStep.objects.all()


class ApprovalRuleViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalRuleSerializer
    queryset = ApprovalRule.objects.all()


class ApprovalTemplateViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalTemplateSerializer
    queryset = ApprovalTemplate.objects.all()

    @action(detail=True, methods=['post'], url_path='apply')
    def apply(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            payload = ApprovalTemplateService.apply_template(tenant_id, pk, request.data.get('overrides'))
        except ApprovalTemplate.DoesNotExist:
            return Response({'detail': 'القالب غير موجود.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(payload, status=status.HTTP_200_OK)


class ApprovalConfigurationViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = ApprovalConfigurationSerializer
    queryset = ApprovalConfiguration.objects.all()


class SLAConfigurationViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanManageApprovalConfig]
    serializer_class = SLAConfigurationSerializer
    queryset = SLAConfiguration.objects.all()


# ============================================================
# صندوق الوارد الموحد — Enterprise Inbox
# ============================================================
class EnterpriseInboxViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = EnterpriseInboxSerializer
    queryset = EnterpriseInbox.objects.all()


class InboxItemViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = InboxItemSerializer
    queryset = InboxItem.objects.all()

    @action(detail=False, methods=['get'], url_path='my-items')
    def my_items(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        items = EnterpriseInboxService.get_user_inbox_items(tenant_id, request.user.id)
        return Response(items, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        EnterpriseInboxService.mark_read(request.headers.get('X-Tenant-ID'), pk)
        return Response({'status': 'read'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-unread')
    def mark_unread(self, request, pk=None):
        EnterpriseInboxService.mark_unread(request.headers.get('X-Tenant-ID'), pk)
        return Response({'status': 'pending'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='toggle-star')
    def toggle_star(self, request, pk=None):
        item = EnterpriseInboxService.toggle_star(request.headers.get('X-Tenant-ID'), pk)
        return Response(InboxItemSerializer(item).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        EnterpriseInboxService.archive_item(request.headers.get('X-Tenant-ID'), pk)
        return Response({'status': 'archived'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-star')
    def bulk_star(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        for item_id in request.data.get('item_ids', []):
            EnterpriseInboxService.toggle_star(tenant_id, item_id)
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-archive')
    def bulk_archive(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        count = EnterpriseInboxService.bulk_update_status(tenant_id, request.data.get('item_ids', []), 'archived')
        return Response({'updated': count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-read')
    def bulk_read(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        count = EnterpriseInboxService.bulk_update_status(tenant_id, request.data.get('item_ids', []), 'read')
        return Response({'updated': count}, status=status.HTTP_200_OK)


# ============================================================
# دورة حياة طلب الاعتماد — Lifecycle
# ============================================================
class ApprovalRequestViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalRequestSerializer
    queryset = ApprovalRequest.objects.all()

    def create(self, request, *args, **kwargs):
        tenant_id = request.headers.get('X-Tenant-ID')
        data = request.data
        try:
            req = ApprovalRequestService.create_request(
                tenant_id=tenant_id,
                category_id=data.get('category'),
                requester_id=data.get('requester_id') or request.user.id,
                title_ar=data.get('title_ar', ''),
                title_en=data.get('title_en', ''),
                payload=data.get('payload'),
                priority_code=data.get('priority_code'),
                assignee_id=data.get('assignee_id'),
                user_id=request.user.id,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)
        return Response(ApprovalRequestSerializer(req).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='decision',
            permission_classes=[IsAuthenticated, TenantHeaderRequired, CanDecide])
    def make_decision(self, request, pk=None):
        action_code = request.data.get('action')
        comments = request.data.get('comments', '')
        if not action_code:
            return Response({"detail": "حقل الإجراء action مطلوب."}, status=status.HTTP_400_BAD_REQUEST)

        self.get_object()  # يفعّل فحص الصلاحيات على مستوى الكائن عبر CanDecide
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            decision = ApprovalDecisionService.make_decision(tenant_id, pk, request.user.id, action_code, comments)
        except ValidationError as exc:
            return _validation_error_response(exc)
        return Response(ApprovalDecisionSerializer(decision).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-approve')
    def bulk_approve(self, request):
        return self._bulk_decide(request, 'approve')

    @action(detail=False, methods=['post'], url_path='bulk-reject')
    def bulk_reject(self, request):
        return self._bulk_decide(request, 'reject')

    def _bulk_decide(self, request, action_code):
        tenant_id = request.headers.get('X-Tenant-ID')
        comments = request.data.get('comments', '')
        results = []
        for request_id in request.data.get('request_ids', []):
            try:
                decision = ApprovalDecisionService.make_decision(
                    tenant_id, request_id, request.user.id, action_code, comments)
                results.append({'request_id': request_id, 'success': True, 'decision_id': decision.id})
            except ValidationError as exc:
                results.append({'request_id': request_id, 'success': False, 'error': str(exc)})
        return Response({'results': results}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-delegate')
    def bulk_delegate(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        delegate_to_id = request.data.get('delegate_to_id')
        if not delegate_to_id:
            return Response({'detail': 'الحقل delegate_to_id مطلوب.'}, status=status.HTTP_400_BAD_REQUEST)
        updated = 0
        for request_id in request.data.get('request_ids', []):
            try:
                req = ApprovalRequest.objects.get(tenant_id=tenant_id, id=request_id)
            except ApprovalRequest.DoesNotExist:
                continue
            ApprovalAssignmentService.assign(tenant_id, req, delegate_to_id, assigned_by=request.user.id)
            updated += 1
        return Response({'updated': updated}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='sla-status')
    def sla_status(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        tracking = SLATracking.objects.filter(
            tenant_id=tenant_id, request_id=pk).order_by('-created_at').first()
        if not tracking:
            return Response({'detail': 'لا يوجد تتبع اتفاقية مستوى خدمة لهذا الطلب.'},
                             status=status.HTTP_404_NOT_FOUND)
        return Response(SLATrackingSerializer(tracking).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='timeline')
    def timeline(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        history = ApprovalHistory.objects.filter(tenant_id=tenant_id, request_id=pk).order_by('timestamp')
        return Response(ApprovalHistorySerializer(history, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def dashboard_stats(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        stats = ApprovalAnalyticsService.get_dashboard_stats(tenant_id, request.user.id)
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            req = ApprovalRequestService.cancel_request(tenant_id, pk, request.user.id, request.data.get('reason'))
        except ValidationError as exc:
            return _validation_error_response(exc)
        return Response(ApprovalRequestSerializer(req).data, status=status.HTTP_200_OK)


class ApprovalDecisionViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalDecisionSerializer
    queryset = ApprovalDecision.objects.all()


class ApprovalHistoryViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalHistorySerializer
    queryset = ApprovalHistory.objects.all()


class ApprovalCommentViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalCommentSerializer
    queryset = ApprovalComment.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        request_id = self.request.query_params.get('request')
        return qs.filter(request_id=request_id) if request_id else qs

    def create(self, request, *args, **kwargs):
        tenant_id = request.headers.get('X-Tenant-ID')
        comment = ApprovalCollaborationService.add_comment(
            tenant_id, request.data.get('request'), request.user.id, request.data.get('comment', ''),
        )
        return Response(ApprovalCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class ApprovalAttachmentViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalAttachmentSerializer
    queryset = ApprovalAttachment.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        request_id = self.request.query_params.get('request')
        return qs.filter(request_id=request_id) if request_id else qs

    def create(self, request, *args, **kwargs):
        tenant_id = request.headers.get('X-Tenant-ID')
        attachment = ApprovalCollaborationService.add_attachment(
            tenant_id, request.data.get('request'), request.data.get('document_id'),
        )
        return Response(ApprovalAttachmentSerializer(attachment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='with-documents')
    def with_documents(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        request_id = request.query_params.get('request')
        results = ApprovalCollaborationService.list_attachments_with_documents(tenant_id, request_id)
        return Response(results, status=status.HTTP_200_OK)


class ApprovalAssignmentViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalAssignmentSerializer
    queryset = ApprovalAssignment.objects.all()

    @action(detail=True, methods=['post'], url_path='reassign')
    def reassign(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        new_assignee = request.data.get('assigned_to')
        assignment = ApprovalAssignmentService.reassign(tenant_id, pk, new_assignee, assigned_by=request.user.id)
        return Response(ApprovalAssignmentSerializer(assignment).data, status=status.HTTP_200_OK)


class ApprovalOutcomeViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalOutcomeSerializer
    queryset = ApprovalOutcome.objects.all()


# ============================================================
# التفويض والتصعيد — Delegation & Escalation
# ============================================================
class ApprovalDelegationViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalDelegationSerializer
    queryset = ApprovalDelegation.objects.all()

    def create(self, request, *args, **kwargs):
        tenant_id = request.headers.get('X-Tenant-ID')
        data = request.data
        try:
            delegation = ApprovalDelegationService.create_delegation(
                tenant_id=tenant_id,
                user_id=data.get('user_id') or request.user.id,
                delegate_to_id=data.get('delegate_to_id'),
                start_date=data.get('start_date'),
                end_date=data.get('end_date'),
                category_id=data.get('category'),
                department_id=data.get('department_id'),
                reason=data.get('reason'),
            )
        except ValidationError as exc:
            return _validation_error_response(exc)
        return Response(ApprovalDelegationSerializer(delegation).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='my-delegations')
    def my_delegations(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        qs = ApprovalDelegation.objects.filter(tenant_id=tenant_id).filter(
            Q(user_id=request.user.id) | Q(delegate_to_id=request.user.id)
        )
        return Response(ApprovalDelegationSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='deactivate',
            permission_classes=[IsAuthenticated, TenantHeaderRequired, CanDelegate])
    def deactivate(self, request, pk=None):
        self.get_object()  # يفعّل فحص الصلاحيات على مستوى الكائن عبر CanDelegate
        delegation = ApprovalDelegationService.deactivate_delegation(
            request.headers.get('X-Tenant-ID'), pk, request.user.id)
        return Response(ApprovalDelegationSerializer(delegation).data, status=status.HTTP_200_OK)


class ApprovalEscalationViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, TenantHeaderRequired, CanEscalate]
    serializer_class = ApprovalEscalationSerializer
    queryset = ApprovalEscalation.objects.all()

    def create(self, request, *args, **kwargs):
        tenant_id = request.headers.get('X-Tenant-ID')
        data = request.data
        try:
            escalation = ApprovalEscalationService.escalate_request(
                tenant_id, data.get('request'), data.get('original_approver_id') or request.user.id,
                data.get('escalated_to_id'), reason=data.get('reason'), user_id=request.user.id,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)
        return Response(ApprovalEscalationSerializer(escalation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        escalation = ApprovalEscalationService.resolve_escalation(
            request.headers.get('X-Tenant-ID'), pk, request.user.id)
        return Response(ApprovalEscalationSerializer(escalation).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='active')
    def active(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        qs = ApprovalEscalation.objects.filter(tenant_id=tenant_id, resolved=False)
        return Response(ApprovalEscalationSerializer(qs, many=True).data, status=status.HTTP_200_OK)


# ============================================================
# اتفاقية مستوى الخدمة — SLA
# ============================================================
class SLATrackingViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = SLATrackingSerializer
    queryset = SLATracking.objects.all()

    @action(detail=False, methods=['get'], url_path='overdue')
    def overdue(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        qs = SLATracking.objects.filter(tenant_id=tenant_id, is_violated=True)
        return Response(SLATrackingSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='check-overdue')
    def check_overdue(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        count = SLATrackingService.check_overdue(tenant_id)
        return Response({'flagged': count}, status=status.HTTP_200_OK)


class ApprovalDeadlineViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalDeadlineSerializer
    queryset = ApprovalDeadline.objects.all()


class ApprovalReminderViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalReminderSerializer
    queryset = ApprovalReminder.objects.all()

    @action(detail=True, methods=['post'], url_path='send-now')
    def send_now(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        reminder = ApprovalReminder.objects.get(tenant_id=tenant_id, id=pk)
        ApprovalNotificationService.notify_user(
            tenant_id, reminder.request.requester_id, reminder.message, request_id=reminder.request_id)
        reminder.is_sent = True
        reminder.sent_at = timezone.now()
        reminder.save(update_fields=['is_sent', 'sent_at'])
        return Response(ApprovalReminderSerializer(reminder).data, status=status.HTTP_200_OK)


# ============================================================
# الإشعارات والتدقيق والتحليلات — Notifications, Audit & Analytics
# ============================================================
class ApprovalAuditViewSet(TenantScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    serializer_class = ApprovalAuditSerializer
    queryset = ApprovalAudit.objects.all()


class ApprovalNotificationViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalNotificationSerializer
    queryset = ApprovalNotification.objects.all()

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        ApprovalNotificationService.mark_read(request.headers.get('X-Tenant-ID'), pk)
        return Response({'status': 'read'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        count = ApprovalNotificationService.unread_count(tenant_id, request.user.id)
        return Response({'unread_count': count}, status=status.HTTP_200_OK)


class ApprovalStatisticsViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalStatisticsSerializer
    queryset = ApprovalStatistics.objects.all()

    @action(detail=False, methods=['post'], url_path='recalculate')
    def recalculate(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        stats = ApprovalAnalyticsService.recalculate_statistics(tenant_id)
        return Response(ApprovalStatisticsSerializer(stats).data, status=status.HTTP_200_OK)


class ApprovalDashboardViewSet(TenantScopedViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ApprovalDashboardSerializer
    queryset = ApprovalDashboard.objects.all()

    @action(detail=False, methods=['get'], url_path='my-dashboard')
    def my_dashboard(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        dashboard = ApprovalAnalyticsService.get_user_dashboard_config(tenant_id, request.user.id)
        return Response(ApprovalDashboardSerializer(dashboard).data, status=status.HTTP_200_OK)
