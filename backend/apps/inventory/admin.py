from django.contrib import admin
from apps.inventory.domain.models import (
    Warehouse, WarehouseZone, WarehouseAisle, BinLocation, InventoryCategory,
    InventoryUnit, InventoryItem, InventoryBatch, InventoryLot, SerialNumber,
    InventoryBalance, InventoryTransaction, InventoryReservation, InventoryAdjustment,
    GoodsReceipt, GoodsReceiptItem, GoodsIssue, GoodsIssueItem, InventoryTransfer,
    StockCount, StockCountItem, StockMovement, InventoryValuation, ReorderRule,
    InventorySettings, InventoryStatistics, InventoryAudit
)

@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'name_en', 'code', 'is_virtual', 'is_default')
    list_filter = ('is_virtual', 'is_default')
    search_fields = ('name_ar', 'name_en', 'code')

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'sku', 'barcode', 'item_type', 'category', 'uom')
    list_filter = ('item_type', 'category')
    search_fields = ('name_ar', 'sku', 'barcode')

@admin.register(InventoryBalance)
class InventoryBalanceAdmin(admin.ModelAdmin):
    list_display = ('item', 'warehouse', 'bin_location', 'qty_on_hand', 'qty_reserved', 'qty_available')
    list_filter = ('warehouse',)
    search_fields = ('item__name_ar', 'item__sku')

class GoodsReceiptItemInline(admin.TabularInline):
    model = GoodsReceiptItem
    extra = 1

@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'warehouse', 'received_date', 'status')
    list_filter = ('status', 'received_date')
    search_fields = ('receipt_number',)
    inlines = [GoodsReceiptItemInline]

class GoodsIssueItemInline(admin.TabularInline):
    model = GoodsIssueItem
    extra = 1

@admin.register(GoodsIssue)
class GoodsIssueAdmin(admin.ModelAdmin):
    list_display = ('issue_number', 'warehouse', 'issue_date', 'status', 'issue_type')
    list_filter = ('status', 'issue_date', 'issue_type')
    search_fields = ('issue_number',)
    inlines = [GoodsIssueItemInline]

@admin.register(InventoryAdjustment)
class InventoryAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('adjustment_number', 'warehouse', 'date', 'status')
    list_filter = ('status', 'date')
    search_fields = ('adjustment_number', 'reason')

admin.site.register(WarehouseZone)
admin.site.register(WarehouseAisle)
admin.site.register(BinLocation)
admin.site.register(InventoryCategory)
admin.site.register(InventoryUnit)
admin.site.register(InventoryBatch)
admin.site.register(InventoryLot)
admin.site.register(SerialNumber)
admin.site.register(InventoryTransaction)
admin.site.register(InventoryReservation)
admin.site.register(InventoryTransfer)
admin.site.register(StockCount)
admin.site.register(StockCountItem)
admin.site.register(StockMovement)
admin.site.register(InventoryValuation)
admin.site.register(ReorderRule)
admin.site.register(InventorySettings)
admin.site.register(InventoryStatistics)
admin.site.register(InventoryAudit)
