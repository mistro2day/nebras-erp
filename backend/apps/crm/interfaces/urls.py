from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.crm.interfaces.views import (
    CrmDashboardView, LeadViewSet, ProspectViewSet, ContactViewSet, CampaignViewSet,
    CaseViewSet, SurveyViewSet, FeedbackViewSet, KnowledgeArticleViewSet
)

router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='crm-leads')
router.register(r'prospects', ProspectViewSet, basename='crm-prospects')
router.register(r'contacts', ContactViewSet, basename='crm-contacts')
router.register(r'campaigns', CampaignViewSet, basename='crm-campaigns')
router.register(r'cases', CaseViewSet, basename='crm-cases')
router.register(r'surveys', SurveyViewSet, basename='crm-surveys')
router.register(r'feedback', FeedbackViewSet, basename='crm-feedback')
router.register(r'knowledge-articles', KnowledgeArticleViewSet, basename='crm-knowledge-articles')


urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', CrmDashboardView.as_view(), name='crm-dashboard'),
]
