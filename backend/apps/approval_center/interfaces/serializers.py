from rest_framework import serializers
from apps.approval_center.domain.models import (
    InboxItem, ApprovalRequest, ApprovalDecision, ApprovalHistory
)

class InboxItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InboxItem
        fields = ['id', 'inbox', 'item_type', 'item_id', 'title_ar', 'title_en', 'status', 'is_starred', 'created_at']


class ApprovalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalRequest
        fields = ['id', 'workflow_instance_id', 'category', 'requester_id', 'status', 'payload', 'created_at']


class ApprovalDecisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalDecision
        fields = ['id', 'request', 'approver_id', 'action', 'decision_date', 'comments']


class ApprovalHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalHistory
        fields = ['id', 'request', 'step_name', 'action_taken', 'user_id', 'timestamp']
