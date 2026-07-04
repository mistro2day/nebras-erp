import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from apps.maintenance.domain.models import (
    MaintenanceCategory, MaintenancePriority, MaintenanceType, MaintenanceRequest,
    WorkOrder, MaintenancePlan, PreventiveSchedule, MaintenanceCost, MaterialConsumption
)
from apps.assets.domain.models import Asset, AssetCategory, AssetLocation
from apps.inventory.domain.models import Warehouse, InventoryItem, InventoryUnit
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, Currency, AccountType, AccountCategory
from apps.maintenance.application.services import WorkOrderService, PreventiveMaintenanceService, MaintenanceCostService

class MaintenanceTestCase(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # 1. إعداد العملة والفترة المالية والمحاسبية لنجاح القيد المالي
        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id,
            code="SAR",
            name_ar="ريال سعودي",
            name_en="Saudi Riyal",
            symbol="SR",
            is_base=True
        )
        self.fiscal_year = FiscalYear.objects.create(
            tenant_id=self.tenant_id,
            name="2026",
            start_date=timezone.datetime(2026, 1, 1).date(),
            end_date=timezone.datetime(2026, 12, 31).date(),
            status='open',
            is_current=True
        )
        self.period = AccountingPeriod.objects.create(
            tenant_id=self.tenant_id,
            fiscal_year=self.fiscal_year,
            name="Full Year 2026",
            start_date=timezone.datetime(2026, 1, 1).date(),
            end_date=timezone.datetime(2026, 12, 31).date(),
            status='open'
        )

        # الحسابات المالية والتصنيفات
        self.type_asset = AccountType.objects.create(
            tenant_id=self.tenant_id, code='asset', name_ar='أصول', name_en='Assets', normal_balance='debit'
        )
        self.type_expense = AccountType.objects.create(
            tenant_id=self.tenant_id, code='expense', name_ar='مصروفات', name_en='Expenses', normal_balance='debit'
        )
        self.type_liability = AccountType.objects.create(
            tenant_id=self.tenant_id, code='liability', name_ar='خصوم', name_en='Liabilities', normal_balance='credit'
        )
        self.cat_current = AccountCategory.objects.create(
            tenant_id=self.tenant_id, code='current_assets', name_ar='أصول متداولة', name_en='Current Assets', account_type=self.type_asset
        )

        self.maint_expense_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="320202",
            name_ar="مصروفات صيانة وإصلاح",
            name_en="Maintenance Expenses",
            account_type=self.type_expense,
            account_category=self.cat_current,
            normal_balance='debit',
            status='active'
        )
        self.offset_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="210202",
            name_ar="حساب وسيط صيانة",
            name_en="Maintenance Offset",
            account_type=self.type_liability,
            account_category=self.cat_current,
            normal_balance='credit',
            status='active'
        )

        # 2. إعداد الأصل والفئات اللازمة
        self.asset_category = AssetCategory.objects.create(
            tenant_id=self.tenant_id,
            code="HVAC",
            name_ar="أنظمة تكييف وتبريد",
            name_en="HVAC Systems"
        )
        self.asset_location = AssetLocation.objects.create(
            tenant_id=self.tenant_id,
            code="CAMPUS-A",
            name_ar="الحرم الجامعي أ",
            name_en="Campus A"
        )
        self.asset = Asset.objects.create(
            tenant_id=self.tenant_id,
            asset_number="AST-MNT-100",
            name_ar="جهاز تكييف مركزي شيلر Carrier",
            name_en="Carrier Central Chiller HVAC",
            category=self.asset_category,
            location=self.asset_location,
            acquisition_cost=Decimal('50000.00'),
            salvage_value=Decimal('5000.00'),
            book_value=Decimal('50000.00'),
            useful_life_months=60,
            status='capitalized'
        )

        # 3. إعداد تصنيف وأولويات بلاغات الصيانة
        self.category = MaintenanceCategory.objects.create(
            tenant_id=self.tenant_id, code="ELEC", name_ar="كهربائية", name_en="Electrical"
        )
        self.priority = MaintenancePriority.objects.create(
            tenant_id=self.tenant_id, code="HIGH", name_ar="عالية جداً", name_en="High Priority"
        )
        self.maint_type = MaintenanceType.objects.create(
            tenant_id=self.tenant_id, code="CORR", name_ar="علاجية/طارئة", name_en="Corrective"
        )

    def test_maintenance_lifecycle_work_order_and_financial_posting(self):
        # 1. تسجيل طلب صيانة
        request = MaintenanceRequest.objects.create(
            tenant_id=self.tenant_id,
            request_number="REQ-2026-0001",
            asset=self.asset,
            category=self.category,
            priority=self.priority,
            maint_type=self.maint_type,
            reported_by_user_id=uuid.uuid4(),
            title="تسريب مياه وفشل التبريد بالشيلر",
            description="يوجد تسريب مياه واضح مع انخفاض كفاءة التبريد في شيلر Carrier الرئيسي.",
            status='submitted'
        )

        # 2. إنشاء أمر عمل
        wo = WorkOrder.objects.create(
            tenant_id=self.tenant_id,
            wo_number="WO-2026-0001",
            request=request,
            asset=self.asset,
            status='assigned',
            scheduled_start=timezone.now()
        )

        # 3. محاكاة تسجيل تكلفة وإغلاق أمر العمل الفني
        completed_wo = WorkOrderService.complete_work_order(
            tenant_id=self.tenant_id,
            work_order_id=wo.id,
            actual_hours=5.5,
            summary="تم إصلاح تسريب الأنابيب وإعادة تعبئة الفريون واختبار الشيلر بنجاح."
        )

        self.assertEqual(completed_wo.status, 'completed')
        self.assertEqual(completed_wo.actual_labor_hours, Decimal('5.5'))
        self.assertEqual(completed_wo.request.status, 'completed')

        # 4. ترحيل التكاليف ماليّاً (سند تكلفة صيانة يدوي أو مقدر)
        cost_record = MaintenanceCost.objects.create(
            tenant_id=self.tenant_id,
            work_order=wo,
            labor_cost=Decimal('500.00'),
            material_cost=Decimal('250.00'),
            total_cost=Decimal('750.00')
        )

        posted_cost = MaintenanceCostService.post_maintenance_costs_to_finance(
            tenant_id=self.tenant_id,
            work_order_id=wo.id,
            maintenance_expense_gl_account_id=self.maint_expense_account.id,
            offset_gl_account_id=self.offset_account.id
        )

        self.assertIsNotNone(posted_cost.journal_entry_id)

    def test_preventive_maintenance_schedule_generation(self):
        plan = MaintenancePlan.objects.create(
            tenant_id=self.tenant_id,
            name_ar="خطة فحص شيلر Carrier ربع السنوية",
            name_en="Quarterly Carrier Chiller Plan",
            category=self.category,
            frequency_days=90
        )
        
        PreventiveSchedule.objects.create(
            tenant_id=self.tenant_id,
            plan=plan,
            asset=self.asset,
            next_due_date=timezone.now().date(),
            is_active=True
        )

        generated_orders = PreventiveMaintenanceService.generate_preventive_work_orders(
            tenant_id=self.tenant_id,
            run_date=timezone.now().date()
        )

        self.assertEqual(len(generated_orders), 1)
        self.assertTrue(generated_orders[0].wo_number.startswith("PM-AST-MNT-100"))
