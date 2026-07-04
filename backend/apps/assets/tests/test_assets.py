import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from apps.assets.domain.models import (
    Asset, AssetCategory, AssetLocation, AssetCapitalization, AssetDepreciation, AssetDisposal
)
from apps.assets.application.services import AssetService, DepreciationService, DisposalService

# استيرادات الحسابات العامة
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, Currency, AccountType, AccountCategory

class FixedAssetsTestCase(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # 1. إعداد العملة والسنوات المالية والمحاسبية لنجاح التكامل المالي
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
            name="Jan 2026",
            start_date=timezone.datetime(2026, 1, 1).date(),
            end_date=timezone.datetime(2026, 1, 31).date(),
            status='open'
        )

        # أنواع الحسابات والتصنيفات
        self.type_asset = AccountType.objects.create(
            tenant_id=self.tenant_id, code='asset', name_ar='أصول', name_en='Assets', normal_balance='debit'
        )
        self.type_liability = AccountType.objects.create(
            tenant_id=self.tenant_id, code='liability', name_ar='خصوم', name_en='Liabilities', normal_balance='credit'
        )
        self.type_expense = AccountType.objects.create(
            tenant_id=self.tenant_id, code='expense', name_ar='مصروفات', name_en='Expenses', normal_balance='debit'
        )
        self.type_revenue = AccountType.objects.create(
            tenant_id=self.tenant_id, code='revenue', name_ar='إيرادات', name_en='Revenues', normal_balance='credit'
        )

        self.cat_current = AccountCategory.objects.create(
            tenant_id=self.tenant_id, code='current_assets', name_ar='أصول متداولة', name_en='Current Assets', account_type=self.type_asset
        )

        # 2. إنشاء شجرة حسابات مبسطة للاختبار
        self.asset_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="120101",
            name_ar="حساب أصول - حواسيب",
            name_en="Fixed Assets - Computers",
            account_type=self.type_asset,
            account_category=self.cat_current,
            normal_balance='debit',
            status='active'
        )
        self.offset_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="210101",
            name_ar="حساب وسيط اقتناء أصول",
            name_en="Asset Acquisition Offset",
            account_type=self.type_liability,
            account_category=self.cat_current,
            normal_balance='credit',
            status='active'
        )
        self.depr_expense_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="320101",
            name_ar="مصروف إهلاك أصول",
            name_en="Depreciation Expense",
            account_type=self.type_expense,
            account_category=self.cat_current,
            normal_balance='debit',
            status='active'
        )
        self.accum_depr_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="120901",
            name_ar="مجمع إهلاك حواسيب",
            name_en="Accumulated Depreciation",
            account_type=self.type_asset,
            account_category=self.cat_current,
            normal_balance='credit',
            status='active'
        )
        self.loss_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="330101",
            name_ar="خسائر استبعاد أصول",
            name_en="Loss on Disposal",
            account_type=self.type_expense,
            account_category=self.cat_current,
            normal_balance='debit',
            status='active'
        )

        # 3. إعداد فئة أصول وموقع أصول
        self.category = AssetCategory.objects.create(
            tenant_id=self.tenant_id,
            code="COMP",
            name_ar="أجهزة حاسب آلي",
            name_en="Computers"
        )
        self.location = AssetLocation.objects.create(
            tenant_id=self.tenant_id,
            code="HQ-R10",
            name_ar="المقر الرئيسي - مكتب 10",
            name_en="HQ Room 10"
        )

        # 4. تسجيل أصل ثابت جديد غير مرسمل بعد
        self.asset = Asset.objects.create(
            tenant_id=self.tenant_id,
            asset_number="AST-2026-0001",
            name_ar="جهاز خادم رئيسي IBM",
            name_en="IBM Mainframe Server",
            category=self.category,
            location=self.location,
            acquisition_cost=Decimal('12000.00'),
            salvage_value=Decimal('2000.00'),
            book_value=Decimal('12000.00'),
            useful_life_months=10,
            status='registered'
        )

    def test_asset_lifecycle_capitalization_depreciation_and_disposal(self):
        # --- 1. اختبار الرسملة (Capitalization) ---
        cap_date = timezone.datetime(2026, 1, 15).date()
        cap = AssetService.capitalize_asset(
            tenant_id=self.tenant_id,
            asset_id=self.asset.id,
            capitalization_date=cap_date,
            asset_gl_account_id=self.asset_account.id,
            offset_gl_account_id=self.offset_account.id
        )

        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, 'capitalized')
        self.assertEqual(self.asset.book_value, Decimal('12000.00'))
        self.assertIsNotNone(cap.journal_entry_id)

        # --- 2. اختبار الإهلاك الشهري القسط الثابت (Depreciation) ---
        # القيمة القابلة للإهلاك: 12000 - 2000 = 10000 ريال
        # القسط الشهري (10 أشهر): 10000 / 10 = 1000 ريال
        run_date = timezone.datetime(2026, 1, 31).date()
        depr = DepreciationService.calculate_and_post_depreciation(
            tenant_id=self.tenant_id,
            asset_id=self.asset.id,
            run_date=run_date,
            depr_expense_gl_account_id=self.depr_expense_account.id,
            accum_depr_gl_account_id=self.accum_depr_account.id
        )

        self.asset.refresh_from_db()
        self.assertEqual(self.asset.book_value, Decimal('11000.00'))
        self.assertEqual(depr.depreciation_amount, Decimal('1000.00'))
        self.assertEqual(depr.accumulated_depreciation, Decimal('1000.00'))
        self.assertIsNotNone(depr.journal_entry_id)

        # --- 3. اختبار الاستبعاد (Disposal) ---
        # القيمة الدفترية حالياً: 11000 ريال
        # نبيع الأصل بسعر 8000 ريال -> خسائر رأسمالية بقيمة 3000 ريال
        disp_date = timezone.datetime(2026, 1, 31).date()
        disp = DisposalService.dispose_asset(
            tenant_id=self.tenant_id,
            asset_id=self.asset.id,
            disposal_type='sale',
            proceeds=Decimal('8000.00'),
            run_date=disp_date,
            disposal_expense_gl_account_id=self.loss_account.id,
            asset_gl_account_id=self.asset_account.id,
            accum_depr_gl_account_id=self.accum_depr_account.id
        )

        self.asset.refresh_from_db()
        self.assertEqual(self.asset.status, 'disposed')
        self.assertEqual(self.asset.book_value, Decimal('0.00'))
        self.assertEqual(disp.gain_loss, Decimal('-3000.00'))
        self.assertIsNotNone(disp.journal_entry_id)
