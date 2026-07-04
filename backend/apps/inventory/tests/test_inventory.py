import uuid
from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.utils import timezone
from django.core.exceptions import ValidationError

# استيراد نماذج وخدمات المالية
from apps.finance.domain.models import (
    Currency, ChartOfAccount, AccountType, FiscalYear, AccountingPeriod, CostCenter, Budget, BudgetItem
)

# استيراد المشتريات والمخازن
from apps.procurement.domain.models import VendorCategory, Vendor, PurchaseRequest, PurchaseOrder, PurchaseOrderItem
from apps.inventory.domain.models import (
    Warehouse, InventoryCategory, InventoryUnit, InventoryItem, InventoryBalance, GoodsReceipt, GoodsIssue
)
from apps.inventory.application.services import (
    GoodsReceiptService, GoodsIssueService, InventoryAdjustmentService
)


class InventoryWorkflowTests(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

        # 1. إعداد العملة والمالية
        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id,
            code='SAR',
            name_ar='ريال سعودي',
            name_en='Saudi Riyal',
            symbol='SR',
            is_base=True
        )

        self.fiscal_year = FiscalYear.objects.create(
            tenant_id=self.tenant_id,
            name='عام 2026',
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status='open',
            is_current=True
        )
        self.period = AccountingPeriod.objects.create(
            tenant_id=self.tenant_id,
            fiscal_year=self.fiscal_year,
            name='يناير 2026',
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status='open'
        )

        # حسابات مالية
        self.acc_type_asset = AccountType.objects.create(
            tenant_id=self.tenant_id, code='asset', name_ar='الأصول', name_en='Assets', normal_balance='debit'
        )
        self.acc_type_liability = AccountType.objects.create(
            tenant_id=self.tenant_id, code='liability', name_ar='الالتزامات', name_en='Liabilities', normal_balance='credit'
        )
        self.acc_type_expense = AccountType.objects.create(
            tenant_id=self.tenant_id, code='expense', name_ar='المصروفات', name_en='Expenses', normal_balance='debit'
        )

        self.inventory_asset_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='120101',
            name_ar='حساب المخزون',
            name_en='Inventory Asset',
            account_type=self.acc_type_asset,
            normal_balance='debit',
            status='active'
        )
        self.creditors_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='210101',
            name_ar='حساب الموردين',
            name_en='Accounts Payable',
            account_type=self.acc_type_liability,
            normal_balance='credit',
            status='active'
        )
        self.expense_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='510101',
            name_ar='مصاريف استهلاك مخزني',
            name_en='Inventory Expense',
            account_type=self.acc_type_expense,
            normal_balance='debit',
            status='active'
        )

        self.cost_center = CostCenter.objects.create(
            tenant_id=self.tenant_id,
            code='CC-ADMIN',
            name_ar='الإدارة العامة',
            name_en='General Administration',
            type='department',
            status='active'
        )

        # 2. إعداد المورد وأمر الشراء
        self.vendor_cat = VendorCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='أجهزة إلكترونية', name_en='Electronics', code='electronics'
        )
        self.vendor = Vendor.objects.create(
            tenant_id=self.tenant_id,
            category=self.vendor_cat,
            name_ar='شركة تقنية المعلومات المحدودة',
            name_en='IT Solutions Co.',
            status='approved'
        )

        self.pr = PurchaseRequest.objects.create(
            tenant_id=self.tenant_id,
            request_number='PR-9999',
            department_id=uuid.uuid4(),
            requested_by=self.user_id,
            status='approved',
            reason='حواسيب محمولة للقسم'
        )

        self.po = PurchaseOrder.objects.create(
            tenant_id=self.tenant_id,
            po_number='PO-7777',
            purchase_request=self.pr,
            vendor=self.vendor,
            status='approved',
            total_amount=Decimal('50000.00')
        )

        # 3. إعداد المستودعات والأصناف
        self.warehouse = Warehouse.objects.create(
            tenant_id=self.tenant_id,
            name_ar='المستودع الرئيسي',
            name_en='Main Warehouse',
            code='WH-MAIN',
            is_default=True
        )

        self.item_cat = InventoryCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='أجهزة حاسب', name_en='Computers', code='computers'
        )
        self.unit = InventoryUnit.objects.create(
            tenant_id=self.tenant_id, name_ar='حبة', name_en='Piece', code='pcs'
        )
        
        self.item = InventoryItem.objects.create(
            tenant_id=self.tenant_id,
            category=self.item_cat,
            name_ar='حاسوب محمول ThinkPad',
            name_en='ThinkPad Laptop L14',
            sku='TP-L14',
            uom=self.unit,
            item_type='stock'
        )

    def test_goods_receipt_and_issue_lifecycle(self):
        """اختبار دورة الاستلام من أمر الشراء، التخزين، صرف بنود المخزون، والتسوية مع توليد قيود مالية."""
        
        # 1. استلام 10 حواسيب بتكلفة إجمالية 50,000 ريال
        items_data = [{
            'item_id': self.item.id,
            'qty_received': 10,
            'unit_price': 5000.00,
            'budget_account_id': self.inventory_asset_account.id,
            'cost_center_id': self.cost_center.id
        }]

        gr = GoodsReceiptService.receive_from_purchase_order(
            tenant_id=self.tenant_id,
            po_id=self.po.id,
            warehouse_id=self.warehouse.id,
            items_data=items_data,
            user_id=self.user_id
        )

        self.assertEqual(gr.status, 'approved')
        self.po.refresh_from_db()
        self.assertEqual(self.po.status, 'completed')

        # فحص رصيد الصنف بعد الاستلام
        balance = InventoryBalance.objects.get(tenant_id=self.tenant_id, item=self.item, warehouse=self.warehouse)
        self.assertEqual(balance.qty_on_hand, Decimal('10.0000'))

        # 2. صرف 2 حاسوب للقسم
        issue_data = [{
            'item_id': self.item.id,
            'qty_issued': 2,
            'unit_cost': 5000.00,
            'expense_account_id': self.expense_account.id,
            'cost_center_id': self.cost_center.id
        }]

        gi = GoodsIssueService.issue_stock(
            tenant_id=self.tenant_id,
            warehouse_id=self.warehouse.id,
            issue_type='department',
            items_data=issue_data,
            user_id=self.user_id
        )

        self.assertEqual(gi.status, 'approved')
        balance.refresh_from_db()
        self.assertEqual(balance.qty_on_hand, Decimal('8.0000'))

        # 3. تسوية المخزن بالزيادة لمكتشف (حاسوب إضافي)
        adj_data = [{
            'item_id': self.item.id,
            'qty_delta': 1,
            'unit_cost': 5000.00,
            'account_id': self.inventory_asset_account.id,
            'cost_center_id': self.cost_center.id
        }]

        adj = InventoryAdjustmentService.adjust_stock(
            tenant_id=self.tenant_id,
            warehouse_id=self.warehouse.id,
            items_data=adj_data,
            reason='صنف إضافي وجد أثناء الجرد التلقائي',
            user_id=self.user_id
        )

        self.assertEqual(adj.status, 'approved')
        balance.refresh_from_db()
        self.assertEqual(balance.qty_on_hand, Decimal('9.0000'))
