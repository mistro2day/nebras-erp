import uuid
from decimal import Decimal
from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError

# استيراد نماذج وخدمات المالية
from apps.finance.domain.models import (
    Currency, ChartOfAccount, AccountType, CashBox, PaymentMethod, FiscalYear, AccountingPeriod
)
from apps.finance.application.services import PostingService

# استيراد نماذج وخدمات فوترة الطلاب
from apps.student_finance.domain.models import (
    StudentBillingAccount, StudentInvoice, FeeCategory, FeeType, FeeStructure,
    StudentReceivable, Receipt, StudentFinanceSettings, FinancialHold
)
from apps.student_finance.application.services import BillingService, PaymentService, ScholarshipService, HoldService


class StudentBillingTests(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.user_id = uuid.uuid4()

        # 1. إعداد العملة الأساسية
        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id,
            code='SAR',
            name_ar='ريال سعودي',
            name_en='Saudi Riyal',
            symbol='SR',
            is_base=True
        )

        # 2. إعداد السنة المالية والفترة المحاسبية
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

        # 3. إعداد أنواع الحسابات والحسابات
        self.acc_type_asset = AccountType.objects.create(
            tenant_id=self.tenant_id, code='asset', name_ar='الأصول', name_en='Assets', normal_balance='debit'
        )
        self.acc_type_revenue = AccountType.objects.create(
            tenant_id=self.tenant_id, code='revenue', name_ar='الإيرادات', name_en='Revenue', normal_balance='credit'
        )

        # حساب مديني الطلاب (Asset)
        self.acc_receivables = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='120101',
            name_ar='مدينو رسوم الطلاب',
            name_en='Student Receivables',
            account_type=self.acc_type_asset,
            normal_balance='debit',
            status='active'
        )

        # حساب إيرادات الرسوم (Revenue)
        self.acc_revenue = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='410101',
            name_ar='إيرادات الرسوم الدراسية',
            name_en='Tuition Revenue',
            account_type=self.acc_type_revenue,
            normal_balance='credit',
            status='active'
        )

        # حساب الخزنة الرئيسية (Asset)
        self.acc_cash = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code='110101',
            name_ar='الصندوق الرئيسي',
            name_en='Main Cash',
            account_type=self.acc_type_asset,
            normal_balance='debit',
            status='active'
        )

        # 4. إعداد الصندوق وطريقة الدفع
        self.cash_box = CashBox.objects.create(
            tenant_id=self.tenant_id,
            name_ar='خزنة سداد الطلاب',
            name_en='Student Pay Cashier',
            gl_account=self.acc_cash,
            currency=self.currency,
            custodian_id=uuid.uuid4(),
            status='active'
        )
        self.payment_method = PaymentMethod.objects.create(
            tenant_id=self.tenant_id,
            name_ar='نقدي',
            name_en='Cash',
            code='CASH',
            status='active'
        )

        # 5. إعداد إعدادات فوترة الطلاب
        self.settings = StudentFinanceSettings.objects.create(
            tenant_id=self.tenant_id,
            receivables_gl_account_id=self.acc_receivables.id,
            revenue_gl_account_id=self.acc_revenue.id,
            auto_apply_late_fees=False,
            max_credit_limit=Decimal('1000.00')
        )

        # 6. إنشاء حساب فوترة للطالب
        self.student_id = uuid.uuid4()
        self.billing_account = StudentBillingAccount.objects.create(
            tenant_id=self.tenant_id,
            student_id=self.student_id,
            account_number='ACC-ST-0001',
            opening_balance=Decimal('0.00'),
            current_balance=Decimal('0.00'),
            outstanding_balance=Decimal('0.00')
        )

        # 7. إعداد الرسوم وهياكل الرسوم
        self.category = FeeCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='الأكاديمية', name_en='Academic', code='academic'
        )
        self.fee_type = FeeType.objects.create(
            tenant_id=self.tenant_id,
            fee_category=self.category,
            name_ar='الرسوم الدراسية السنوية',
            name_en='Annual Tuition Fees',
            code='tuition',
            default_amount=Decimal('5000.00')
        )
        self.fee_structure = FeeStructure.objects.create(
            tenant_id=self.tenant_id,
            name='رسوم الصف الأول الابتدائي',
            academic_year='2026',
            fee_type=self.fee_type,
            amount=Decimal('5000.00'),
            is_active=True
        )

    def test_generate_student_invoice_success(self):
        """نجاح توليد الفاتورة للطالب وترحيل قيد الاستحقاق التلقائي بالمالية."""
        invoice = BillingService.generate_student_invoice(
            tenant_id=self.tenant_id,
            billing_account_id=self.billing_account.id,
            fee_structures=[self.fee_structure],
            due_date=date(2026, 6, 30),
            user_id=self.user_id
        )

        # التحقق من الفاتورة وسجل الاستحقاق
        self.assertEqual(invoice.status, 'posted')
        self.assertEqual(invoice.total_amount, Decimal('5000.00'))
        self.assertIsNotNone(invoice.journal_entry_id)

        # التحقق من حساب القبض (Receivable)
        receivable = StudentReceivable.objects.get(invoice=invoice)
        self.assertEqual(receivable.outstanding_amount, Decimal('5000.00'))

        # التحقق من تحديث رصيد حساب فوترة الطالب
        self.billing_account.refresh_from_db()
        self.assertEqual(self.billing_account.outstanding_balance, Decimal('5000.00'))

    def test_receive_payment_and_fifo_allocation(self):
        """نجاح استلام دفعة مالية وتخصيصها بنظام FIFO وسداد الفاتورة."""
        # 1. إصدار فاتورة أولى بقيمة 5000
        invoice = BillingService.generate_student_invoice(
            tenant_id=self.tenant_id,
            billing_account_id=self.billing_account.id,
            fee_structures=[self.fee_structure],
            due_date=date(2026, 6, 30),
            user_id=self.user_id
        )

        # 2. سداد مبلغ 2000 ريال
        receipt = PaymentService.receive_payment(
            tenant_id=self.tenant_id,
            billing_account_id=self.billing_account.id,
            amount=Decimal('2000.00'),
            payment_method_id=self.payment_method.id,
            cash_box_id=self.cash_box.id,
            user_id=self.user_id
        )

        self.assertEqual(receipt.status, 'posted')
        self.assertIsNotNone(receipt.voucher_id)

        # التحقق من تحديث الأرصدة
        self.billing_account.refresh_from_db()
        self.assertEqual(self.billing_account.outstanding_balance, Decimal('3000.00'))

        receivable = StudentReceivable.objects.get(invoice=invoice)
        self.assertEqual(receivable.outstanding_amount, Decimal('3000.00'))
        self.assertEqual(receivable.paid_amount, Decimal('2000.00'))

    def test_financial_hold_workflow(self):
        """نجاح تطبيق الحظر المالي وفكه آلياً عند انتفاء أسباب المديونية."""
        # فرض حظر مالي يدوي
        hold = HoldService.apply_financial_hold(
            tenant_id=self.tenant_id,
            billing_account_id=self.billing_account.id,
            hold_type='exam',
            reason='تأخر سداد قسط الفصل الأول'
        )

        self.billing_account.refresh_from_db()
        self.assertTrue(self.billing_account.financial_hold)
        self.assertEqual(hold.status, 'active')

        # فوترة وسداد كامل لتصفية الأرصدة وفك الحظر تلقائياً
        invoice = BillingService.generate_student_invoice(
            tenant_id=self.tenant_id,
            billing_account_id=self.billing_account.id,
            fee_structures=[self.fee_structure],
            due_date=date(2026, 6, 30),
            user_id=self.user_id
        )

        # سداد كامل الفاتورة لتجاوز الحظر المالي تلقائياً
        PaymentService.receive_payment(
            tenant_id=self.tenant_id,
            billing_account_id=self.billing_account.id,
            amount=Decimal('5000.00'),
            payment_method_id=self.payment_method.id,
            cash_box_id=self.cash_box.id,
            user_id=self.user_id
        )

        self.billing_account.refresh_from_db()
        self.assertFalse(self.billing_account.financial_hold)
