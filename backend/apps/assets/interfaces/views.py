from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.assets.domain.models import (
    Asset, AssetCategory, AssetClass, AssetGroup, AssetLocation,
    AssetAssignment, AssetCustodian, AssetComponent, AssetAccessory,
    AssetWarranty, AssetInsurance, AssetVendor, AssetAcquisition,
    AssetCapitalization, AssetDepreciationMethod, AssetDepreciation,
    AssetTransfer, AssetMovement, AssetMaintenancePlaceholder, AssetCondition,
    AssetInspection, AssetDisposal, AssetSale, AssetRetirement,
    AssetRevaluation, AssetImpairment, AssetInventoryAudit, AssetAttachment,
    AssetStatistics, AssetSettings, AssetAudit
)
from apps.assets.interfaces.serializers import (
    AssetCategorySerializer, AssetClassSerializer, AssetGroupSerializer,
    AssetLocationSerializer, AssetSerializer, AssetAssignmentSerializer,
    AssetCustodianSerializer, AssetComponentSerializer, AssetAccessorySerializer,
    AssetWarrantySerializer, AssetInsuranceSerializer, AssetVendorSerializer,
    AssetAcquisitionSerializer, AssetCapitalizationSerializer, AssetDepreciationMethodSerializer,
    AssetDepreciationSerializer, AssetTransferSerializer, AssetMovementSerializer,
    AssetMaintenancePlaceholderSerializer, AssetConditionSerializer, AssetInspectionSerializer,
    AssetDisposalSerializer, AssetSaleSerializer, AssetRetirementSerializer,
    AssetRevaluationSerializer, AssetImpairmentSerializer, AssetInventoryAuditSerializer,
    AssetAttachmentSerializer, AssetStatisticsSerializer, AssetSettingsSerializer,
    AssetAuditSerializer
)
from apps.assets.application.services import (
    AssetService, DepreciationService, DisposalService
)


class AssetCategoryViewSet(BaseCRUDViewSet):
    model_class = AssetCategory
    serializer_class = AssetCategorySerializer


class AssetClassViewSet(BaseCRUDViewSet):
    model_class = AssetClass
    serializer_class = AssetClassSerializer


class AssetGroupViewSet(BaseCRUDViewSet):
    model_class = AssetGroup
    serializer_class = AssetGroupSerializer


class AssetLocationViewSet(BaseCRUDViewSet):
    model_class = AssetLocation
    serializer_class = AssetLocationSerializer


class AssetViewSet(BaseCRUDViewSet):
    model_class = Asset
    serializer_class = AssetSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'asset_number', 'serial_number']

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم الأصول الثابتة وقيمها."""
        tenant_id = request.tenant_id
        
        total_assets = Asset.objects.filter(tenant_id=tenant_id).count()
        capitalized_assets = Asset.objects.filter(tenant_id=tenant_id, status='capitalized').count()
        disposed_assets = Asset.objects.filter(tenant_id=tenant_id, status='disposed').count()

        stats_record = AssetStatistics.objects.filter(tenant_id=tenant_id).first()
        net_book_value = stats_record.total_net_book_value if stats_record else 0.0
        depr_mtd = stats_record.total_depreciation_mtd if stats_record else 0.0

        stats = {
            'total_assets': total_assets,
            'capitalized_assets': capitalized_assets,
            'disposed_assets': disposed_assets,
            'net_book_value': float(net_book_value),
            'depr_mtd': float(depr_mtd),
            'pending_transfers': AssetTransfer.objects.filter(tenant_id=tenant_id, status='pending').count(),
            'pending_disposals': AssetDisposal.objects.filter(tenant_id=tenant_id, status='pending').count()
        }
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='capitalize')
    def capitalize(self, request, pk=None):
        tenant_id = request.tenant_id
        capitalization_date_str = request.data.get('capitalization_date')
        asset_gl_account_id = request.data.get('asset_gl_account_id')
        offset_gl_account_id = request.data.get('offset_gl_account_id')
        cost_center_id = request.data.get('cost_center_id')

        if not capitalization_date_str or not asset_gl_account_id or not offset_gl_account_id:
            return Response({'error': 'capitalization_date, asset_gl_account_id, and offset_gl_account_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        capitalization_date = timezone.datetime.strptime(capitalization_date_str, '%Y-%m-%d').date()

        cap = AssetService.capitalize_asset(
            tenant_id=tenant_id,
            asset_id=pk,
            capitalization_date=capitalization_date,
            asset_gl_account_id=asset_gl_account_id,
            offset_gl_account_id=offset_gl_account_id,
            cost_center_id=cost_center_id,
            user_id=request.user.id if request.user else None
        )
        serializer = AssetCapitalizationSerializer(cap)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='depreciate')
    def depreciate(self, request, pk=None):
        tenant_id = request.tenant_id
        run_date_str = request.data.get('run_date')
        depr_expense_gl_account_id = request.data.get('depr_expense_gl_account_id')
        accum_depr_gl_account_id = request.data.get('accum_depr_gl_account_id')
        cost_center_id = request.data.get('cost_center_id')

        if not run_date_str or not depr_expense_gl_account_id or not accum_depr_gl_account_id:
            return Response({'error': 'run_date, depr_expense_gl_account_id, and accum_depr_gl_account_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        run_date = timezone.datetime.strptime(run_date_str, '%Y-%m-%d').date()

        depr = DepreciationService.calculate_and_post_depreciation(
            tenant_id=tenant_id,
            asset_id=pk,
            run_date=run_date,
            depr_expense_gl_account_id=depr_expense_gl_account_id,
            accum_depr_gl_account_id=accum_depr_gl_account_id,
            cost_center_id=cost_center_id,
            user_id=request.user.id if request.user else None
        )
        serializer = AssetDepreciationSerializer(depr)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssetAssignmentViewSet(BaseCRUDViewSet):
    model_class = AssetAssignment
    serializer_class = AssetAssignmentSerializer


class AssetCustodianViewSet(BaseCRUDViewSet):
    model_class = AssetCustodian
    serializer_class = AssetCustodianSerializer


class AssetComponentViewSet(BaseCRUDViewSet):
    model_class = AssetComponent
    serializer_class = AssetComponentSerializer


class AssetAccessoryViewSet(BaseCRUDViewSet):
    model_class = AssetAccessory
    serializer_class = AssetAccessorySerializer


class AssetWarrantyViewSet(BaseCRUDViewSet):
    model_class = AssetWarranty
    serializer_class = AssetWarrantySerializer


class AssetInsuranceViewSet(BaseCRUDViewSet):
    model_class = AssetInsurance
    serializer_class = AssetInsuranceSerializer


class AssetVendorViewSet(BaseCRUDViewSet):
    model_class = AssetVendor
    serializer_class = AssetVendorSerializer


class AssetAcquisitionViewSet(BaseCRUDViewSet):
    model_class = AssetAcquisition
    serializer_class = AssetAcquisitionSerializer


class AssetCapitalizationViewSet(BaseCRUDViewSet):
    model_class = AssetCapitalization
    serializer_class = AssetCapitalizationSerializer


class AssetDepreciationMethodViewSet(BaseCRUDViewSet):
    model_class = AssetDepreciationMethod
    serializer_class = AssetDepreciationMethodSerializer


class AssetDepreciationViewSet(BaseCRUDViewSet):
    model_class = AssetDepreciation
    serializer_class = AssetDepreciationSerializer


class AssetTransferViewSet(BaseCRUDViewSet):
    model_class = AssetTransfer
    serializer_class = AssetTransferSerializer


class AssetMovementViewSet(BaseCRUDViewSet):
    model_class = AssetMovement
    serializer_class = AssetMovementSerializer


class AssetMaintenancePlaceholderViewSet(BaseCRUDViewSet):
    model_class = AssetMaintenancePlaceholder
    serializer_class = AssetMaintenancePlaceholderSerializer


class AssetConditionViewSet(BaseCRUDViewSet):
    model_class = AssetCondition
    serializer_class = AssetConditionSerializer


class AssetInspectionViewSet(BaseCRUDViewSet):
    model_class = AssetInspection
    serializer_class = AssetInspectionSerializer


class AssetDisposalViewSet(BaseCRUDViewSet):
    model_class = AssetDisposal
    serializer_class = AssetDisposalSerializer

    @action(detail=False, methods=['post'], url_path='dispose')
    def dispose(self, request):
        tenant_id = request.tenant_id
        asset_id = request.data.get('asset_id')
        disposal_type = request.data.get('disposal_type', 'write_off')
        proceeds = request.data.get('proceeds', 0.00)
        run_date_str = request.data.get('run_date')
        disposal_expense_gl_account_id = request.data.get('disposal_expense_gl_account_id')
        asset_gl_account_id = request.data.get('asset_gl_account_id')
        accum_depr_gl_account_id = request.data.get('accum_depr_gl_account_id')

        if not asset_id or not run_date_str or not asset_gl_account_id or not accum_depr_gl_account_id:
            return Response({'error': 'asset_id, run_date, asset_gl_account_id, and accum_depr_gl_account_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        run_date = timezone.datetime.strptime(run_date_str, '%Y-%m-%d').date()

        disp = DisposalService.dispose_asset(
            tenant_id=tenant_id,
            asset_id=asset_id,
            disposal_type=disposal_type,
            proceeds=proceeds,
            run_date=run_date,
            disposal_expense_gl_account_id=disposal_expense_gl_account_id,
            asset_gl_account_id=asset_gl_account_id,
            accum_depr_gl_account_id=accum_depr_gl_account_id,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(disp)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AssetSaleViewSet(BaseCRUDViewSet):
    model_class = AssetSale
    serializer_class = AssetSaleSerializer


class AssetRetirementViewSet(BaseCRUDViewSet):
    model_class = AssetRetirement
    serializer_class = AssetRetirementSerializer


class AssetRevaluationViewSet(BaseCRUDViewSet):
    model_class = AssetRevaluation
    serializer_class = AssetRevaluationSerializer


class AssetImpairmentViewSet(BaseCRUDViewSet):
    model_class = AssetImpairment
    serializer_class = AssetImpairmentSerializer


class AssetInventoryAuditViewSet(BaseCRUDViewSet):
    model_class = AssetInventoryAudit
    serializer_class = AssetInventoryAuditSerializer


class AssetAttachmentViewSet(BaseCRUDViewSet):
    model_class = AssetAttachment
    serializer_class = AssetAttachmentSerializer


class AssetStatisticsViewSet(BaseCRUDViewSet):
    model_class = AssetStatistics
    serializer_class = AssetStatisticsSerializer


class AssetSettingsViewSet(BaseCRUDViewSet):
    model_class = AssetSettings
    serializer_class = AssetSettingsSerializer


class AssetAuditViewSet(BaseCRUDViewSet):
    model_class = AssetAudit
    serializer_class = AssetAuditSerializer
