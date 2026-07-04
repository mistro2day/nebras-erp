from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated

from apps.document_management.domain.models import (
    Document, DocumentVersion, DocumentFolder, DocumentMetadata, DocumentComment
)
from apps.document_management.interfaces.serializers import (
    DocumentSerializer, DocumentFolderSerializer, DocumentVersionSerializer,
    DocumentMetadataSerializer, DocumentCommentSerializer
)
from apps.document_management.application.services import DocumentStorageService, DocumentLockService


class DocumentFolderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentFolderSerializer
    queryset = DocumentFolder.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSerializer
    queryset = Document.objects.all()
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_document(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        folder_id = request.data.get('folder')
        title = request.data.get('title')
        file_obj = request.FILES.get('file')
        owner_id = request.user.id # ربط بمعرف المستخدم بايثون

        if not file_obj or not title:
            return Response({"detail": "الملف والعنوان حقول مطلوبة."}, status=status.HTTP_400_BAD_REQUEST)

        document = DocumentStorageService.upload_file(tenant_id, folder_id, title, file_obj, owner_id)
        return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='version')
    def add_version(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        file_obj = request.FILES.get('file')
        change_log = request.data.get('change_log', '')
        is_major = request.data.get('is_major', 'false').lower() == 'true'
        author_id = request.user.id

        if not file_obj:
            return Response({"detail": "الملف مطلوب."}, status=status.HTTP_400_BAD_REQUEST)

        version = DocumentStorageService.add_new_version(tenant_id, pk, file_obj, author_id, change_log, is_major)
        return Response(DocumentVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='lock')
    def lock_doc(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        DocumentLockService.lock_document(tenant_id, pk, request.user.id)
        return Response({"status": "document locked"})

    @action(detail=True, methods=['post'], url_path='unlock')
    def unlock_doc(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        DocumentLockService.unlock_document(tenant_id, pk, request.user.id)
        return Response({"status": "document unlocked"})


class DocumentMetadataViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentMetadataSerializer
    queryset = DocumentMetadata.objects.all()


class DocumentCommentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentCommentSerializer
    queryset = DocumentComment.objects.all()
