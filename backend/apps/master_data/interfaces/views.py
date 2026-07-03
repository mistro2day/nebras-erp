from rest_framework import viewsets, status
from rest_framework.response import Response
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.master_data.domain.models import MasterCategory, MasterItem, MasterTranslation
from apps.master_data.interfaces.serializers import MasterCategorySerializer, MasterItemSerializer, MasterTranslationSerializer

class MasterCategoryViewSet(BaseCRUDViewSet):
    model_class = MasterCategory
    serializer_class = MasterCategorySerializer

class MasterItemViewSet(BaseCRUDViewSet):
    model_class = MasterItem
    serializer_class = MasterItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category_code = self.request.query_params.get('category_code')
        if category_code:
            qs = qs.filter(category__code=category_code)
        return qs

class MasterTranslationViewSet(BaseCRUDViewSet):
    model_class = MasterTranslation
    serializer_class = MasterTranslationSerializer