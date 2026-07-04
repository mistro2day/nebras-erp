from rest_framework import serializers
from apps.inventory.domain.models import (
    Warehouse, WarehouseZone, WarehouseAisle, BinLocation, InventoryCategory,
    InventoryUnit, InventoryItem, InventoryBatch, InventoryLot, SerialNumber,
    InventoryBalance, InventoryTransaction, InventoryReservation, InventoryAdjustment,
    GoodsReceipt, GoodsReceiptItem, GoodsIssue, GoodsIssueItem, InventoryTransfer,
    StockCount, StockCountItem, StockMovement, InventoryValuation, ReorderRule,
    InventorySettings, InventoryStatistics, InventoryAudit
)

class BaseInventorySerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class WarehouseSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = Warehouse
        fields = '__all__'

class WarehouseZoneSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = WarehouseZone
        fields = '__all__'

class WarehouseAisleSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = WarehouseAisle
        fields = '__all__'

class BinLocationSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = BinLocation
        fields = '__all__'

class InventoryCategorySerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryCategory
        fields = '__all__'

class InventoryUnitSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryUnit
        fields = '__all__'

class InventoryItemSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryItem
        fields = '__all__'

class InventoryBatchSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryBatch
        fields = '__all__'

class InventoryLotSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryLot
        fields = '__all__'

class SerialNumberSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = SerialNumber
        fields = '__all__'

class InventoryBalanceSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryBalance
        fields = '__all__'

class InventoryTransactionSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryTransaction
        fields = '__all__'

class InventoryReservationSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryReservation
        fields = '__all__'

class InventoryAdjustmentSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryAdjustment
        fields = '__all__'

class GoodsReceiptItemSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = GoodsReceiptItem
        fields = '__all__'

class GoodsReceiptSerializer(BaseInventorySerializer):
    items = GoodsReceiptItemSerializer(many=True, read_only=True)

    class Meta(BaseInventorySerializer.Meta):
        model = GoodsReceipt
        fields = '__all__'

class GoodsIssueItemSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = GoodsIssueItem
        fields = '__all__'

class GoodsIssueSerializer(BaseInventorySerializer):
    items = GoodsIssueItemSerializer(many=True, read_only=True)

    class Meta(BaseInventorySerializer.Meta):
        model = GoodsIssue
        fields = '__all__'

class InventoryTransferSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryTransfer
        fields = '__all__'

class StockCountItemSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = StockCountItem
        fields = '__all__'

class StockCountSerializer(BaseInventorySerializer):
    items = StockCountItemSerializer(many=True, read_only=True)

    class Meta(BaseInventorySerializer.Meta):
        model = StockCount
        fields = '__all__'

class StockMovementSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = StockMovement
        fields = '__all__'

class InventoryValuationSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryValuation
        fields = '__all__'

class ReorderRuleSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = ReorderRule
        fields = '__all__'

class InventorySettingsSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventorySettings
        fields = '__all__'

class InventoryStatisticsSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryStatistics
        fields = '__all__'

class InventoryAuditSerializer(BaseInventorySerializer):
    class Meta(BaseInventorySerializer.Meta):
        model = InventoryAudit
        fields = '__all__'
