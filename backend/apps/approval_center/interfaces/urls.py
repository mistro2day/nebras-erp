from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.approval_center.interfaces.views import (
    EnterpriseInboxViewSet,
    ApprovalRequestViewSet,
    ApprovalHistoryViewSet,
)

router = DefaultRouter()
router.register('inbox', EnterpriseInboxViewSet, basename='inbox')
router.register('requests', ApprovalRequestViewSet, basename='approval-request')
router.register('history', ApprovalHistoryViewSet, basename='approval-history')

urlpatterns = [
    path('', include(router.urls)),
]
