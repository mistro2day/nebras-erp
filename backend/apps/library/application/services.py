import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.library.domain.models import (
    BookCopy, BorrowTransaction, Renewal, Fine, LostBook, DamagedBook, LibrarySettings
)

# استدعاء خدمات المحاسبة بالمالية
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, JournalEntry, JournalEntryLine, Currency


class BorrowService:
    @staticmethod
    @transaction.atomic
    def borrow_book(tenant_id, copy_id, borrower_user_id, loan_period_days=14, user_id=None):
        """
        إجراء عملية إعارة واستعارة نسخة كتاب فزيائية لأحد الطلاب أو المعلمين.
        """
        copy = BookCopy.objects.get(tenant_id=tenant_id, id=copy_id)
        if copy.status != 'available':
            raise ValidationError("نسخة الكتاب هذه غير متاحة للاستعارة حالياً (قد تكون مستعارة أو تالفة).")

        # 1. تحديث حالة النسخة
        copy.status = 'borrowed'
        copy.save()

        # 2. إنشاء سجل الاستعارة
        borrow_date = timezone.now().date()
        due_date = borrow_date + timezone.timedelta(days=loan_period_days)

        tx = BorrowTransaction.objects.create(
            tenant_id=tenant_id,
            copy=copy,
            borrower_user_id=borrower_user_id,
            borrow_date=borrow_date,
            due_date=due_date,
            status='borrowed',
            created_by=user_id
        )

        return tx

    @staticmethod
    @transaction.atomic
    def return_book(tenant_id, borrow_transaction_id, actual_return_date, debit_gl_account_id=None, credit_gl_account_id=None, user_id=None):
        """
        إرجاع نسخة الكتاب المستعارة وحساب غرامات التأخير إن وجدت وإدراجها ماليّاً.
        """
        tx = BorrowTransaction.objects.get(tenant_id=tenant_id, id=borrow_transaction_id)
        if tx.status == 'returned':
            raise ValidationError("عملية الاستعارة مسواة ومسترجعة مسبقاً.")

        # 1. تحديث حالة نسخة الكتاب الفنية
        copy = tx.copy
        copy.status = 'available'
        copy.save()

        # 2. تحديث سجل الاستعارة
        tx.status = 'returned'
        tx.actual_return_date = actual_return_date
        tx.save()

        # 3. حساب غرامات التأخير التلقائي
        # في حال كان تاريخ الإرجاع الفعلي بعد تاريخ الإرجاع المستحق
        if actual_return_date > tx.due_date:
            delta = actual_return_date - tx.due_date
            days_overdue = delta.days
            
            # جلب إعدادات الغرامات اليومية للمكتبة
            settings = LibrarySettings.objects.filter(tenant_id=tenant_id).first()
            fine_rate = settings.fine_per_day if settings else Decimal('1.00')

            # الغرامة واقعة مكتبية تُسجَّل دائماً عند التأخير — لا تتوقّف على معرفة
            # المستدعي بأرقام حسابات الأستاذ العام. أمين المكتبة يُرجع الكتاب،
            # والحسابات تُحلّ هنا: مدين ذمم مدينة / دائن إيراد الغرامات.
            if not debit_gl_account_id or not credit_gl_account_id:
                from apps.finance.application.account_resolver import resolve_account
                try:
                    # بلا `prefix` عمداً: إن لم يُعرَّف حساب لإيراد الغرامات فلا
                    # نُرحّلها على أول حساب إيراد صادفناه — الغرامة تُسجَّل بلا قيد
                    # وتظهر في الشاشة «بلا قيد» حتى تضبط المالية حسابها الصحيح.
                    debit_gl_account_id = debit_gl_account_id or resolve_account(
                        tenant_id, 'receivable').id
                    credit_gl_account_id = credit_gl_account_id or resolve_account(
                        tenant_id, 'fine_revenue').id
                except Exception:  # noqa: BLE001 — نقص الدليل المحاسبي لا يمنع تسجيل الغرامة
                    debit_gl_account_id = credit_gl_account_id = None

            FineService.calculate_and_post_fine(
                tenant_id=tenant_id,
                borrow_transaction_id=tx.id,
                days_overdue=days_overdue,
                fine_per_day=fine_rate,
                debit_gl_account_id=debit_gl_account_id,
                credit_gl_account_id=credit_gl_account_id,
                user_id=user_id
            )

        return tx


class FineService:
    @staticmethod
    @transaction.atomic
    def calculate_and_post_fine(tenant_id, borrow_transaction_id, days_overdue, fine_per_day, debit_gl_account_id, credit_gl_account_id, user_id=None):
        """
        حساب غرامة التأخير وإصدار الفاتورة وتوليد القيد المحاسبي تلقائياً بموديول المالية.
        """
        tx = BorrowTransaction.objects.get(tenant_id=tenant_id, id=borrow_transaction_id)
        
        fine_amount = Decimal(str(days_overdue)) * Decimal(str(fine_per_day))
        fine_amount = fine_amount.quantize(Decimal('0.01'))

        # 1. إنشاء سجل الغرامة
        fine = Fine.objects.create(
            tenant_id=tenant_id,
            borrow_transaction=tx,
            fine_amount=fine_amount,
            days_overdue=days_overdue,
            status='unpaid',
            created_by=user_id
        )

        # 2. توليد القيد المالي في الحسابات العامة
        # الجانب المدين (Debit): حساب ذمم الطلاب أو المستعيرين (Receivable)
        # الجانب الدائن (Credit): حساب إيرادات غرامات المكتبة
        #
        # الغرامة سُجّلت أعلاه على أي حال. أما القيد فلا يُنشأ بلا حسابين
        # صحيحين — قيد ناقص أسوأ من غيابه، والغرامة تظهر «بلا قيد» في الشاشة.
        if not debit_gl_account_id or not credit_gl_account_id:
            return fine

        journal_lines = [
            {
                'account_id': debit_gl_account_id,
                'cost_center_id': None,
                'debit': fine_amount,
                'credit': Decimal('0.00'),
                'description': f"إثبات ذمة غرامة تأخير إرجاع كتاب للمستعير {tx.borrower_user_id}"
            },
            {
                'account_id': credit_gl_account_id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': fine_amount,
                'description': f"إثبات إيرادات غرامات تأخير مكتبية - استعارة رقم {tx.id}"
            }
        ]

        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if active_fy:
            period = active_fy.periods.filter(start_date__lte=timezone.now().date(), end_date__gte=timezone.now().date()).first()
            if period:
                base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                journal = JournalEntry.objects.create(
                    tenant_id=tenant_id,
                    entry_number=f"LIB-FNE-{tx.id}",
                    date=timezone.now().date(),
                    accounting_period=period,
                    description=f"قيد غرامة تأخير مكتبية للمستعير",
                    source_type='automatic',
                    status='draft',
                    currency=base_currency,
                    created_by=user_id
                )

                for line in journal_lines:
                    JournalEntryLine.objects.create(
                        tenant_id=tenant_id,
                        journal_entry=journal,
                        account_id=line['account_id'],
                        cost_center_id=line['cost_center_id'],
                        debit=line['debit'],
                        credit=line['credit'],
                        description=line['description']
                    )

                # مسودة بانتظار اعتماد المحاسب المختص — لا تُرحّل من هنا
                fine.journal_entry_id = journal.id
                fine.save()

        return fine
