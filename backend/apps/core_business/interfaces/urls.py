from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.core_business.interfaces.views import (
    AttachmentViewSet, CommentViewSet, ActivityViewSet,
    ApprovalRequestViewSet, TagViewSet, LookupCategoryViewSet,
    LookupValueViewSet, UniversalToolsViewSet
)

router = DefaultRouter()
router.register(r'attachments', AttachmentViewSet, basename='attachment')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'approvals', ApprovalRequestViewSet, basename='approval')
router.register(r'tags', TagViewSet, basename='tag')
router.register(r'lookup-categories', LookupCategoryViewSet, basename='lookup-category')
router.register(r'lookup-values', LookupValueViewSet, basename='lookup-value')
router.register(r'tools', UniversalToolsViewSet, basename='tools')

urlpatterns = [
    path('', include(router.urls)),
]