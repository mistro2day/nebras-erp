from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.document_management.interfaces.views import (
    DocumentFolderViewSet, DocumentViewSet, DocumentMetadataViewSet, DocumentCommentViewSet
)

router = DefaultRouter()
router.register(r'folders', DocumentFolderViewSet, basename='dms-folders')
router.register(r'files', DocumentViewSet, basename='dms-files')
router.register(r'metadata', DocumentMetadataViewSet, basename='dms-metadata')
router.register(r'comments', DocumentCommentViewSet, basename='dms-comments')

urlpatterns = [
    path('', include(router.urls)),
]
