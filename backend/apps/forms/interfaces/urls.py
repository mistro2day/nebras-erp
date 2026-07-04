from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.forms.interfaces.views import (
    FormCategoryViewSet, FormDefinitionViewSet, FormSubmissionViewSet
)

router = DefaultRouter()
router.register(r'categories', FormCategoryViewSet, basename='forms-categories')
router.register(r'definitions', FormDefinitionViewSet, basename='forms-definitions')
router.register(r'submissions', FormSubmissionViewSet, basename='forms-submissions')

urlpatterns = [
    path('', include(router.urls)),
]
