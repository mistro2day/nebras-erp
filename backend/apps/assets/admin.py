from django.contrib import admin
from apps.assets.domain.models import (
    Asset, AssetCategory, AssetClass, AssetGroup, AssetLocation,
    AssetAssignment, AssetCustodian, AssetWarranty, AssetInsurance,
    AssetAcquisition, AssetCapitalization, AssetDepreciation,
    AssetTransfer, AssetDisposal, AssetSettings
)

@admin.register(AssetCategory)
class AssetCategoryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'name_en', 'tenant_id')
    search_fields = ('code', 'name_ar', 'name_en')

@admin.register(AssetLocation)
class AssetLocationAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'building', 'floor', 'room', 'tenant_id')
    search_fields = ('code', 'name_ar')

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('asset_number', 'name_ar', 'category', 'location', 'acquisition_cost', 'book_value', 'status')
    list_filter = ('status', 'category', 'location')
    search_fields = ('asset_number', 'name_ar', 'serial_number')

@admin.register(AssetDepreciation)
class AssetDepreciationAdmin(admin.ModelAdmin):
    list_display = ('asset', 'depreciation_date', 'depreciation_amount', 'accumulated_depreciation', 'book_value_after')
    list_filter = ('depreciation_date',)

@admin.register(AssetDisposal)
class AssetDisposalAdmin(admin.ModelAdmin):
    list_display = ('asset', 'disposal_type', 'disposal_date', 'disposal_proceeds', 'gain_loss', 'status')
    list_filter = ('disposal_type', 'status')

@admin.register(AssetTransfer)
class AssetTransferAdmin(admin.ModelAdmin):
    list_display = ('asset', 'from_location', 'to_location', 'transfer_date', 'status')
    list_filter = ('status',)

admin.site.register(AssetClass)
admin.site.register(AssetGroup)
admin.site.register(AssetAssignment)
admin.site.register(AssetCustodian)
admin.site.register(AssetWarranty)
admin.site.register(AssetInsurance)
admin.site.register(AssetAcquisition)
admin.site.register(AssetCapitalization)
admin.site.register(AssetSettings)
