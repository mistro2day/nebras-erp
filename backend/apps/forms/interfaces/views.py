from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.forms.domain.models import FormDefinition, FormVersion, FormCategory, FormSubmission
from apps.forms.interfaces.serializers import (
    FormDefinitionSerializer, FormVersionSerializer, FormCategorySerializer, FormSubmissionSerializer
)
from apps.forms.application.services import FormRenderingService, FormSubmissionService


class FormCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FormCategorySerializer
    queryset = FormCategory.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs


class FormDefinitionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FormDefinitionSerializer
    queryset = FormDefinition.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['get'], url_path='render/(?P<code>[^/.]+)')
    def render_form(self, request, code=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        try:
            schema = FormRenderingService.get_active_form_schema(tenant_id, code)
            return Response(schema, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FormSubmissionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FormSubmissionSerializer
    queryset = FormSubmission.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=False, methods=['post'], url_path='submit')
    def submit_form(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        form_version_id = request.data.get('form_version')
        responses_dict = request.data.get('responses', {})
        attachment_uuids = request.data.get('attachments', [])
        user_id = request.user.id

        if not form_version_id:
            return Response({"detail": "نسخة الاستمارة مطلوبة لتقديم المدخلات."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            submission = FormSubmissionService.submit_responses(
                tenant_id, form_version_id, responses_dict, attachment_uuids, user_id, request.META.get('REMOTE_ADDR')
            )
            return Response(FormSubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
