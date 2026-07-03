from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.organization.interfaces.views import (
    BranchViewSet, CampusViewSet, BuildingViewSet, FloorViewSet, 
    RoomViewSet, DepartmentViewSet, OrganizationDocumentViewSet, 
    TenantBrandingViewSet, OrganizationContactViewSet
)

router = DefaultRouter()
router.register('branches', BranchViewSet, basename='branch')
router.register('campuses', CampusViewSet, basename='campus')
router.register('buildings', BuildingViewSet, basename='building')
router.register('floors', FloorViewSet, basename='floor')
router.register('rooms', RoomViewSet, basename='room')
router.register('departments', DepartmentViewSet, basename='department')
router.register('documents', OrganizationDocumentViewSet, basename='document')
router.register('branding', TenantBrandingViewSet, basename='branding')
router.register('contacts', OrganizationContactViewSet, basename='contact')

urlpatterns = [
    path('', include(router.urls)),
]