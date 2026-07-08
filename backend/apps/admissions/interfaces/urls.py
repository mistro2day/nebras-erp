from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.admissions.interfaces.views import (
    ApplicantViewSet, GuardianViewSet, RequiredDocumentViewSet,
    InterviewViewSet, PlacementTestViewSet, AdmissionSettingsViewSet
)

router = DefaultRouter()
router.register('applicants', ApplicantViewSet, basename='applicant')
router.register('guardians', GuardianViewSet, basename='guardian')
router.register('documents', RequiredDocumentViewSet, basename='document')
router.register('interviews', InterviewViewSet, basename='interview')
router.register('placement-tests', PlacementTestViewSet, basename='placement-test')
router.register('settings', AdmissionSettingsViewSet, basename='admission-settings')

urlpatterns = [
    path('', include(router.urls)),
]