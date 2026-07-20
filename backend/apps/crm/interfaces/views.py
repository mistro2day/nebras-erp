from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from apps.crm.domain.models import (
    Lead, LeadSource, LeadStatus, Prospect, Contact, Campaign, Case, Survey, Feedback, KnowledgeArticle
)
from apps.crm.interfaces.serializers import (
    LeadSerializer, LeadSourceSerializer, LeadStatusSerializer, ProspectSerializer,
    ContactSerializer, CampaignSerializer, CaseSerializer, SurveySerializer, FeedbackSerializer,
    KnowledgeArticleSerializer
)
from apps.crm.application.services import CrmLeadService, CrmCaseService, CrmDashboardService


class CrmDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant_id = request.headers.get('X-Tenant-ID')
        data = CrmDashboardService.get_crm_kpis(tenant_id)
        return Response(data)


class LeadViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LeadSerializer
    queryset = Lead.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        prospect = CrmLeadService.convert_lead_to_prospect(tenant_id, pk)
        return Response(ProspectSerializer(prospect).data, status=status.HTTP_201_CREATED)


class ProspectViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProspectSerializer
    queryset = Prospect.objects.all()

    def get_queryset(self):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        qs = super().get_queryset()
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        return qs

    @action(detail=True, methods=['post'])
    def convert_to_applicant(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        result = CrmLeadService.convert_prospect_to_applicant(tenant_id, pk)
        return Response(result, status=status.HTTP_200_OK)


class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ContactSerializer
    queryset = Contact.objects.all()


class CampaignViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CampaignSerializer
    queryset = Campaign.objects.all()


class CaseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CaseSerializer
    queryset = Case.objects.all()

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        tenant_id = request.headers.get('X-Tenant-ID')
        escalated_case = CrmCaseService.escalate_case(tenant_id, pk)
        return Response(CaseSerializer(escalated_case).data)


class SurveyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SurveySerializer
    queryset = Survey.objects.all()


class FeedbackViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = FeedbackSerializer
    queryset = Feedback.objects.all()


class KnowledgeArticleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = KnowledgeArticleSerializer
    queryset = KnowledgeArticle.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        tenant_id = self.request.headers.get('X-Tenant-ID')
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(title__icontains=search) | qs.filter(content__icontains=search)
        return qs

    def perform_create(self, serializer):
        tenant_id = self.request.headers.get('X-Tenant-ID')
        serializer.save(tenant_id=tenant_id)

