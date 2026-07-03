from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.admissions.interfaces.views import (
    ApplicantViewSet, GuardianViewSet, RequiredDocumentViewSet, 
    InterviewViewSet, PlacementTestViewSet
)

router = DefaultRouter()
router.register('applicants', ApplicantViewSet, basename='applicant')
router.register('guardians', GuardianViewSet, basename='guardian')
router.register('documents', RequiredDocumentViewSet, basename='document')
router.register('interviews', InterviewViewSet, basename='interview')
router.register('placement-tests', PlacementTestViewSet, basename='placement-test')

urlpatterns = [
    path('', include(router.urls)),
]