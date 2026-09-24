import re
import logging
from decimal import Decimal
from datetime import date, datetime
from functools import wraps
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError, ObjectDoesNotExist
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
    FiscalYear, AccountingPeriod, CashBox, BankAccount, PaymentMethod
)
from apps.finance.application.services import PostingService, CashManagementService

# استيراد تكاملات المنصة
from apps.rules.application.services import RuleEvaluationService
from apps.workflow.services import WorkflowEngine
from apps.communications.application.events import EventBusConsumer
from apps.shared.application.numbering import generate_unique_number

logger = logging.getLogger('nebras.student_finance')


def db_atomic(func):
    """ديكوريتور يحافظ على توقيع الدالة الأصلي ويشغلها داخل معاملة قاعدة بيانات ذرية."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        with transaction.atomic():  # type: ignore
            return func(*args, **kwargs)
    return wrapper


# ============================================================
# 1. Billing Service — خدمة فوترة الطلاب وإصدار الفواتير
# ============================================================
class BillingService:
    """
    الخدمة المسؤولة عن احتساب الرسوم وإصدار فواتير الطلاب الفردية والجماعية
    مع تطبيق المنح والخصومات وترحيلها كقيود استحقاق في دفتر الأستاذ.
    """

    @classmethod
    @db_atomic
    def generate_student_invoice(cls, tenant_id, billing_account_id, fee_structures, due_date, user_id=None, custom_items=None, fee_structure_amounts=None):
        """
        إنشاء فاتورة طالب لعدة هياكل رسوم مع إمكانية إدخال بنود يدوية وتعديل المبالغ واحتساب الخصومات والمنح آلياً وترحيل قيد الاستحقاق.
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
            outstanding_amount=Decimal('0.0'),
            created_by=user_id
        )

        total_amount = Decimal('0.0')
        fee_structure_amounts = fee_structure_amounts or {}

        # 3. إدراج بنود الرسوم من هياكل الرسوم المعتمدة
        for fs in fee_structures:
            override_amt = fee_structure_amounts.get(str(fs.id))
            item_amount = Decimal(str(override_amt)) if override_amt is not None else Decimal(str(fs.amount))
            InvoiceItem.objects.create(
                tenant_id=tenant_id,
                invoice=invoice,
                fee_type=fs.fee_type,
                amount=item_amount,
                description=f"رسوم {fs.fee_type.name_ar} - العام الدراسي {fs.academic_year}"
            )
            total_amount += item_amount

        # 3b. إدراج بنود الرسوم اليدوية / المخصصة (custom_items)
        if custom_items:
            default_fee_type = FeeType.objects.filter(tenant_id=tenant_id).first()
            for ci in custom_items:
                ci_name = (ci.get('name') or '').strip()
                if not ci_name:
                    ci_name = 'رسوم يدوية مخصصة'
                ci_amount = Decimal(str(ci.get('amount') or 0))
                if ci_amount <= 0:
                    continue
                ft_id = ci.get('fee_type_id')
                ft = FeeType.objects.filter(id=ft_id, tenant_id=tenant_id).first() if ft_id else default_fee_type
                if not ft:
                    category, _ = FeeCategory.objects.get_or_create(
                        tenant_id=tenant_id, code='general',
                        defaults={'name_ar': 'رسوم عامة', 'name_en': 'General Fees'}
                    )
                    ft, _ = FeeType.objects.get_or_create(
                        tenant_id=tenant_id, code='custom_fee',
                        defaults={'name_ar': 'رسوم مخصصة', 'name_en': 'Custom Fee', 'fee_category': category}
                    )
                InvoiceItem.objects.create(
                    tenant_id=tenant_id,
                    invoice=invoice,
                    fee_type=ft,
                    amount=ci_amount,
                    description=ci.get('description') or ci_name
                )
                total_amount += ci_amount

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

        # 4b. خصم أبناء وأقارب الموظفين (اللائحة التنظيمية للمعلمين — رابعاً وخامساً)
        #     يُطبَّق فقط إذا كان الطالب مربوطاً ومؤكَّداً بملف موظف.
        try:
            from apps.employees.application.dependent_linking import get_discount_for_student
            staff_disc = get_discount_for_student(tenant_id, account.student_id)
        except Exception as exc:  # لا يجوز أن يُفشل خللٌ في الربط إصدارَ الفاتورة
            logger.warning("تعذّر جلب خصم أبناء الموظفين للطالب %s: %s", account.student_id, exc)
            staff_disc = None

        if staff_disc and staff_disc['percentage'] > 0:
            pct = Decimal(str(staff_disc['percentage']))
            disc = total_amount * (pct / Decimal('100.0'))
            disc = min(disc, total_amount - discount_amount)
            if disc > 0:
                label = 'إعفاء كلي' if staff_disc['is_fully_exempt'] else f"خصم {pct}%"
                kinship = 'ابن موظف' if staff_disc['relation_type'] == 'child' else 'قريب موظف'
                InvoiceDiscount.objects.create(
                    tenant_id=tenant_id,
                    invoice=invoice,
                    discount_type='percentage',
                    amount=disc,
                    discount_reason=f"{kinship} ({staff_disc['employee_name']}) — {label} وفق اللائحة التنظيمية",
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
        PostingService.post_journal_entry(tenant_id, journal.id, user_id)  # type: ignore

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
    @db_atomic
    def receive_payment(cls, tenant_id, billing_account_id, amount, payment_method_id, bank_account_id=None, cash_box_id=None, user_id=None, payment_date=None):
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

        # تحديد تاريخ التحصيل الفعلي (يدوي أو تاريخ اليوم)
        if payment_date:
            if isinstance(payment_date, str):
                from django.utils.dateparse import parse_date
                parsed_d = parse_date(payment_date)
                actual_date = parsed_d if parsed_d else date.today()
            elif isinstance(payment_date, datetime):
                actual_date = payment_date.date()
            elif isinstance(payment_date, date):
                actual_date = payment_date
            else:
                actual_date = date.today()
        else:
            actual_date = date.today()

        # 1. إنشاء إيصال التحصيل الداخلي وسند القبض برقم متسلسل فريد ومقاوم للتكرار
        prefix = f"RCP-{timezone.now().year}-"
        pattern = re.compile(r'^' + re.escape(prefix) + r'(\d+)$')
        r_mgr = getattr(Receipt, 'all_objects', Receipt.objects)
        v_mgr = getattr(Voucher, 'all_objects', Voucher.objects)

        max_seq = 0
        r_existing = r_mgr.filter(tenant_id=tenant_id, receipt_number__startswith=prefix).values_list('receipt_number', flat=True)
        for val in r_existing:
            m = pattern.match(val or '')
            if m:
                max_seq = max(max_seq, int(m.group(1)))

        v_existing = v_mgr.filter(tenant_id=tenant_id, voucher_number__startswith=prefix).values_list('voucher_number', flat=True)
        for val in v_existing:
            m = pattern.match(val or '')
            if m:
                max_seq = max(max_seq, int(m.group(1)))

        seq = max_seq + 1
        receipt_number = None
        for _ in range(50):
            candidate = f"{prefix}{seq:04d}"
            r_exists = r_mgr.filter(tenant_id=tenant_id, receipt_number=candidate).exists()
            v_exists = v_mgr.filter(tenant_id=tenant_id, voucher_number=candidate).exists()
            if not r_exists and not v_exists:
                receipt_number = candidate
                break
            seq += 1

        if not receipt_number:
            receipt_number = f"{prefix}{seq:04d}"

        # ضمان تحديد صندوق أو حساب بنكي تلقائياً بدقة وفقاً لطريقة الدفع إذا لم يُحدد أحدهما
        pm = PaymentMethod.objects.filter(id=payment_method_id, tenant_id=tenant_id).first() if payment_method_id else None
        is_bank_method = False
        if pm:
            code_str = (pm.code or '').lower()
            name_str = f"{pm.name_ar or ''} {pm.name_en or ''}".lower()
            if any(w in code_str or w in name_str for w in ['bank', 'transfer', 'online', 'cheque', 'card', 'بنك', 'بنكك', 'فوري', 'أوكاش', 'تحويل', 'شيك']):
                is_bank_method = True

        if not cash_box_id and not bank_account_id:
            if is_bank_method:
                default_bank = BankAccount.objects.filter(tenant_id=tenant_id, status='active').first() or BankAccount.objects.filter(tenant_id=tenant_id).first()
                if default_bank:
                    bank_account_id = default_bank.id
                else:
                    default_box = CashBox.objects.filter(tenant_id=tenant_id, status='active').first() or CashBox.objects.filter(tenant_id=tenant_id).first()
                    if default_box:
                        cash_box_id = default_box.id
            else:
                default_box = CashBox.objects.filter(tenant_id=tenant_id, status='active').first() or CashBox.objects.filter(tenant_id=tenant_id).first()
                if default_box:
                    cash_box_id = default_box.id
                else:
                    default_bank = BankAccount.objects.filter(tenant_id=tenant_id, status='active').first() or BankAccount.objects.filter(tenant_id=tenant_id).first()
                    if default_bank:
                        bank_account_id = default_bank.id
        elif cash_box_id and bank_account_id:
            # منع التناقض: إذا حُدد الاثنان معاً، نرجح الوجهة المناسبة لطريقة الدفع
            if is_bank_method:
                cash_box_id = None
            else:
                bank_account_id = None

        receipt = Receipt.objects.create(
            tenant_id=tenant_id,
            student_billing_account=account,
            receipt_number=receipt_number,
            payment_date=actual_date,
            amount=pay_amount,
            payment_method_id=payment_method_id,
            bank_account_id=bank_account_id,
            cash_box_id=cash_box_id,
            status='draft',
            created_by=user_id
        )

        # 2. ترحيل السند المالي وتوليد القيود المحاسبية عبر موديول المالية (Finance Integration)
        # نقوم بإنشاء سند قبض (Voucher - receipt) في موديول المالية وربطه بالصندوق أو البنك وحساب الطلاب المدينين
        base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
        receivables_account = ChartOfAccount.objects.get(id=settings.receivables_gl_account_id, tenant_id=tenant_id)
        
        voucher = Voucher.objects.create(
            tenant_id=tenant_id,
            voucher_number=receipt.receipt_number,
            voucher_type='receipt',
            date=actual_date,
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
        CashManagementService.process_voucher(tenant_id, voucher.id, user_id)  # type: ignore

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
                fam = st.family_relations.filter(whatsapp_phone__isnull=False).exclude(whatsapp_phone='').first() or st.family_relations.first()
                if fam:
                    guardian_name = getattr(fam, 'full_name', '') or ""
                    guardian_phone = getattr(fam, 'whatsapp_phone', None) or getattr(fam, 'phone', '') or ""
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

        # إرسال إشعار سند القبض المالي فورياً عبر الواتساب إلى ولي الأمر
        if guardian_phone:
            try:
                from apps.communications.application.services import CommunicationService
                from apps.common.utils.tafqeet import tafqeet_arabic

                pm_name = "طريقة الدفع المعتمدة"
                if pm:
                    pm_name = pm.name_ar or pm.name_en or pm.code

                CommunicationService.send_message(
                    tenant_id=tenant_id,
                    recipient_phone=guardian_phone,
                    template_code='PAYMENT_RECEIPT',
                    channel_type='whatsapp',
                    context={
                        'guardian_name': guardian_name or 'ولي الأمر الكريم',
                        'student_name': student_name or f"الطالب رقم {account.student_id}",
                        'amount': f"{pay_amount:,.2f}",
                        'amount_words': tafqeet_arabic(pay_amount, 'جنيه سوداني'),
                        'receipt_number': receipt.receipt_number,
                        'payment_date': str(actual_date),
                        'payment_method': pm_name,
                        'remaining_balance': f"{account.outstanding_balance:,.2f}",
                    },
                    user_id=user_id
                )
            except Exception as comm_err:
                logger.warning(f"Failed to dispatch WhatsApp payment receipt notification: {comm_err}")

        return receipt

    @classmethod
    @db_atomic
    def cancel_receipt(cls, tenant_id, receipt_id, user_id=None, reason=None):
        """
        عكس/إلغاء سند قبض مرحل مع عكس جميع التأثيرات المالية على ملف الطالب.
        يتطلب صلاحية مدير (administrator) أو مستخدم فائق (superuser).
        
        العمليات:
        1. عكس تخصيصات السداد (PaymentAllocation)
        2. إعادة أرصدة المستحقات (StudentReceivable)
        3. تحديث الفواتير (StudentInvoice)
        4. تحديث حساب الفوترة (StudentBillingAccount)
        5. عكس القيد المحاسبي في دفتر الأستاذ
        6. تحديث حالة السند والإيصال
        """
        # --- 0. التحقق من صلاحية المستخدم وقاعدة الـ 24 ساعة ---
        is_admin = False
        user_perms = []
        if user_id:
            from apps.identity.domain.models import User
            from apps.identity.domain.rbac import UserRole, RolePermission
            try:
                user = User.objects.get(id=user_id)
                if user.is_superuser:
                    is_admin = True
                else:
                    roles_qs = UserRole.objects.filter(user=user, tenant_id=tenant_id).values_list('role_id', flat=True)
                    has_admin_role = UserRole.objects.filter(
                        user=user, tenant_id=tenant_id, role__code='administrator'
                    ).exists()
                    if has_admin_role:
                        is_admin = True
                    user_perms = list(RolePermission.objects.filter(role_id__in=roles_qs).values_list('permission__code', flat=True))
            except ObjectDoesNotExist:
                raise ValidationError("المستخدم غير موجود.")

        # --- 1. جلب الإيصال والتحقق من حالته ومنع تكرار العكس ---
        receipt = Receipt.objects.select_for_update().get(id=receipt_id, tenant_id=tenant_id)
        if receipt.status == 'reversed' or receipt.reversed_at:
            raise ValidationError("سند القبض هذا معكوس بالفعل مسبقاً، ولا يمكن تكرار عكس القيود المالية.")

        if receipt.status != 'posted':
            raise ValidationError("يمكن فقط عكس سندات القبض المرحلة (posted).")

        # التحقق من شرط مرور 24 ساعة:
        # زر عكس السند يتفعل بعد مرور 24 ساعة (أو بصلاحية المشرف/الأدمن الاستثنائية)
        hours_since_creation = (timezone.now() - receipt.created_at).total_seconds() / 3600.0 if receipt.created_at else 999.0
        can_reverse_perm = is_admin or ('receipts:reverse' in user_perms)
        if hours_since_creation < 24.0 and not is_admin:
            raise ValidationError(
                f"لا يمكن عكس السند خلال أول 24 ساعة من تسجيله (مضى {hours_since_creation:.1f} ساعة). "
                f"يمكنك بدلاً من ذلك استخدام خيار تعديل أو حذف السند مباشرة."
            )
        if not can_reverse_perm and not is_admin:
            raise ValidationError("ليس لديك صلاحية عكس سندات القبض في مصفوفة الصلاحيات.")

        account = StudentBillingAccount.objects.select_for_update().get(
            id=receipt.student_billing_account_id, tenant_id=tenant_id
        )

        # --- 2. عكس تخصيصات السداد وإعادة أرصدة المستحقات والفواتير ---
        allocations = PaymentAllocation.objects.filter(receipt=receipt)
        total_allocated = Decimal('0.0')

        for alloc in allocations:
            allocated_amount = alloc.amount_allocated
            total_allocated += allocated_amount

            # إعادة أرصدة المستحق (StudentReceivable)
            receivable = StudentReceivable.objects.select_for_update().get(id=alloc.receivable_id)
            receivable.paid_amount = max(Decimal('0.0'), receivable.paid_amount - allocated_amount)
            receivable.outstanding_amount += allocated_amount
            if receivable.status == 'paid':
                receivable.status = 'outstanding'
            receivable.save(update_fields=['paid_amount', 'outstanding_amount', 'status'])

            # إعادة أرصدة الفاتورة المرتبطة (StudentInvoice)
            invoice = receivable.invoice
            invoice.paid_amount = max(Decimal('0.0'), invoice.paid_amount - allocated_amount)
            invoice.outstanding_amount += allocated_amount
            invoice.save(update_fields=['paid_amount', 'outstanding_amount'])

        # --- 3. معالجة فائض السداد (Credit Balance) إن وجد ---
        credit_reversed = receipt.amount - total_allocated
        if credit_reversed > 0:
            account.credit_balance = max(Decimal('0.0'), account.credit_balance - credit_reversed)

        # --- 4. تحديث أرصدة حساب الفوترة ---
        account.outstanding_balance += receipt.amount
        account.current_balance += receipt.amount
        account.save(update_fields=['outstanding_balance', 'current_balance', 'credit_balance'])

        # --- 5. تحديث حالة الإيصال أولاً لمنع الازدواجية مع عكس قيود اليومية ---
        receipt.status = 'reversed'
        receipt.cancellation_reason = reason or "عكس سند القبض"
        receipt.reversed_at = timezone.now()
        receipt.reversed_by = user_id
        receipt.save(update_fields=['status', 'cancellation_reason', 'reversed_at', 'reversed_by'])

        # --- 6. عكس القيد المحاسبي في دفتر الأستاذ العام ---
        reversal_journal = None
        if receipt.voucher_id:
            try:
                voucher = Voucher.objects.get(id=receipt.voucher_id, tenant_id=tenant_id)
                # البحث عن القيد المرتبط بالسند والتأكد أنه مرحل ولم يعكس مسبقاً
                journal = JournalEntry.objects.filter(
                    tenant_id=tenant_id,
                    reference=voucher.voucher_number,
                    status='posted'
                ).first()
                if journal:
                    reversal_reason = reason or "عكس سند قبض طالب"
                    reversal_journal = PostingService.reverse_journal_entry(
                        tenant_id=tenant_id,
                        journal_entry_id=journal.id,
                        user_id=user_id,
                        reversal_reason=reversal_reason
                    )
                # تحديث حالة السند المالي
                voucher.status = 'cancelled'
                voucher.save(update_fields=['status'])
            except ObjectDoesNotExist:
                logger.warning(f"لم يتم العثور على السند أو القيد المرتبط بالإيصال {receipt.receipt_number}")

        if reversal_journal:
            receipt.reversal_journal_entry_id = reversal_journal.id
            receipt.save(update_fields=['reversal_journal_entry_id'])

        # --- 7. تسجيل التدقيق ---
        BillingAudit.objects.create(
            tenant_id=tenant_id,
            action_type='cancel_receipt',
            performed_by=user_id,
            details={
                'receipt_id': str(receipt.id),
                'receipt_number': receipt.receipt_number,
                'amount': float(receipt.amount),
                'reason': reason or '',
                'reversal_journal_id': str(reversal_journal.id) if reversal_journal else None,
                'allocations_reversed': float(total_allocated),
                'credit_reversed': float(credit_reversed),
            }
        )

        # --- 8. نشر حدث إلغاء الدفعة ---
        student_name = ""
        try:
            from apps.students.domain.models import Student
            st = Student.objects.filter(id=account.student_id).first()
            if st:
                student_name = st.profile.arabic_name if hasattr(st, 'profile') and st.profile else ""
        except Exception as e:
            logger.warning(f"Failed to resolve student info for cancellation event: {e}")

        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='PaymentCancelled',
            source_module='student_finance',
            event_data={
                'receipt_id': str(receipt.id),
                'receipt_number': receipt.receipt_number,
                'student_id': str(account.student_id),
                'student_name': student_name,
                'amount': float(receipt.amount),
                'reason': reason or '',
                'date': str(timezone.now().date())
            }
        )

        logger.info(
            f"تم عكس سند القبض {receipt.receipt_number} بنجاح — "
            f"المبلغ: {receipt.amount} ج.س — الطالب: {student_name}"
        )

        return receipt

    @classmethod
    @db_atomic
    def delete_receipt(cls, tenant_id, receipt_id, user_id=None, reason=None):
        """
        حذف السند وإلغاء أثره المالي خلال الـ 24 ساعة الأولى من تسجيله،
        أو بعد 24 ساعة بصلاحية الأدمن / الإذن الإداري (unlock).
        """
        is_admin = False
        user_perms = []
        if user_id:
            from apps.identity.domain.models import User
            from apps.identity.domain.rbac import UserRole, RolePermission
            try:
                user = User.objects.get(id=user_id)
                if user.is_superuser:
                    is_admin = True
                else:
                    roles_qs = UserRole.objects.filter(user=user, tenant_id=tenant_id).values_list('role_id', flat=True)
                    has_admin_role = UserRole.objects.filter(
                        user=user, tenant_id=tenant_id, role__code='administrator'
                    ).exists()
                    if has_admin_role:
                        is_admin = True
                    user_perms = list(RolePermission.objects.filter(role_id__in=roles_qs).values_list('permission__code', flat=True))
            except ObjectDoesNotExist:
                raise ValidationError("المستخدم غير موجود.")

        receipt = Receipt.objects.select_for_update().get(id=receipt_id, tenant_id=tenant_id)
        if receipt.status == 'reversed':
            raise ValidationError("لا يمكن حذف سند معكوس محاسبياً بالفعل.")

        # التحقق من نافذة الـ 24 ساعة والصلاحيات
        now = timezone.now()
        hours_passed = (now - receipt.created_at).total_seconds() / 3600.0 if receipt.created_at else 999.0
        is_unlocked_by_admin = bool(receipt.admin_unlocked_until and receipt.admin_unlocked_until >= now)

        if hours_passed > 24.0 and not is_admin and not is_unlocked_by_admin:
            raise ValidationError(
                f"انقضت المهلة المحددة لحذف السند (24 ساعة، مضى {hours_passed:.1f} ساعة). "
                f"يتطلب الحذف والتعديل بعد هذه المدة موافقة وفتح القفل من مدير النظام (الأدمن)."
            )

        if not is_admin and not is_unlocked_by_admin and 'receipts:delete' not in user_perms:
            # إذا لم تكن صلاحية receipts:delete ممنوحة في مصفوفة الصلاحيات
            raise ValidationError("ليس لديك صلاحية حذف وتعديل سندات القبض في مصفوفة الصلاحيات.")

        account = StudentBillingAccount.objects.select_for_update().get(
            id=receipt.student_billing_account_id, tenant_id=tenant_id
        )

        # 1. التراجع عن تخصيصات السداد (PaymentAllocation)
        allocations = PaymentAllocation.objects.filter(receipt=receipt)
        total_allocated = Decimal('0.0')
        for alloc in allocations:
            allocated_amount = alloc.amount_allocated
            total_allocated += allocated_amount

            receivable = StudentReceivable.objects.select_for_update().get(id=alloc.receivable_id)
            receivable.paid_amount = max(Decimal('0.0'), receivable.paid_amount - allocated_amount)
            receivable.outstanding_amount += allocated_amount
            if receivable.status == 'paid':
                receivable.status = 'outstanding'
            receivable.save(update_fields=['paid_amount', 'outstanding_amount', 'status'])

            invoice = receivable.invoice
            invoice.paid_amount = max(Decimal('0.0'), invoice.paid_amount - allocated_amount)
            invoice.outstanding_amount += allocated_amount
            invoice.save(update_fields=['paid_amount', 'outstanding_amount'])

        # حذف سجلات التخصيص
        allocations.delete()

        # 2. تسوية فائض السداد وحساب الفوترة
        credit_reversed = receipt.amount - total_allocated
        if credit_reversed > 0:
            account.credit_balance = max(Decimal('0.0'), account.credit_balance - credit_reversed)

        account.outstanding_balance += receipt.amount
        account.current_balance += receipt.amount
        account.save(update_fields=['outstanding_balance', 'current_balance', 'credit_balance'])

        # 3. معالجة سند الصندوق/البنك والقيد في موديول المالية
        if receipt.voucher_id:
            try:
                voucher = Voucher.objects.filter(id=receipt.voucher_id, tenant_id=tenant_id).first()
                if voucher:
                    # إلغاء القيد المرتبط به إن وجد
                    journals = JournalEntry.objects.filter(tenant_id=tenant_id, reference=voucher.voucher_number)
                    for j in journals:
                        j.lines.all().delete()
                        j.delete()
                    voucher.status = 'cancelled'
                    voucher.save(update_fields=['status'])
                    voucher.delete()
            except Exception as e:
                logger.warning(f"Error cleaning up voucher during receipt deletion: {e}")

        # 4. تسجيل التدقيق المالي
        receipt_num = receipt.receipt_number
        rec_amount = float(receipt.amount)
        BillingAudit.objects.create(
            tenant_id=tenant_id,
            action_type='delete_receipt',
            performed_by=user_id,
            details={
                'receipt_number': receipt_num,
                'amount': rec_amount,
                'reason': reason or 'حذف سند القبض خلال مهلة الـ 24 ساعة',
                'hours_passed': hours_passed,
            }
        )

        # 5. حذف سجل سند القبض نفسه
        receipt.delete()
        return {'receipt_number': receipt_num, 'amount': rec_amount}

    @classmethod
    @db_atomic
    def unlock_receipt_for_edit(cls, tenant_id, receipt_id, user_id, unlock_hours=24):
        """
        صلاحية خاصة بمدير النظام (الأدمن) لفتح قفل السند للتعديل أو الحذف بعد انقضاء 24 ساعة.
        """
        from apps.identity.domain.models import User
        from apps.identity.domain.rbac import UserRole, RolePermission
        user = User.objects.get(id=user_id)
        is_admin = user.is_superuser
        if not is_admin:
            roles_qs = UserRole.objects.filter(user=user, tenant_id=tenant_id).values_list('role_id', flat=True)
            has_admin_role = UserRole.objects.filter(
                user=user, tenant_id=tenant_id, role__code='administrator'
            ).exists()
            has_unlock_perm = RolePermission.objects.filter(role_id__in=roles_qs, permission__code='receipts:unlock').exists()
            if not has_admin_role and not has_unlock_perm:
                raise ValidationError("فتح قفل السند للتعديل بعد 24 ساعة يتطلب صلاحية مدير النظام أو إذن receipts:unlock.")

        receipt = Receipt.objects.select_for_update().get(id=receipt_id, tenant_id=tenant_id)
        if receipt.status == 'reversed':
            raise ValidationError("لا يمكن فتح قفل سند معكوس.")

        from datetime import timedelta
        receipt.admin_unlocked_until = timezone.now() + timedelta(hours=unlock_hours)
        receipt.admin_unlocked_by = user_id
        receipt.save(update_fields=['admin_unlocked_until', 'admin_unlocked_by'])

        BillingAudit.objects.create(
            tenant_id=tenant_id,
            action_type='unlock_receipt',
            performed_by=user_id,
            details={
                'receipt_id': str(receipt.id),
                'receipt_number': receipt.receipt_number,
                'unlocked_until': str(receipt.admin_unlocked_until),
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
    @db_atomic
    def apply_scholarship(cls, tenant_id, billing_account_id, name, scholarship_type, amount_percentage, fixed_amount, start_date, end_date=None, user_id=None):
        """
        إضافة منحة جديدة للطالب وتفعيلها واعتماد خصمها فوراً على الفواتير المفتوحة والأقساط وحساب الطالب.
        """
        account = StudentBillingAccount.objects.get(id=billing_account_id, tenant_id=tenant_id)
        
        amount_percentage = Decimal(str(amount_percentage or 0))
        fixed_amount = Decimal(str(fixed_amount or 0))

        scholarship = Scholarship.objects.create(
            tenant_id=tenant_id,
            student_billing_account=account,
            name=name,
            type=scholarship_type,
            amount_percentage=amount_percentage,
            fixed_amount=fixed_amount,
            status='approved',
            start_date=start_date or date.today(),
            end_date=end_date
        )

        # 2. تطبيق الخصم فورياً على الفواتير القائمة المفتوحة للطالب
        open_invoices = StudentInvoice.objects.filter(
            tenant_id=tenant_id,
            student_billing_account=account,
            status__in=['posted', 'draft'],
            outstanding_amount__gt=Decimal('0.0')
        ).order_by('issue_date', 'id')

        total_discount_applied = Decimal('0.0')

        for inv in open_invoices:
            # حساب الخصم
            if amount_percentage > Decimal('0.0'):
                # حساب إجمالي الفاتورة الأساسي قبل الخصومات السابقة إن وجدت
                existing_disc = inv.discounts.aggregate(s=Sum('amount'))['s'] or Decimal('0.0')
                gross_base = inv.total_amount + existing_disc
                if gross_base <= Decimal('0.0'):
                    gross_base = inv.outstanding_amount
                disc_amount = (gross_base * (amount_percentage / Decimal('100.0'))).quantize(Decimal('0.01'))
            else:
                disc_amount = fixed_amount.quantize(Decimal('0.01'))

            # لا يتجاوز الخصم الرصيد المستحق على الفاتورة
            disc_amount = min(disc_amount, inv.outstanding_amount)

            if disc_amount > Decimal('0.0'):
                # إنشاء سجل الخصم الرسمي في الفاتورة
                InvoiceDiscount.objects.create(
                    tenant_id=tenant_id,
                    invoice=inv,
                    discount_type='percentage' if amount_percentage > Decimal('0.0') else 'fixed',
                    amount=disc_amount,
                    discount_reason=f"منحة معتمدة: {name}"
                )

                # تحديث مبالغ الفاتورة
                inv.outstanding_amount = max(Decimal('0.0'), inv.outstanding_amount - disc_amount)
                if inv.paid_amount == Decimal('0.0'):
                    inv.total_amount = max(Decimal('0.0'), inv.total_amount - disc_amount)
                    inv.save(update_fields=['total_amount', 'outstanding_amount'])
                else:
                    inv.save(update_fields=['outstanding_amount'])

                total_discount_applied += disc_amount

                # تحديث سجل المستحقات StudentReceivable
                receivable = StudentReceivable.objects.filter(
                    tenant_id=tenant_id,
                    invoice=inv
                ).first()
                if receivable:
                    receivable.outstanding_amount = inv.outstanding_amount
                    if inv.paid_amount == Decimal('0.0'):
                        receivable.amount = inv.total_amount
                    if receivable.outstanding_amount <= Decimal('0.0'):
                        receivable.status = 'settled'
                    receivable.save(update_fields=['amount', 'outstanding_amount', 'status'])

        # 3. إعادة جدولة وتخفيض الأقساط المتبقية غير المسددة
        if total_discount_applied > Decimal('0.0'):
            unpaid_installments = Installment.objects.filter(
                tenant_id=tenant_id,
                student_billing_account=account,
                status__in=['pending', 'overdue']
            ).order_by('due_date')

            if unpaid_installments.exists():
                inst_count = unpaid_installments.count()
                portion_disc = (total_discount_applied / Decimal(str(inst_count))).quantize(Decimal('0.01'))
                for inst in unpaid_installments:
                    rem_due = max(Decimal('0.0'), inst.amount - inst.paid_amount)
                    new_rem = max(Decimal('0.0'), rem_due - portion_disc)
                    inst.amount = inst.paid_amount + new_rem
                    if new_rem <= Decimal('0.0'):
                        inst.status = 'paid'
                    inst.save(update_fields=['amount', 'status'])

        # 4. تحديث رصيد حساب الطالب المالي الإجمالي
        all_invoices = StudentInvoice.objects.filter(
            tenant_id=tenant_id,
            student_billing_account=account,
            status__in=['posted', 'draft']
        )
        total_remaining = all_invoices.aggregate(s=Sum('outstanding_amount'))['s'] or Decimal('0.0')
        account.outstanding_balance = total_remaining
        account.current_balance = total_remaining
        account.save(update_fields=['outstanding_balance', 'current_balance'])

        # 5. إطلاق حدث منصة الاتصالات
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='ScholarshipApproved',
            source_module='student_finance',
            event_data={
                'scholarship_id': str(scholarship.id),
                'student_id': str(account.student_id),
                'name': name,
                'discount_applied': float(total_discount_applied)
            }
        )

        return scholarship

    @classmethod
    @db_atomic
    def cancel_scholarship(cls, tenant_id, scholarship_id, user_id=None):
        """
        إلغاء المنحة الدراسية وعكس الخصم المالي المترتب عليها وإعادة رصيد الفاتورة والمستحقات وحساب الطالب.
        """
        scholarship = Scholarship.objects.get(id=scholarship_id, tenant_id=tenant_id)
        account = scholarship.student_billing_account

        # البحث عن الخصومات المرتبطة بهذه المنحة في فواتير هذا الحساب
        linked_discounts = InvoiceDiscount.objects.filter(
            tenant_id=tenant_id,
            invoice__student_billing_account=account,
            discount_reason__icontains=scholarship.name
        )

        total_reversed = Decimal('0.0')
        for disc in linked_discounts:
            inv = disc.invoice
            disc_amt = disc.amount
            total_reversed += disc_amt
            disc.delete()

            # إعادة الرصيد إلى الفاتورة
            inv.outstanding_amount += disc_amt
            if inv.paid_amount == Decimal('0.0'):
                inv.total_amount += disc_amt
                inv.save(update_fields=['total_amount', 'outstanding_amount'])
            else:
                inv.save(update_fields=['outstanding_amount'])

            # تحديث المستحقات
            receivable = StudentReceivable.objects.filter(tenant_id=tenant_id, invoice=inv).first()
            if receivable:
                receivable.outstanding_amount = inv.outstanding_amount
                if inv.paid_amount == Decimal('0.0'):
                    receivable.amount = inv.total_amount
                receivable.status = 'outstanding'
                receivable.save(update_fields=['amount', 'outstanding_amount', 'status'])

        # إعادة الأقساط إذا وُجدت
        if total_reversed > Decimal('0.0'):
            unpaid_installments = Installment.objects.filter(
                tenant_id=tenant_id,
                student_billing_account=account,
                status__in=['pending', 'overdue', 'paid']
            ).order_by('due_date')

            if unpaid_installments.exists():
                inst_count = unpaid_installments.count()
                portion_rev = (total_reversed / Decimal(str(inst_count))).quantize(Decimal('0.01'))
                for inst in unpaid_installments:
                    inst.amount += portion_rev
                    if inst.status == 'paid' and inst.amount > inst.paid_amount:
                        inst.status = 'pending'
                    inst.save(update_fields=['amount', 'status'])

        # تحديث رصيد الحساب المالي الإجمالي
        all_invoices = StudentInvoice.objects.filter(
            tenant_id=tenant_id,
            student_billing_account=account,
            status__in=['posted', 'draft']
        )
        total_remaining = all_invoices.aggregate(s=Sum('outstanding_amount'))['s'] or Decimal('0.0')
        account.outstanding_balance = total_remaining
        account.current_balance = total_remaining
        account.save(update_fields=['outstanding_balance', 'current_balance'])

        scholarship.status = 'cancelled'
        scholarship.save(update_fields=['status'])

        return scholarship


# ============================================================
# 4. Hold Service — خدمة إدارة الحظر المالي للطلاب
# ============================================================
class HoldService:
    """
    الخدمة المسؤولة عن فرض وإلغاء الحظر المالي التلقائي واليدوي على حسابات الطلاب.
    """

    @classmethod
    @db_atomic
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
    @db_atomic
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
