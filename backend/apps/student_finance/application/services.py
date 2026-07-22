import logging
from decimal import Decimal
from datetime import date
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum, Q

from apps.student_finance.domain.models import (
    FeeCategory, FeeType, FeeStructure, FeeSchedule, AcademicFeePlan,
    StudentBillingAccount, StudentInvoice, InvoiceItem, InvoiceAdjustment,
    InvoiceDiscount, Scholarship, ScholarshipRule, FinancialAid,
    InstallmentPlan, Installment, StudentReceivable, PaymentAllocation,
    Receipt, Refund, CreditNote, DebitNote, LateFeeRule, CollectionPolicy,
    FinancialHold, BillingCycle, Statement, BillingAudit, StudentFinanceSettings
)

# استيراد خدمات ونماذج موديول المالية
from apps.finance.domain.models import (
    JournalEntry, JournalEntryLine, Voucher, ChartOfAccount, Currency,
    FiscalYear, AccountingPeriod, CashBox, BankAccount
)
from apps.finance.application.services import PostingService, CashManagementService

# استيراد تكاملات المنصة
from apps.rules.application.services import RuleEvaluationService
from apps.workflow.services import WorkflowEngine
from apps.communications.application.events import EventBusConsumer
from apps.shared.application.numbering import generate_unique_number

logger = logging.getLogger('nebras.student_finance')


# ============================================================
# 1. Billing Service — خدمة فوترة الطلاب وإصدار الفواتير
# ============================================================
class BillingService:
    """
    الخدمة المسؤولة عن احتساب الرسوم وإصدار فواتير الطلاب الفردية والجماعية
    مع تطبيق المنح والخصومات وترحيلها كقيود استحقاق في دفتر الأستاذ.
    """

    @classmethod
    @transaction.atomic
    def generate_student_invoice(cls, tenant_id, billing_account_id, fee_structures, due_date, user_id=None):
        """
        إنشاء فاتورة طالب لعدة هياكل رسوم مع احتساب الخصومات والمنح آلياً وترحيل قيد الاستحقاق.
        """
        account = StudentBillingAccount.objects.select_for_update().get(id=billing_account_id, tenant_id=tenant_id)
        if account.is_blocked:
            raise ValidationError("حساب الطالب موقوف ولا يمكن إصدار فواتير له.")

        # 1. الحصول على الإعدادات المالية للتحقق من الحسابات المحاسبية
        settings = StudentFinanceSettings.objects.filter(tenant_id=tenant_id).first()
        if not settings:
            raise ValidationError("يرجى ضبط الإعدادات المالية للطلاب أولاً وتحديد الحسابات المحاسبية.")

        receivables_gl_account = ChartOfAccount.objects.get(id=settings.receivables_gl_account_id, tenant_id=tenant_id)
        revenue_gl_account = ChartOfAccount.objects.get(id=settings.revenue_gl_account_id, tenant_id=tenant_id)

        # 2. إنشاء الفاتورة بمسودة مبدئية
        invoice_number = generate_unique_number(
            StudentInvoice, tenant_id, f"INV-ST-{timezone.now().strftime('%y%m%d')}-", 'invoice_number')
        invoice = StudentInvoice.objects.create(
            tenant_id=tenant_id,
            student_billing_account=account,
            invoice_number=invoice_number,
            issue_date=date.today(),
            due_date=due_date,
            status='draft',
            total_amount=Decimal('0.0'),
            paid_amount=Decimal('0.0'),
            outstanding_amount=Decimal('0.0')
        )

        total_amount = Decimal('0.0')

        # 3. إدراج بنود الرسوم
        for fs in fee_structures:
            item_amount = Decimal(str(fs.amount))
            InvoiceItem.objects.create(
                tenant_id=tenant_id,
                invoice=invoice,
                fee_type=fs.fee_type,
                amount=item_amount,
                description=f"رسوم {fs.fee_type.name_ar} - العام الدراسي {fs.academic_year}"
            )
            total_amount += item_amount

        # 4. احتساب الخصومات والمنح الدراسية النشطة للطالب (تكامل مع محرك القواعد)
        active_scholarships = Scholarship.objects.filter(
            student_billing_account=account, status='approved', start_date__lte=date.today()
        )
        
        discount_amount = Decimal('0.0')
        for sc in active_scholarships:
            # إذا كانت نسبة مئوية
            if sc.amount_percentage > 0:
                disc = total_amount * (Decimal(str(sc.amount_percentage)) / Decimal('100.0'))
            else:
                disc = Decimal(str(sc.fixed_amount))

            disc = min(disc, total_amount - discount_amount)
            if disc > 0:
                InvoiceDiscount.objects.create(
                    tenant_id=tenant_id,
                    invoice=invoice,
                    discount_type='fixed' if sc.fixed_amount > 0 else 'percentage',
                    amount=disc,
                    discount_reason=f"منحة / خصم: {sc.name}"
                )
                discount_amount += disc

        final_total = total_amount - discount_amount
        invoice.total_amount = final_total
        invoice.outstanding_amount = final_total
        invoice.save(update_fields=['total_amount', 'outstanding_amount'])

        # 5. تكامل دفتر الأستاذ العام: توليد قيد اليومية (Journal Entry) التلقائي لترحيل الاستحقاق
        # قيد استحقاق: من حساب مديني الطلاب (Debit) إلى حساب إيرادات الرسوم الدراسية (Credit)
        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if not active_fy:
            raise ValidationError("لا توجد سنة مالية نشطة ومفتوحة لإجراء المعاملات المالية.")
        
        period = active_fy.periods.filter(start_date__lte=date.today(), end_date__gte=date.today()).first()
        if not period:
            raise ValidationError("التاريخ الحالي لا يقع ضمن أي فترة محاسبية نشطة.")

        base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()

        journal = JournalEntry.objects.create(
            tenant_id=tenant_id,
            entry_number=f"JV-{invoice.invoice_number}",
            date=date.today(),
            accounting_period=period,
            description=f"إثبات استحقاق رسوم فاتورة الطالب رقم {invoice.invoice_number}",
            source_type='automatic',
            status='draft',
            currency=base_currency,
            created_by=user_id
        )

        # سطر المدينين (Student Receivables) - Debit
        JournalEntryLine.objects.create(
            tenant_id=tenant_id,
            journal_entry=journal,
            account=receivables_gl_account,
            debit=final_total,
            credit=Decimal('0.0'),
            description=f"مديني رسوم الطلاب - فاتورة {invoice.invoice_number}"
        )

        # سطر إيرادات الرسوم (Revenue Account) - Credit
        JournalEntryLine.objects.create(
            tenant_id=tenant_id,
            journal_entry=journal,
            account=revenue_gl_account,
            debit=Decimal('0.0'),
            credit=final_total,
            description=f"إيرادات الرسوم الدراسية - فاتورة {invoice.invoice_number}"
        )

        # ترحيل القيد
        journal.status = 'approved'
        journal.save(update_fields=['status'])
        PostingService.post_journal_entry(tenant_id, journal.id, user_id)

        # ربط القيد المالي بالفاتورة وتحديث حالتها
        invoice.journal_entry_id = journal.id
        invoice.status = 'posted'
        invoice.save(update_fields=['journal_entry_id', 'status'])

        # 6. إنشاء سجل المستحقات والقبض للطلاب (Student Receivable)
        StudentReceivable.objects.create(
            tenant_id=tenant_id,
            student_billing_account=account,
            invoice=invoice,
            amount=final_total,
            paid_amount=Decimal('0.0'),
            outstanding_amount=final_total,
            status='outstanding'
        )

        # 7. تحديث أرصدة حساب فوترة الطالب الإجمالية
        account.outstanding_balance += final_total
        account.current_balance += final_total
        account.save(update_fields=['outstanding_balance', 'current_balance'])

        # 8. تسجيل التدقيق
        BillingAudit.objects.create(
            tenant_id=tenant_id,
            action_type='generate_invoice',
            performed_by=user_id,
            details={'invoice_id': str(invoice.id), 'invoice_number': invoice.invoice_number, 'amount': float(final_total)}
        )

        # 9. إرسال حدث لمنصة الاتصالات
        student_name = ""
        guardian_name = ""
        guardian_phone = ""
        try:
            from apps.students.domain.models import Student
            st = Student.objects.filter(id=account.student_id).first()
            if st:
                student_name = st.profile.arabic_name if hasattr(st, 'profile') and st.profile else ""
                fam = st.family_relations.first()
                if fam:
                    guardian_name = getattr(fam, 'full_name', '') or ""
                    guardian_phone = getattr(fam, 'phone', '') or ""
        except Exception as e:
            logger.warning(f"Failed to resolve student info for event: {e}")

        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='InvoiceCreated',
            source_module='student_finance',
            event_data={
                'invoice_id': str(invoice.id),
                'invoice_number': invoice.invoice_number,
                'student_id': str(account.student_id),
                'student_name': student_name,
                'guardian_name': guardian_name,
                'guardian_phone': guardian_phone,
                'recipients': [{'address': guardian_phone, 'type': 'to', 'entity_type': 'guardian', 'name': guardian_name}] if guardian_phone else [],
                'amount': float(final_total),
                'due_date': str(due_date),
                'date': str(date.today())
            }
        )

        return invoice

    @classmethod
    def bill_new_student_registration(cls, tenant_id, student_id, grade_id=None, academic_year=None, user_id=None):
        """
        يُنشئ حساب فوترة للطالب الجديد (إن لم يوجد) ويولّد فاتورة رسوم التسجيل
        من هياكل الرسوم المطابقة (الصف + العام الدراسي + الهياكل العامة).

        يُستدعى عند تسجيل متقدم مقبول كطالب. آمن للاستدعاء دون معاملة خارجية:
        أي نقص في الإعداد المالي يُرفع كاستثناء ليعالجه المستدعي (best-effort).
        يُرجع الفاتورة أو None إن لم توجد هياكل رسوم مطابقة.
        """
        account, _ = StudentBillingAccount.objects.get_or_create(
            tenant_id=tenant_id,
            student_id=student_id,
            defaults={'account_number': f"ACC-ST-{timezone.now().strftime('%y%m%d%H%M%S')}-{str(student_id)[:8]}"},
        )

        # هياكل الرسوم النشطة المطابقة: العامة (بلا صف) + الخاصة بصف الطالب
        structures = FeeStructure.objects.filter(tenant_id=tenant_id, is_active=True).filter(
            Q(grade_id__isnull=True) | Q(grade_id=grade_id)
        )
        if academic_year:
            structures = structures.filter(academic_year=str(academic_year))
        structures = list(structures)
        if not structures:
            return None

        due_date = date.today() + timezone.timedelta(days=14)
        return cls.generate_student_invoice(
            tenant_id=tenant_id,
            billing_account_id=account.id,
            fee_structures=structures,
            due_date=due_date,
            user_id=user_id,
        )


# ============================================================
# 2. Payment Service — خدمة التحصيل وسداد الطلاب
# ============================================================
class PaymentService:
    """
    الخدمة المسؤولة عن تحصيل مدفوعات الطلاب وتخصيصها للفواتير وتوليد سندات القبض المالية.
    """

    @classmethod
    @transaction.atomic
    def receive_payment(cls, tenant_id, billing_account_id, amount, payment_method_id, bank_account_id=None, cash_box_id=None, user_id=None):
        """
        استلام دفعة سداد من طالب، وتخصيصها للمستحقات بنظام FIFO وتوليد سند القبض في موديول المالية.
        """
        account = StudentBillingAccount.objects.select_for_update().get(id=billing_account_id, tenant_id=tenant_id)
        pay_amount = Decimal(str(amount))
        if pay_amount <= 0:
            raise ValidationError("يجب أن تكون قيمة السداد أكبر من صفر.")

        settings = StudentFinanceSettings.objects.filter(tenant_id=tenant_id).first()
        if not settings:
            raise ValidationError("يرجى ضبط الإعدادات المالية للطلاب أولاً.")

        # 1. إنشاء إيصال التحصيل الداخلي
        receipt_number = generate_unique_number(
            Receipt, tenant_id, f"RCP-ST-{timezone.now().strftime('%y%m%d')}-", 'receipt_number')
        receipt = Receipt.objects.create(
            tenant_id=tenant_id,
            student_billing_account=account,
            receipt_number=receipt_number,
            payment_date=date.today(),
            amount=pay_amount,
            payment_method_id=payment_method_id,
            bank_account_id=bank_account_id,
            cash_box_id=cash_box_id,
            status='draft'
        )

        # 2. ترحيل السند المالي وتوليد القيود المحاسبية عبر موديول المالية (Finance Integration)
        # نقوم بإنشاء سند قبض (Voucher - receipt) في موديول المالية وربطه بالصندوق أو البنك وحساب الطلاب المدينين
        base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
        receivables_account = ChartOfAccount.objects.get(id=settings.receivables_gl_account_id, tenant_id=tenant_id)
        
        voucher = Voucher.objects.create(
            tenant_id=tenant_id,
            voucher_number=receipt.receipt_number,
            voucher_type='receipt',
            date=date.today(),
            amount=pay_amount,
            currency=base_currency,
            gl_account=receivables_account,  # الحساب الذي سيتم تخفيضه (دائن بـ Receivables)
            payment_method_id=payment_method_id,
            cash_box_id=cash_box_id,
            bank_account_id=bank_account_id,
            status='draft',
            created_by=user_id
        )

        # معالجة السند وترحيله بالكامل آلياً
        CashManagementService.process_voucher(tenant_id, voucher.id, user_id)

        # تحديث إيصال القبض برقم السند والحالة المرحلة
        receipt.voucher_id = voucher.id
        receipt.status = 'posted'
        receipt.save(update_fields=['voucher_id', 'status'])

        # 3. تخصيص الدفعة للمستحقات المفتوحة بنظام FIFO (First-In, First-Out)
        remaining_amount = pay_amount
        receivables = StudentReceivable.objects.filter(
            student_billing_account=account, status='outstanding'
        ).order_by('invoice__issue_date')

        for rec in receivables:
            if remaining_amount <= 0:
                break
            
            allocate = min(remaining_amount, rec.outstanding_amount)
            rec.paid_amount += allocate
            rec.outstanding_amount -= allocate
            if rec.outstanding_amount == 0:
                rec.status = 'paid'
            rec.save(update_fields=['paid_amount', 'outstanding_amount', 'status'])

            # تحديث الفاتورة المرتبطة
            invoice = rec.invoice
            invoice.paid_amount += allocate
            invoice.outstanding_amount -= allocate
            invoice.save(update_fields=['paid_amount', 'outstanding_amount'])

            # تسجيل التوزيع
            PaymentAllocation.objects.create(
                tenant_id=tenant_id,
                receivable=rec,
                receipt=receipt,
                amount_allocated=allocate
            )
            remaining_amount -= allocate

        # 4. معالجة فائض السداد (Overpayment / Credit Balance)
        if remaining_amount > 0:
            account.credit_balance += remaining_amount

        # 5. تحديث إجمالي أرصدة حساب الفوترة
        account.outstanding_balance = max(Decimal('0.0'), account.outstanding_balance - pay_amount)
        account.current_balance = max(Decimal('0.0'), account.current_balance - pay_amount)
        account.save(update_fields=['outstanding_balance', 'current_balance', 'credit_balance'])

        # 6. فك الحظر المالي تلقائياً إذا أصبح الرصيد المعلق أقل من الحد المسموح
        if account.financial_hold and account.outstanding_balance <= settings.max_credit_limit:
            HoldService.auto_release_holds(tenant_id, account, user_id)

        # 7. تسجيل التدقيق والحدث
        BillingAudit.objects.create(
            tenant_id=tenant_id,
            action_type='receive_payment',
            performed_by=user_id,
            details={'receipt_id': str(receipt.id), 'receipt_number': receipt.receipt_number, 'amount': float(pay_amount)}
        )

        student_name = ""
        guardian_name = ""
        guardian_phone = ""
        try:
            from apps.students.domain.models import Student
            st = Student.objects.filter(id=account.student_id).first()
            if st:
                student_name = st.profile.arabic_name if hasattr(st, 'profile') and st.profile else ""
                fam = st.family_relations.first()
                if fam:
                    guardian_name = getattr(fam, 'full_name', '') or ""
                    guardian_phone = getattr(fam, 'phone', '') or ""
        except Exception as e:
            logger.warning(f"Failed to resolve student info for payment event: {e}")

        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='PaymentReceived',
            source_module='student_finance',
            event_data={
                'receipt_id': str(receipt.id),
                'receipt_number': receipt.receipt_number,
                'student_id': str(account.student_id),
                'student_name': student_name,
                'guardian_name': guardian_name,
                'guardian_phone': guardian_phone,
                'recipients': [{'address': guardian_phone, 'type': 'to', 'entity_type': 'guardian', 'name': guardian_name}] if guardian_phone else [],
                'amount': float(pay_amount),
                'date': str(date.today())
            }
        )

        return receipt


# ============================================================
# 3. Scholarship Service — خدمة المنح الدراسية
# ============================================================
class ScholarshipService:
    """
    الخدمة المسؤولة عن إضافة واعتماد المنح الدراسية للطلاب.
    """

    @classmethod
    @transaction.atomic
    def apply_scholarship(cls, tenant_id, billing_account_id, name, scholarship_type, amount_percentage, fixed_amount, start_date, end_date=None, user_id=None):
        """
        إضافة منحة جديدة للطالب وتفعيلها بمجرد الاعتماد.
        """
        account = StudentBillingAccount.objects.get(id=billing_account_id, tenant_id=tenant_id)
        
        scholarship = Scholarship.objects.create(
            tenant_id=tenant_id,
            student_billing_account=account,
            name=name,
            type=scholarship_type,
            amount_percentage=Decimal(str(amount_percentage)),
            fixed_amount=Decimal(str(fixed_amount)),
            status='approved',  # يفترض الاعتماد التلقائي أو استهلاك مسار العمل
            start_date=start_date,
            end_date=end_date
        )

        # إطلاق حدث منصة الاتصالات
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='ScholarshipApproved',
            source_module='student_finance',
            event_data={
                'scholarship_id': str(scholarship.id),
                'student_id': str(account.student_id),
                'name': name
            }
        )

        return scholarship


# ============================================================
# 4. Hold Service — خدمة إدارة الحظر المالي للطلاب
# ============================================================
class HoldService:
    """
    الخدمة المسؤولة عن فرض وإلغاء الحظر المالي التلقائي واليدوي على حسابات الطلاب.
    """

    @classmethod
    @transaction.atomic
    def apply_financial_hold(cls, tenant_id, billing_account_id, hold_type, reason, user_id=None):
        """
        فرض حظر مالي يدوي أو تلقائي على حساب الطالب بسبب تراكم المديونيات.
        """
        account = StudentBillingAccount.objects.select_for_update().get(id=billing_account_id, tenant_id=tenant_id)
        
        hold = FinancialHold.objects.create(
            tenant_id=tenant_id,
            student_billing_account=account,
            hold_type=hold_type,
            reason=reason,
            status='active'
        )

        account.financial_hold = True
        account.save(update_fields=['financial_hold'])

        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='FinancialHoldApplied',
            source_module='student_finance',
            event_data={
                'hold_id': str(hold.id),
                'student_id': str(account.student_id),
                'hold_type': hold_type
            }
        )

        return hold

    @classmethod
    @transaction.atomic
    def auto_release_holds(cls, tenant_id, billing_account, user_id=None):
        """
        فك جميع حالات الحظر المالي التلقائية للطالب عند تصفية مديونيته.
        """
        active_holds = FinancialHold.objects.filter(
            tenant_id=tenant_id, student_billing_account=billing_account, status='active'
        )
        for hold in active_holds:
            hold.status = 'released'
            hold.released_at = timezone.now()
            hold.save(update_fields=['status', 'released_at'])

        billing_account.financial_hold = False
        billing_account.save(update_fields=['financial_hold'])
