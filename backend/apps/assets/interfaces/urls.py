from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.assets.interfaces.views import (
    AssetCategoryViewSet, AssetClassViewSet, AssetGroupViewSet,
    AssetLocationViewSet, AssetViewSet, AssetAssignmentViewSet,
    AssetCustodianViewSet, AssetComponentViewSet, AssetAccessoryViewSet,
    AssetWarrantyViewSet, AssetInsuranceViewSet, AssetVendorViewSet,
    AssetAcquisitionViewSet, AssetCapitalizationViewSet, AssetDepreciationMethodViewSet,
    AssetDepreciationViewSet, AssetTransferViewSet, AssetMovementViewSet,
    AssetMaintenancePlaceholderViewSet, AssetConditionViewSet, AssetInspectionViewSet,
    AssetDisposalViewSet, AssetSaleViewSet, AssetRetirementViewSet,
    AssetRevaluationViewSet, AssetImpairmentViewSet, AssetInventoryAuditViewSet,
    AssetAttachmentViewSet, AssetStatisticsViewSet, AssetSettingsViewSet,
    AssetAuditViewSet
)

router = DefaultRouter()
router.register('categories', AssetCategoryViewSet, basename='category')
router.register('classes', AssetClassViewSet, basename='class')
router.register('groups', AssetGroupViewSet, basename='group')
router.register('locations', AssetLocationViewSet, basename='location')
router.register('items', AssetViewSet, basename='asset')
router.register('assignments', AssetAssignmentViewSet, basename='assignment')
router.register('custodians', AssetCustodianViewSet, basename='custodian')
router.register('components', AssetComponentViewSet, basename='component')
router.register('accessories', AssetAccessoryViewSet, basename='accessory')
router.register('warranties', AssetWarrantyViewSet, basename='warranty')
router.register('insurances', AssetInsuranceViewSet, basename='insurance')
router.register('vendors', AssetVendorViewSet, basename='vendor')
router.register('acquisitions', AssetAcquisitionViewSet, basename='acquisition')
router.register('capitalizations', AssetCapitalizationViewSet, basename='capitalization')
router.register('depr-methods', AssetDepreciationMethodViewSet, basename='depr-method')
router.register('depreciations', AssetDepreciationViewSet, basename='depreciation')
router.register('transfers', AssetTransferViewSet, basename='transfer')
router.register('movements', AssetMovementViewSet, basename='movement')
router.register('maintenances', AssetMaintenancePlaceholderViewSet, basename='maintenance')
router.register('conditions', AssetConditionViewSet, basename='condition')
router.register('inspections', AssetInspectionViewSet, basename='inspection')
router.register('disposals', AssetDisposalViewSet, basename='disposal')
router.register('sales', AssetSaleViewSet, basename='sale')
router.register('retirements', AssetRetirementViewSet, basename='retirement')
router.register('revaluations', AssetRevaluationViewSet, basename='revaluation')
router.register('impairments', AssetImpairmentViewSet, basename='impairment')
router.register('inventory-audits', AssetInventoryAuditViewSet, basename='inventory-audit')
router.register('attachments', AssetAttachmentViewSet, basename='attachment')
router.register('statistics', AssetStatisticsViewSet, basename='statistics')
router.register('settings', AssetSettingsViewSet, basename='settings')
router.register('audits', AssetAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
