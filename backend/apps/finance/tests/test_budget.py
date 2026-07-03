from django.test import TestCase
from django.core.exceptions import ValidationError
from datetime import date
import uuid

from apps.finance.domain.models import FiscalYear, AccountingPeriod, AccountType, ChartOfAccount, CostCenter, Budget, BudgetItem
from apps.finance.application.services import BudgetService


class BudgetConsumptionTests(TestCase):
    """
    اختبارات التحقق من الموازنة التقديرية واستهلاكها.
    """

    def setUp(self):
        self.tenant_id = uuid.uuid4()

        self.fiscal_year = FiscalYear.objects.create(
            tenant_id=self.tenant_id, name='2026', start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), status='open', is_current=True
        )

        self.type_expense = AccountType.objects.create(
            tenant_id=self.tenant_id, code='expense', name_ar='مصاريف', name_en='Expenses', normal_balance='debit'
        )

        self.acc_travel = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id, code='5101', name_ar='مصاريف سفر', name_en='Travel Expenses', account_type=self.type_expense
        )

        self.cost_center = CostCenter.objects.create(
            tenant_id=self.tenant_id, code='CC-IT', name_ar='قسم تقنية المعلومات', name_en='IT Department', type='department'
        )

        # إنشاء موازنة معتمدة للقسم بقيمة 2000 ريال لحساب السفر
        self.budget = Budget.objects.create(
            tenant_id=self.tenant_id, fiscal_year=self.fiscal_year, cost_center=self.cost_center, name='موازنة تكنولوجيا المعلومات', status='approved'
        )

        self.budget_item = BudgetItem.objects.create(
            tenant_id=self.tenant_id, budget=self.budget, account=self.acc_travel, amount=2000.00, consumed_amount=0.0
        )

    def test_consume_budget_within_limit_success(self):
        """نجاح استهلاك الموازنة إذا كان المطلوب أقل من المتاح."""
        BudgetService.check_and_consume_budget(self.tenant_id, self.acc_travel, self.cost_center, 1500.00)

        self.budget_item.refresh_from_db()
        self.assertEqual(self.budget_item.consumed_amount, 1500.00)

    def test_consume_budget_exceeding_limit_raises_error(self):
        """فشل استهلاك الموازنة وتنبيه الخطأ عند طلب قيمة تفوق الرصيد المتاح."""
        with self.assertRaises(ValidationError):
            BudgetService.check_and_consume_budget(self.tenant_id, self.acc_travel, self.cost_center, 2500.00)

        self.budget_item.refresh_from_db()
        self.assertEqual(self.budget_item.consumed_amount, 0.0)  # لم يتغير
