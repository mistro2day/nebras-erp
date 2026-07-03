from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.master_data.interfaces.views import MasterCategoryViewSet, MasterItemViewSet, MasterTranslationViewSet

router = DefaultRouter()
router.register(r'categories', MasterCategoryViewSet, basename='master-category')
router.register(r'items', MasterItemViewSet, basename='master-item')
router.register(r'translations', MasterTranslationViewSet, basename='master-translation')

urlpatterns = [
    path('', include(router.urls)),
]