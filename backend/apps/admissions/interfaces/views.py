from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.admissions.domain.models import Applicant, Guardian, RequiredDocument, Interview, PlacementTest
from apps.admissions.interfaces.serializers import (
    ApplicantSerializer, GuardianSerializer, RequiredDocumentSerializer, 
    InterviewSerializer, PlacementTestSerializer
)
from apps.common.responses import StandardResponse, StandardPagination

class AdmissionsBaseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        return self.model_class.objects.filter(deleted_at__isnull=True)

    def perform_create(self, serializer):
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id)


class ApplicantViewSet(AdmissionsBaseViewSet):
    model_class = Applicant
    queryset = Applicant.objects.all()
    serializer_class = ApplicantSerializer
    search_fields = ['arabic_full_name', 'english_full_name', 'national_id', 'application_number']

    def perform_create(self, serializer):
        # توليد رقم الطلب تلقائياً
        import random
        app_num = f"APP-{random.randint(100000, 999999)}"
        tenant_id = self.request.tenant.id if hasattr(self.request, 'tenant') and self.request.tenant else None
        serializer.save(tenant_id=tenant_id, application_number=app_num)


class GuardianViewSet(AdmissionsBaseViewSet):
    model_class = Guardian
    queryset = Guardian.objects.all()
    serializer_class = GuardianSerializer
    search_fields = ['full_name', 'phone', 'national_id']


class RequiredDocumentViewSet(AdmissionsBaseViewSet):
    model_class = RequiredDocument
    queryset = RequiredDocument.objects.all()
    serializer_class = RequiredDocumentSerializer
    search_fields = ['document_name']


class InterviewViewSet(AdmissionsBaseViewSet):
    model_class = Interview
    queryset = Interview.objects.all()
    serializer_class = InterviewSerializer


class PlacementTestViewSet(AdmissionsBaseViewSet):
    model_class = PlacementTest
    queryset = PlacementTest.objects.all()
    serializer_class = PlacementTestSerializer