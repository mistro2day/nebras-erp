from django.test import TestCase
from django.core.exceptions import ValidationError
from datetime import date
import uuid

from apps.finance.domain.models import FiscalYear, AccountingPeriod, AccountType, ChartOfAccount, Currency, FinancialClosing
from apps.finance.application.services import ClosingService


class FinanceClosingTests(TestCase):
    """
    اختبارات إغلاق الفترات المحاسبية وإغلاق السنوات المالية وتدوير الأرصدة.
    """

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id, code='SAR', name_ar='ريال سعودي', name_en='Saudi Riyal', symbol='ر.س', is_base=True
        )

        self.fiscal_year = FiscalYear.objects.create(
            tenant_id=self.tenant_id, name='2026', start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), status='open', is_current=True
        )

        self.period1 = AccountingPeriod.objects.create(
            tenant_id=self.tenant_id, fiscal_year=self.fiscal_year, name='يناير 2026', start_date=date(2026, 1, 1), end_date=date(2026, 1, 31), status='open'
        )
        self.period2 = AccountingPeriod.objects.create(
            tenant_id=self.tenant_id, fiscal_year=self.fiscal_year, name='فبراير 2026', start_date=date(2026, 2, 1), end_date=date(2026, 2, 28), status='open'
        )

        self.type_equity = AccountType.objects.create(
            tenant_id=self.tenant_id, code='equity', name_ar='حقوق ملكية', name_en='Equity', normal_balance='credit'
        )
        self.retained_earnings = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id, code='3301', name_ar='الأرباح المحتجزة', name_en='Retained Earnings', account_type=self.type_equity
        )

    def test_close_accounting_period_success(self):
        """نجاح إغلاق الفترة المحاسبية وتغيير حالتها إلى closed."""
        period = ClosingService.close_period(self.tenant_id, self.period1.id, self.user_id)

        self.assertEqual(period.status, 'closed')
        self.assertTrue(FinancialClosing.objects.filter(tenant_id=self.tenant_id, closed_period=period).exists())

    def test_close_fiscal_year_raises_error_if_periods_are_open(self):
        """يُمنع إغلاق السنة المالية إذا كانت هناك فترات محاسبية مفتوحة."""
        # كلا الفترتين period1 و period2 مفتوحتان
        with self.assertRaises(ValidationError):
            ClosingService.close_fiscal_year(self.tenant_id, self.fiscal_year.id, self.retained_earnings.id, self.user_id)

    def test_close_fiscal_year_success(self):
        """نجاح إغلاق السنة المالية بالكامل بعد إغلاق كافة الفترات التابعة لها."""
        ClosingService.close_period(self.tenant_id, self.period1.id, self.user_id)
        ClosingService.close_period(self.tenant_id, self.period2.id, self.user_id)

        # إغلاق السنة المالية
        fy = ClosingService.close_fiscal_year(self.tenant_id, self.fiscal_year.id, self.retained_earnings.id, self.user_id)

        self.assertEqual(fy.status, 'closed')
        self.assertTrue(FinancialClosing.objects.filter(tenant_id=self.tenant_id, closed_year=fy).exists())
