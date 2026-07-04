from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.inventory.interfaces.views import (
    WarehouseViewSet, WarehouseZoneViewSet, WarehouseAisleViewSet,
    BinLocationViewSet, InventoryCategoryViewSet, InventoryUnitViewSet,
    InventoryItemViewSet, InventoryBatchViewSet, InventoryLotViewSet,
    SerialNumberViewSet, InventoryBalanceViewSet, InventoryTransactionViewSet,
    InventoryReservationViewSet, InventoryAdjustmentViewSet, GoodsReceiptViewSet,
    GoodsReceiptItemViewSet, GoodsIssueViewSet, GoodsIssueItemViewSet,
    InventoryTransferViewSet, StockCountViewSet, StockCountItemViewSet,
    StockMovementViewSet, InventoryValuationViewSet, ReorderRuleViewSet,
    InventorySettingsViewSet, InventoryStatisticsViewSet, InventoryAuditViewSet
)

router = DefaultRouter()
router.register('warehouses', WarehouseViewSet, basename='warehouse')
router.register('zones', WarehouseZoneViewSet, basename='zone')
router.register('aisles', WarehouseAisleViewSet, basename='aisle')
router.register('bins', BinLocationViewSet, basename='bin')
router.register('categories', InventoryCategoryViewSet, basename='category')
router.register('units', InventoryUnitViewSet, basename='unit')
router.register('items', InventoryItemViewSet, basename='item')
router.register('batches', InventoryBatchViewSet, basename='batch')
router.register('lots', InventoryLotViewSet, basename='lot')
router.register('serials', SerialNumberViewSet, basename='serial')
router.register('balances', InventoryBalanceViewSet, basename='balance')
router.register('transactions', InventoryTransactionViewSet, basename='transaction')
router.register('reservations', InventoryReservationViewSet, basename='reservation')
router.register('adjustments', InventoryAdjustmentViewSet, basename='adjustment')
router.register('receipts', GoodsReceiptViewSet, basename='receipt')
router.register('receipt-items', GoodsReceiptItemViewSet, basename='receipt-item')
router.register('issues', GoodsIssueViewSet, basename='issue')
router.register('issue-items', GoodsIssueItemViewSet, basename='issue-item')
router.register('transfers', InventoryTransferViewSet, basename='transfer')
router.register('counts', StockCountViewSet, basename='count')
router.register('count-items', StockCountItemViewSet, basename='count-item')
router.register('movements', StockMovementViewSet, basename='movement')
router.register('valuations', InventoryValuationViewSet, basename='valuation')
router.register('reorder-rules', ReorderRuleViewSet, basename='reorder-rule')
router.register('settings', InventorySettingsViewSet, basename='settings')
router.register('statistics', InventoryStatisticsViewSet, basename='statistics')
router.register('audits', InventoryAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
