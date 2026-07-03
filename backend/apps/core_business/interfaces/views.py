from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.core_business.domain.models import Attachment, Comment, Activity, ApprovalRequest, Tag, LookupCategory, LookupValue
from apps.core_business.interfaces.serializers import (
    AttachmentSerializer, CommentSerializer, ActivitySerializer,
    ApprovalRequestSerializer, TagSerializer, LookupCategorySerializer, LookupValueSerializer
)
from apps.core_business.application.services import UniversalNumberGeneratorService, UniversalImportExportService

class AttachmentViewSet(BaseCRUDViewSet):
    model_class = Attachment
    serializer_class = AttachmentSerializer

class CommentViewSet(BaseCRUDViewSet):
    model_class = Comment
    serializer_class = CommentSerializer

class ActivityViewSet(BaseCRUDViewSet):
    model_class = Activity
    serializer_class = ActivitySerializer

class ApprovalRequestViewSet(BaseCRUDViewSet):
    model_class = ApprovalRequest
    serializer_class = ApprovalRequestSerializer

    @action(detail=True, methods=['post'], url_path='decide')
    def decide(self, request, pk=None):
        instance = self.get_object()
        decision = request.data.get('decision') # approved, rejected
        instance.status = decision
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تم اتخاذ القرار بنجاح.")

class TagViewSet(BaseCRUDViewSet):
    model_class = Tag
    serializer_class = TagSerializer

class LookupCategoryViewSet(BaseCRUDViewSet):
    model_class = LookupCategory
    serializer_class = LookupCategorySerializer

class LookupValueViewSet(BaseCRUDViewSet):
    model_class = LookupValue
    serializer_class = LookupValueSerializer


class UniversalToolsViewSet(viewsets.ViewSet):
    """
    واجهة للأدوات المشتركة مثل توليد الأرقام والاستيراد والتصدير
    """
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='generate-number')
    def generate_number(self, request):
        prefix = request.data.get('prefix', 'GEN')
        year_suffix = request.data.get('year_suffix', True)
        padding = request.data.get('padding', 6)
        num = UniversalNumberGeneratorService.generate_number(prefix, year_suffix, padding)
        return StandardResponse({'number': num}, message="تم توليد الرقم المرجعي بنجاح.")