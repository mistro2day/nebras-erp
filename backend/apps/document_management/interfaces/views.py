from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from django.db.models import Sum

from apps.document_management.domain.models import (
    Document, DocumentVersion, DocumentFolder, DocumentMetadata, DocumentComment, DocumentAccessLog
)
from apps.document_management.interfaces.serializers import (
    DocumentSerializer, DocumentFolderSerializer, DocumentVersionSerializer,
    DocumentMetadataSerializer, DocumentCommentSerializer
)
from apps.document_management.application.services import DocumentStorageService, DocumentLockService


from apps.tenants.domain.models import Tenant

def get_tenant_id(request):
    if hasattr(request, 'tenant') and request.tenant and getattr(request.tenant, 'id', None):
        return str(request.tenant.id)
    header_tenant = request.headers.get('X-Tenant-ID')
    if header_tenant:
        return header_tenant
    first_tenant = Tenant.objects.filter(is_active=True).first()
    if first_tenant:
        return str(first_tenant.id)
    return None



from apps.shared.interfaces.views import BaseCRUDViewSet

class DocumentFolderViewSet(BaseCRUDViewSet):
    permission_classes: list = [AllowAny]
    model_class = DocumentFolder
    serializer_class = DocumentFolderSerializer
    queryset = DocumentFolder.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        return qs.order_by('-created_at')


class DocumentViewSet(BaseCRUDViewSet):
    permission_classes: list = [AllowAny]
    model_class = Document
    serializer_class = DocumentSerializer
    queryset = Document.objects.all()
    parser_classes = [MultiPartParser, FormParser]


    def get_queryset(self):
        folder_id = self.request.query_params.get('folder')
        search_query = self.request.query_params.get('search')
        qs = super().get_queryset()

        if folder_id:
            qs = qs.filter(folder_id=folder_id)
        if search_query:
            qs = qs.filter(title__icontains=search_query)

        return qs.order_by('-created_at')




    @action(detail=False, methods=['get'], url_path='storage-stats')
    def storage_stats(self, request):
        tenant_id = get_tenant_id(request)
        qs = Document.objects.all()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)

        total_bytes = qs.aggregate(Sum('file_size_bytes'))['file_size_bytes__sum'] or 0
        used_gb = round(total_bytes / (1024 * 1024 * 1024), 2)
        total_docs = qs.count()
        locked_count = qs.filter(is_locked=True).count()

        folder_qs = DocumentFolder.objects.all()
        if tenant_id:
            folder_qs = folder_qs.filter(tenant_id=tenant_id)

        return Response({
            'used_gb': used_gb if used_gb > 0 else 0.15,
            'quota_gb': 20.0,
            'total_docs': total_docs,
            'locked_count': locked_count,
            'folder_count': folder_qs.count()
        })

    @action(detail=False, methods=['get'], url_path='activity-log')
    def activity_log(self, request):
        tenant_id = get_tenant_id(request)
        qs = DocumentVersion.objects.all().select_related('document')
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)

        logs = []
        for ver in qs.order_by('-created_at_time')[:10]:
            doc_title = ver.document.title if ver.document else 'مستند'
            logs.append({
                'action': f"إصدار v{ver.version_number} — {ver.change_log or 'رُفع مستند جديد'}",
                'actor': 'مستخدم النظام',
                'at': ver.created_at_time.strftime('%Y-%m-%d %H:%M')
            })

        return Response(logs)

    @action(detail=False, methods=['post'], url_path='upload')
    def upload_document(self, request):
        tenant_id = get_tenant_id(request)
        folder_id = request.data.get('folder')
        title = request.data.get('title')
        file_obj = request.FILES.get('file')
        owner_id = request.user.id if request.user and request.user.is_authenticated else None

        if not file_obj or not title:
            return Response({"detail": "الملف والعنوان حقول مطلوبة."}, status=status.HTTP_400_BAD_REQUEST)

        document = DocumentStorageService.upload_file(tenant_id, folder_id, title, file_obj, owner_id)
        return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='version')
    def add_version(self, request, pk=None):
        tenant_id = get_tenant_id(request)
        file_obj = request.FILES.get('file')
        change_log = request.data.get('change_log', '')
        is_major = request.data.get('is_major', 'false').lower() == 'true'
        author_id = request.user.id if request.user and request.user.is_authenticated else None

        if not file_obj:
            return Response({"detail": "الملف مطلوب."}, status=status.HTTP_400_BAD_REQUEST)

        version = DocumentStorageService.add_new_version(tenant_id, pk, file_obj, author_id, change_log, is_major)
        return Response(DocumentVersionSerializer(version).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='lock')
    def lock_doc(self, request, pk=None):
        tenant_id = get_tenant_id(request)
        user_id = request.user.id if request.user and request.user.is_authenticated else None
        DocumentLockService.lock_document(tenant_id, pk, user_id)
        return Response({"status": "document locked", "is_locked": True})

    @action(detail=True, methods=['post'], url_path='unlock')
    def unlock_doc(self, request, pk=None):
        tenant_id = get_tenant_id(request)
        user_id = request.user.id if request.user and request.user.is_authenticated else None
        DocumentLockService.unlock_document(tenant_id, pk, user_id)
        return Response({"status": "document unlocked", "is_locked": False})


class DocumentMetadataViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = DocumentMetadataSerializer
    queryset = DocumentMetadata.objects.all()


class DocumentCommentViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = DocumentCommentSerializer
    queryset = DocumentComment.objects.all()

