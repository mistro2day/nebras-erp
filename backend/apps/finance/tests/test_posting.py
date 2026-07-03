from django.test import TestCase
from django.core.exceptions import ValidationError
from datetime import date, timedelta
import uuid

from apps.finance.domain.models import (
    FiscalYear, AccountingPeriod, AccountType, AccountCategory, ChartOfAccount,
    Currency, JournalEntry, JournalEntryLine, LedgerEntry, Ledger, FinanceSettings
)
from apps.finance.application.services import PostingService


class FinancePostingTests(TestCase):
    """
    اختبارات ترحيل قيود اليومية ودفتر الأستاذ والقيود المزدوجة.
    """

    def setUp(self):
        self.tenant_id = uuid.uuid4()

        # 1. إعداد العملة والتهيئة
        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id,
            code='SAR',
            name_ar='ريال سعودي',
            name_en='Saudi Riyal',
            symbol='ر.س',
            is_base=True
        )

        self.settings = FinanceSettings.objects.create(
            tenant_id=self.tenant_id,
            base_currency=self.currency,
            require_journal_approval=True
        )

        # 2. إعداد السنة المالية والفترة
        self.fiscal_year = FiscalYear.objects.create(
            tenant_id=self.tenant_id,
            name='2026',
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
            end_date=date(2026, 1, 31),
            status='open'
        )

        # 3. أنواع الحسابات وشجرة الحسابات
        self.type_asset = AccountType.objects.create(
            tenant_id=self.tenant_id, code='asset', name_ar='أصول', name_en='Assets', normal_balance='debit'
        )
        self.type_equity = AccountType.objects.create(
            tenant_id=self.tenant_id, code='equity', name_ar='حقوق ملكية', name_en='Equity', normal_balance='credit'
        )

        self.cat_current = AccountCategory.objects.create(
            tenant_id=self.tenant_id, code='current_assets', name_ar='أصول متداولة', name_en='Current Assets', account_type=self.type_asset
        )

        self.acc_cash = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='1101',
            name_ar='الصندوق المالي',
            name_en='Cash Account',
            account_type=self.type_asset,
            account_category=self.cat_current,
            normal_balance='debit'
        )

        self.acc_capital = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='3101',
            name_ar='رأس المال',
            name_en='Capital Account',
            account_type=self.type_equity,
            normal_balance='credit'
        )

    def test_post_unbalanced_journal_raises_error(self):
        """التحقق من أن النظام يمنع ترحيل القيود غير المتزنة."""
        journal = JournalEntry.objects.create(
            tenant_id=self.tenant_id,
            entry_number='JV-0001',
            date=date(2026, 1, 15),
            accounting_period=self.period,
            description='قيد افتتاح رأس المال غير متزن',
            currency=self.currency,
            status='approved'
        )

        # سطر مدين بقيمة 1000
        JournalEntryLine.objects.create(
            tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_cash, debit=1000.00, credit=0.0
        )

        # سطر دائن بقيمة 900 (غير متزن)
        JournalEntryLine.objects.create(
            tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_capital, debit=0.0, credit=900.00
        )

        with self.assertRaises(ValidationError):
            PostingService.post_journal_entry(self.tenant_id, journal.id)

    def test_post_balanced_journal_generates_ledger_entries(self):
        """التحقق من نجاح ترحيل القيد المتزن وتوليد قيود الأستاذ العام وتدقيق الأرصدة."""
        journal = JournalEntry.objects.create(
            tenant_id=self.tenant_id,
            entry_number='JV-0002',
            date=date(2026, 1, 15),
            accounting_period=self.period,
            description='قيد إيداع رأس المال المتزن',
            currency=self.currency,
            status='approved'
        )

        JournalEntryLine.objects.create(
            tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_cash, debit=5000.00, credit=0.0
        )
        JournalEntryLine.objects.create(
            tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_capital, debit=0.0, credit=5000.00
        )

        # ترحيل القيد
        posted_entry = PostingService.post_journal_entry(self.tenant_id, journal.id)

        self.assertEqual(posted_entry.status, 'posted')
        self.assertIsNotNone(posted_entry.posted_at)

        # التحقق من تولد قيود الأستاذ
        ledger_entries = LedgerEntry.objects.filter(tenant_id=self.tenant_id)
        self.assertEqual(ledger_entries.count(), 2)

        cash_ledger = ledger_entries.get(account=self.acc_cash)
        self.assertEqual(cash_ledger.debit, 5000.00)
        self.assertEqual(cash_ledger.balance_snapshot, 5000.00)

    def test_post_journal_in_closed_period_raises_error(self):
        """يُمنع الترحيل إلى فترة محاسبية مغلقة."""
        self.period.status = 'closed'
        self.period.save()

        journal = JournalEntry.objects.create(
            tenant_id=self.tenant_id,
            entry_number='JV-0003',
            date=date(2026, 1, 15),
            accounting_period=self.period,
            description='محاولة ترحيل في فترة مغلقة',
            currency=self.currency,
            status='approved'
        )
        JournalEntryLine.objects.create(tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_cash, debit=100.00)
        JournalEntryLine.objects.create(tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_capital, credit=100.00)

        with self.assertRaises(ValidationError):
            PostingService.post_journal_entry(self.tenant_id, journal.id)

    def test_reversing_journal_entry(self):
        """اختبار القيد العكسي لتصحيح القيود المرحلة."""
        journal = JournalEntry.objects.create(
            tenant_id=self.tenant_id,
            entry_number='JV-0004',
            date=date(2026, 1, 15),
            accounting_period=self.period,
            description='قيد خاطئ سيتم عكسه',
            currency=self.currency,
            status='approved'
        )
        JournalEntryLine.objects.create(tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_cash, debit=300.00)
        JournalEntryLine.objects.create(tenant_id=self.tenant_id, journal_entry=journal, account=self.acc_capital, credit=300.00)

        # الترحيل أولاً
        PostingService.post_journal_entry(self.tenant_id, journal.id)

        # العكس
        rev_entry = PostingService.reverse_journal_entry(self.tenant_id, journal.id)

        # التحقق من أن القيد الأصلي تم تحديث حالته إلى معكوس
        journal.refresh_from_db()
        self.assertEqual(journal.status, 'reversed')

        # التحقق من توازن القيد الجديد المعكوس
        self.assertEqual(rev_entry.status, 'posted')
        self.assertEqual(rev_entry.lines.get(account=self.acc_cash).credit, 300.00)
        self.assertEqual(rev_entry.lines.get(account=self.acc_capital).debit, 300.00)
