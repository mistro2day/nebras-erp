from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.command_center.interfaces.views import (
    CommandCategoryViewSet, CommandViewSet
)

router = DefaultRouter()
router.register(r'categories', CommandCategoryViewSet, basename='cmd-categories')
router.register(r'items', CommandViewSet, basename='cmd-items')

urlpatterns = [
    path('', include(router.urls)),
]
