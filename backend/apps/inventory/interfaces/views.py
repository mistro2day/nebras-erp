from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.inventory.domain.models import (
    Warehouse, WarehouseZone, WarehouseAisle, BinLocation, InventoryCategory,
    InventoryUnit, InventoryItem, InventoryBatch, InventoryLot, SerialNumber,
    InventoryBalance, InventoryTransaction, InventoryReservation, InventoryAdjustment,
    GoodsReceipt, GoodsReceiptItem, GoodsIssue, GoodsIssueItem, InventoryTransfer,
    StockCount, StockCountItem, StockMovement, InventoryValuation, ReorderRule,
    InventorySettings, InventoryStatistics, InventoryAudit
)
from apps.inventory.interfaces.serializers import (
    WarehouseSerializer, WarehouseZoneSerializer, WarehouseAisleSerializer,
    BinLocationSerializer, InventoryCategorySerializer, InventoryUnitSerializer,
    InventoryItemSerializer, InventoryBatchSerializer, InventoryLotSerializer,
    SerialNumberSerializer, InventoryBalanceSerializer, InventoryTransactionSerializer,
    InventoryReservationSerializer, InventoryAdjustmentSerializer, GoodsReceiptSerializer,
    GoodsReceiptItemSerializer, GoodsIssueSerializer, GoodsIssueItemSerializer,
    InventoryTransferSerializer, StockCountSerializer, StockCountItemSerializer,
    StockMovementSerializer, InventoryValuationSerializer, ReorderRuleSerializer,
    InventorySettingsSerializer, InventoryStatisticsSerializer, InventoryAuditSerializer
)
from apps.inventory.application.services import (
    GoodsReceiptService, GoodsIssueService, InventoryAdjustmentService
)


class WarehouseViewSet(BaseCRUDViewSet):
    model_class = Warehouse
    serializer_class = WarehouseSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'code']


class WarehouseZoneViewSet(BaseCRUDViewSet):
    model_class = WarehouseZone
    serializer_class = WarehouseZoneSerializer


class WarehouseAisleViewSet(BaseCRUDViewSet):
    model_class = WarehouseAisle
    serializer_class = WarehouseAisleSerializer


class BinLocationViewSet(BaseCRUDViewSet):
    model_class = BinLocation
    serializer_class = BinLocationSerializer


class InventoryCategoryViewSet(BaseCRUDViewSet):
    model_class = InventoryCategory
    serializer_class = InventoryCategorySerializer


class InventoryUnitViewSet(BaseCRUDViewSet):
    model_class = InventoryUnit
    serializer_class = InventoryUnitSerializer


class InventoryItemViewSet(BaseCRUDViewSet):
    model_class = InventoryItem
    serializer_class = InventoryItemSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'sku', 'barcode']

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم المستودعات وحالة المخزون."""
        tenant_id = request.tenant_id
        
        total_items = InventoryItem.objects.filter(tenant_id=tenant_id).count()
        total_warehouses = Warehouse.objects.filter(tenant_id=tenant_id, is_virtual=False).count()

        stats_record = InventoryStatistics.objects.filter(tenant_id=tenant_id).first()
        total_value = stats_record.total_stock_value if stats_record else 0.0
        out_of_stock = stats_record.out_of_stock_items if stats_record else 0
        low_stock = stats_record.low_stock_items if stats_record else 0

        stats = {
            'total_items': total_items,
            'total_warehouses': total_warehouses,
            'total_value': float(total_value),
            'out_of_stock': out_of_stock,
            'low_stock': low_stock,
            'pending_transfers': InventoryTransfer.objects.filter(tenant_id=tenant_id, status='pending').count(),
            'pending_adjustments': InventoryAdjustment.objects.filter(tenant_id=tenant_id, status='pending').count()
        }
        return Response(stats, status=status.HTTP_200_OK)


class InventoryBatchViewSet(BaseCRUDViewSet):
    model_class = InventoryBatch
    serializer_class = InventoryBatchSerializer


class InventoryLotViewSet(BaseCRUDViewSet):
    model_class = InventoryLot
    serializer_class = InventoryLotSerializer


class SerialNumberViewSet(BaseCRUDViewSet):
    model_class = SerialNumber
    serializer_class = SerialNumberSerializer


class InventoryBalanceViewSet(BaseCRUDViewSet):
    model_class = InventoryBalance
    serializer_class = InventoryBalanceSerializer


class InventoryTransactionViewSet(BaseCRUDViewSet):
    model_class = InventoryTransaction
    serializer_class = InventoryTransactionSerializer


class InventoryReservationViewSet(BaseCRUDViewSet):
    model_class = InventoryReservation
    serializer_class = InventoryReservationSerializer


class InventoryAdjustmentViewSet(BaseCRUDViewSet):
    model_class = InventoryAdjustment
    serializer_class = InventoryAdjustmentSerializer

    @action(detail=False, methods=['post'], url_path='adjust-stock')
    def adjust_stock(self, request):
        tenant_id = request.tenant_id
        warehouse_id = request.data.get('warehouse_id')
        items = request.data.get('items', [])
        reason = request.data.get('reason', '')

        if not warehouse_id or not items:
            return Response({'error': 'warehouse_id and items are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            adj = InventoryAdjustmentService.adjust_stock(
                tenant_id=tenant_id,
                warehouse_id=warehouse_id,
                items_data=items,
                reason=reason,
                user_id=request.user.id if request.user else None
            )
        except DjangoValidationError as exc:
            return Response({'error': '، '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(adj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GoodsReceiptViewSet(BaseCRUDViewSet):
    model_class = GoodsReceipt
    serializer_class = GoodsReceiptSerializer

    @action(detail=False, methods=['post'], url_path='receive-po')
    def receive_po(self, request):
        tenant_id = request.tenant_id
        purchase_order_id = request.data.get('purchase_order_id')
        warehouse_id = request.data.get('warehouse_id')
        items = request.data.get('items', [])

        if not purchase_order_id or not warehouse_id or not items:
            return Response({'error': 'purchase_order_id, warehouse_id, and items are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gr = GoodsReceiptService.receive_from_purchase_order(
                tenant_id=tenant_id,
                po_id=purchase_order_id,
                warehouse_id=warehouse_id,
                items_data=items,
                user_id=request.user.id if request.user else None
            )
        except DjangoValidationError as exc:
            return Response({'error': '، '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(gr)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GoodsReceiptItemViewSet(BaseCRUDViewSet):
    model_class = GoodsReceiptItem
    serializer_class = GoodsReceiptItemSerializer


class GoodsIssueViewSet(BaseCRUDViewSet):
    model_class = GoodsIssue
    serializer_class = GoodsIssueSerializer

    @action(detail=False, methods=['post'], url_path='issue-stock')
    def issue_stock(self, request):
        tenant_id = request.tenant_id
        warehouse_id = request.data.get('warehouse_id')
        issue_type = request.data.get('issue_type', 'department')
        items = request.data.get('items', [])

        if not warehouse_id or not items:
            return Response({'error': 'warehouse_id and items are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gi = GoodsIssueService.issue_stock(
                tenant_id=tenant_id,
                warehouse_id=warehouse_id,
                issue_type=issue_type,
                items_data=items,
                user_id=request.user.id if request.user else None
            )
        except DjangoValidationError as exc:
            # قواعد العمل (رصيد غير كافٍ مثلاً) خطأ مستخدم لا خطأ خادم
            return Response({'error': '، '.join(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(gi)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GoodsIssueItemViewSet(BaseCRUDViewSet):
    model_class = GoodsIssueItem
    serializer_class = GoodsIssueItemSerializer


class InventoryTransferViewSet(BaseCRUDViewSet):
    model_class = InventoryTransfer
    serializer_class = InventoryTransferSerializer


class StockCountViewSet(BaseCRUDViewSet):
    model_class = StockCount
    serializer_class = StockCountSerializer


class StockCountItemViewSet(BaseCRUDViewSet):
    model_class = StockCountItem
    serializer_class = StockCountItemSerializer


class StockMovementViewSet(BaseCRUDViewSet):
    model_class = StockMovement
    serializer_class = StockMovementSerializer


class InventoryValuationViewSet(BaseCRUDViewSet):
    model_class = InventoryValuation
    serializer_class = InventoryValuationSerializer


class ReorderRuleViewSet(BaseCRUDViewSet):
    model_class = ReorderRule
    serializer_class = ReorderRuleSerializer


class InventorySettingsViewSet(BaseCRUDViewSet):
    model_class = InventorySettings
    serializer_class = InventorySettingsSerializer


class InventoryStatisticsViewSet(BaseCRUDViewSet):
    model_class = InventoryStatistics
    serializer_class = InventoryStatisticsSerializer


class InventoryAuditViewSet(BaseCRUDViewSet):
    model_class = InventoryAudit
    serializer_class = InventoryAuditSerializer
