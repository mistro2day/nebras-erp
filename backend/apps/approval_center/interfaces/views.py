from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.approval_center.domain.models import InboxItem, ApprovalRequest, ApprovalDecision, ApprovalHistory
from apps.approval_center.interfaces.serializers import (
    InboxItemSerializer, ApprovalRequestSerializer, ApprovalDecisionSerializer, ApprovalHistorySerializer
)
from apps.approval_center.application.services import EnterpriseInboxService, ApprovalDecisionService


class EnterpriseInboxViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = InboxItemSerializer
    queryset = InboxItem.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['get'], url_path='my-items')
    def get_my_items(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        user_id = request.user.id
        items = EnterpriseInboxService.get_user_inbox_items(tenant_id, user_id)
        return Response(items, status=status.HTTP_200_OK)


class ApprovalRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApprovalRequestSerializer
    queryset = ApprovalRequest.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=True, methods=['post'], url_path='decision')
    def make_decision(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        action_code = request.data.get('action') # approve, reject, return
        comments = request.data.get('comments', '')
        approver_id = request.user.id

        if not action_code:
            return Response({"detail": "حقل الإجراء action مطلوب."}, status=status.HTTP_400_BAD_REQUEST)

        decision = ApprovalDecisionService.make_decision(tenant_id, pk, approver_id, action_code, comments)
        return Response(ApprovalDecisionSerializer(decision).data, status=status.HTTP_200_OK)


class ApprovalHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApprovalHistorySerializer
    queryset = ApprovalHistory.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs
