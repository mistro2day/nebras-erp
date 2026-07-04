from rest_framework import serializers
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

class BaseAssetSerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class AssetCategorySerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetCategory
        fields = '__all__'

class AssetClassSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetClass
        fields = '__all__'

class AssetGroupSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetGroup
        fields = '__all__'

class AssetLocationSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetLocation
        fields = '__all__'

class AssetSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = Asset
        fields = '__all__'

class AssetAssignmentSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetAssignment
        fields = '__all__'

class AssetCustodianSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetCustodian
        fields = '__all__'

class AssetComponentSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetComponent
        fields = '__all__'

class AssetAccessorySerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetAccessory
        fields = '__all__'

class AssetWarrantySerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetWarranty
        fields = '__all__'

class AssetInsuranceSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetInsurance
        fields = '__all__'

class AssetVendorSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetVendor
        fields = '__all__'

class AssetAcquisitionSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetAcquisition
        fields = '__all__'

class AssetCapitalizationSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetCapitalization
        fields = '__all__'

class AssetDepreciationMethodSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetDepreciationMethod
        fields = '__all__'

class AssetDepreciationSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetDepreciation
        fields = '__all__'

class AssetTransferSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetTransfer
        fields = '__all__'

class AssetMovementSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetMovement
        fields = '__all__'

class AssetMaintenancePlaceholderSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetMaintenancePlaceholder
        fields = '__all__'

class AssetConditionSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetCondition
        fields = '__all__'

class AssetInspectionSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetInspection
        fields = '__all__'

class AssetDisposalSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetDisposal
        fields = '__all__'

class AssetSaleSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetSale
        fields = '__all__'

class AssetRetirementSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetRetirement
        fields = '__all__'

class AssetRevaluationSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetRevaluation
        fields = '__all__'

class AssetImpairmentSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetImpairment
        fields = '__all__'

class AssetInventoryAuditSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetInventoryAudit
        fields = '__all__'

class AssetAttachmentSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetAttachment
        fields = '__all__'

class AssetStatisticsSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetStatistics
        fields = '__all__'

class AssetSettingsSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetSettings
        fields = '__all__'

class AssetAuditSerializer(BaseAssetSerializer):
    class Meta(BaseAssetSerializer.Meta):
        model = AssetAudit
        fields = '__all__'
