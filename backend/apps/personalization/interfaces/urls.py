from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.personalization.interfaces.views import (
    WorkspaceViewSet, ThemeViewSet, AccessibilityProfileViewSet, PreferenceViewSet
)

router = DefaultRouter()
router.register(r'workspaces', WorkspaceViewSet, basename='p13n-workspaces')
router.register(r'themes', ThemeViewSet, basename='p13n-themes')
router.register(r'accessibility', AccessibilityProfileViewSet, basename='p13n-accessibility')
router.register(r'preferences', PreferenceViewSet, basename='p13n-preferences')

urlpatterns = [
    path('', include(router.urls)),
]
