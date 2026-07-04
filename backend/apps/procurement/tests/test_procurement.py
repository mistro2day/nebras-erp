import uuid
from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone

# استيراد نماذج وخدمات المالية والتحقق من الموازنة
from apps.finance.domain.models import (
    Currency, ChartOfAccount, AccountType, FiscalYear, AccountingPeriod, CostCenter, Budget, BudgetItem
)

# استيراد نماذج وخدمات المشتريات
from apps.procurement.domain.models import (
    VendorCategory, Vendor, PurchaseRequest, PurchaseRequestItem, RFQ, Quotation, QuotationItem,
    PurchaseOrder, PurchaseOrderItem
)
from apps.procurement.application.services import ProcurementService, PurchaseOrderService


class ProcurementWorkflowTests(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

        # 1. إعداد العملة
        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id,
            code='SAR',
            name_ar='ريال سعودي',
            name_en='Saudi Riyal',
            symbol='SR',
            is_base=True
        )

        # 2. إعداد السنة المالية والفترة والموازنة بالمالية
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

        self.acc_type_expense = AccountType.objects.create(
            tenant_id=self.tenant_id, code='expense', name_ar='المصروفات', name_en='Expenses', normal_balance='debit'
        )
        self.expense_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='510101',
            name_ar='مصاريف أدوات مكتبية',
            name_en='Office Supplies Expense',
            account_type=self.acc_type_expense,
            normal_balance='debit',
            status='active'
        )
        self.cost_center = CostCenter.objects.create(
            tenant_id=self.tenant_id,
            code='CC-ADMIN',
            name_ar='قسم الإدارة العامة',
            name_en='General Administration',
            type='operational',
            status='active'
        )

        # تخصيص موازنة بقيمة 10000 ريال للمصاريف المكتبية
        self.budget = Budget.objects.create(
            tenant_id=self.tenant_id,
            fiscal_year=self.fiscal_year,
            cost_center=self.cost_center,
            name='موازنة الإدارة العامة',
            status='approved'
        )
        self.budget_item = BudgetItem.objects.create(
            tenant_id=self.tenant_id,
            budget=self.budget,
            account=self.expense_account,
            amount=Decimal('10000.00'),
            consumed_amount=Decimal('0.00')
        )

        # 3. إعداد المورد
        self.vendor_cat = VendorCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='قرطاسية وأدوات مكتبية', name_en='Stationery', code='stationery'
        )
        self.vendor = Vendor.objects.create(
            tenant_id=self.tenant_id,
            category=self.vendor_cat,
            name_ar='شركة مكتبة النبراس',
            name_en='Al-Nebras Library Co.',
            status='approved',
            rating=Decimal('4.50')
        )

    def test_complete_procurement_lifecycle_success(self):
        """نجاح دورة المشتريات بالكامل من طلب الشراء إلى أمر الشراء واستهلاك الموازنة بالمالية."""
        
        # 1. إنشاء طلب شراء لأقلام وأوراق تقديرياً بـ 3000 ريال
        items_data = [{
            'item_name': 'ورق طباعة A4',
            'quantity': 100,
            'unit': 'كرتون',
            'estimated_unit_price': 30.00,
            'budget_account_id': self.expense_account.id,
            'cost_center_id': self.cost_center.id
        }]

        pr = ProcurementService.create_purchase_request(
            tenant_id=self.tenant_id,
            department_id=uuid.uuid4(),
            requested_by=self.user_id,
            items_data=items_data,
            reason='أدوات مكتبية للشركة ربع سنوية'
        )

        self.assertEqual(pr.status, 'draft')
        self.assertEqual(pr.total_estimated_amount, Decimal('3000.00'))

        # 2. اعتماد طلب الشراء
        ProcurementService.approve_purchase_request(self.tenant_id, pr.id, self.user_id)
        pr.refresh_from_db()
        self.assertEqual(pr.status, 'approved')

        # 3. توليد طلب عرض أسعار RFQ
        rfq = ProcurementService.create_rfq_from_request(
            tenant_id=self.tenant_id,
            request_id=pr.id,
            deadline=timezone.now() + timezone.timedelta(days=7)
        )
        self.assertEqual(rfq.status, 'published')
        self.assertEqual(rfq.items.count(), 1)

        # 4. إدخال عرض سعر المورد الفائز بقيمة 2800 ريال (أقل من الميزانية)
        quotation = Quotation.objects.create(
            tenant_id=self.tenant_id,
            rfq=rfq,
            vendor=self.vendor,
            quotation_reference='QT-9922',
            total_amount=Decimal('2800.00')
        )
        q_item = rfq.items.first()
        QuotationItem.objects.create(
            tenant_id=self.tenant_id,
            quotation=quotation,
            rfq_item=q_item,
            unit_price=Decimal('28.00'),
            total_price=Decimal('2800.00')
        )

        # 5. الترسية وتوليد أمر الشراء (PO)
        po = ProcurementService.compare_quotations_and_award(
            tenant_id=self.tenant_id,
            rfq_id=rfq.id,
            vendor_id=self.vendor.id,
            quotation_id=quotation.id,
            user_id=self.user_id
        )

        self.assertEqual(po.status, 'draft')
        self.assertEqual(po.total_amount, Decimal('2800.00'))

        # 6. اعتماد وإصدار أمر الشراء واستهلاك الموازنة الحقيقية
        PurchaseOrderService.issue_purchase_order(self.tenant_id, po.id, self.user_id)
        po.refresh_from_db()
        self.assertEqual(po.status, 'approved')

        # التحقق من استهلاك الموازنة بداخل موديول المالية العام
        self.budget_item.refresh_from_db()
        self.assertEqual(self.budget_item.consumed_amount, Decimal('2800.00'))
