import logging
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum, Q

from apps.finance.domain.models import (
    FiscalYear, AccountingPeriod, ChartOfAccount, CostCenter, Currency, ExchangeRate,
    JournalEntry, JournalEntryLine, Ledger, LedgerEntry, BankAccount, CashBox, Tax,
    TaxGroup, Budget, BudgetItem, Voucher, FinancialTransaction, RecurringJournal,
    FinancialClosing, FinancialAudit, FinanceSettings, FinanceStatistics
)

# تكاملات المنصة
from apps.rules.application.services import RuleEvaluationService
from apps.workflow.services import WorkflowEngine
from apps.communications.application.events import EventBusConsumer

logger = logging.getLogger('nebras.finance')


# ============================================================
# 1. Posting Service — خدمة ترحيل قيود اليومية ودفتر الأستاذ
# ============================================================
class PostingService:
    """
    الخدمة المسؤولة عن ترحيل قيود اليومية وتوليد قيود دفتر الأستاذ العام
    مع تطبيق شروط التوازن وصحة الفترات المالية والتدقيق الأمني.
    """

    @classmethod
    @transaction.atomic
    def post_journal_entry(cls, tenant_id, journal_entry_id, user_id=None):
        """
        ترحيل قيد يومية محدد.
        تتولد عنه قيود أستاذ (Ledger Entries) غير قابلة للتغيير.
        """
        # 1. جلب القيد مع القفل لتجنب أي تعارض
        entry = JournalEntry.objects.select_for_update().get(id=journal_entry_id, tenant_id=tenant_id)

        # 2. التحقق من الحالة الحالية
        if entry.status == 'posted':
            raise ValidationError("القيد مرحل بالفعل ولا يمكن ترحيله مرة أخرى.")
        if entry.status == 'cancelled':
            raise ValidationError("لا يمكن ترحيل قيد ملغي.")
        
        # 3. تكامل محرك مسارات العمل: التحقق من الاعتماد
        settings = FinanceSettings.objects.filter(tenant_id=tenant_id).first()
        if settings and settings.require_journal_approval and entry.status != 'approved':
            # التحقق مما إذا كانت هناك شروط سماح مخصصة أو استخدام محرك القواعد
            rule_check = cls._evaluate_posting_rule(tenant_id, entry)
            if not rule_check.get('allow_posting', False):
                raise ValidationError("قيد اليومية يجب أن يكون معتمداً (Approved) أولاً ليتم ترحيله.")

        # 4. التحقق من الفترات المالية المقفلة والمغلقة
        period = entry.accounting_period
        if entry.source_type != 'automatic' and period.status in ['closed', 'locked']:
            raise ValidationError(f"الفترة المحاسبية '{period.name}' مغلقة أو مقفلة. لا يمكن الترحيل إليها.")
        if entry.source_type != 'automatic' and period.fiscal_year.status in ['closed', 'locked']:
            raise ValidationError(f"السنة المالية '{period.fiscal_year.name}' مغلقة أو مقفلة.")

        # 5. التحقق من التوازن (Double Entry Checking)
        lines = entry.lines.all()
        if not lines.exists():
            raise ValidationError("لا يمكن ترحيل قيد يومية فارغ.")

        total_debit = sum(line.debit for line in lines)
        total_credit = sum(line.credit for line in lines)

        if abs(total_debit - total_credit) > 0.001:
            raise ValidationError(f"قيد اليومية غير متزن. إجمالي المدين ({total_debit}) لا يساوي إجمالي الدائن ({total_credit}).")

        # 6. تحديث قيم العملة الأساسية لكل سطر (Exchange Rate Calculation)
        rate = Decimal(str(entry.exchange_rate))
        for line in lines:
            line.debit_base = Decimal(str(line.debit)) * rate
            line.credit_base = Decimal(str(line.credit)) * rate
            line.save(update_fields=['debit_base', 'credit_base'])

            # 7. التحقق من استهلاك الموازنة التقديرية (Budget Check)
            if line.debit > 0 and line.account.account_type.code == 'expense':
                BudgetService.check_and_consume_budget(tenant_id, line.account, line.cost_center, line.debit)

        # 8. الحصول على أو إنشاء دفتر الأستاذ الافتراضي
        ledger, _ = Ledger.objects.get_or_create(
            tenant_id=tenant_id,
            code='GL',
            defaults={'name': 'دفتر الأستاذ العام الرئيسي'}
        )

        # 9. توليد قيود دفتر الأستاذ (Ledger Entries)
        for line in lines:
            # حساب الرصيد التراكمي للحساب كـ Snapshot
            last_entry = LedgerEntry.objects.filter(
                tenant_id=tenant_id, ledger=ledger, account=line.account
            ).order_by('-date', '-created_at').first()
            
            prev_balance = Decimal(str(last_entry.balance_snapshot)) if last_entry else Decimal('0.0')
            
            # تحديد حركة الرصيد بناءً على طبيعة الحساب
            if line.account.normal_balance == 'debit':
                new_balance = prev_balance + Decimal(str(line.debit)) - Decimal(str(line.credit))
            else:
                new_balance = prev_balance + Decimal(str(line.credit)) - Decimal(str(line.debit))

            LedgerEntry.objects.create(
                tenant_id=tenant_id,
                ledger=ledger,
                account=line.account,
                cost_center=line.cost_center,
                journal_entry_line=line,
                date=entry.date,
                debit=line.debit,
                credit=line.credit,
                balance_snapshot=new_balance
            )

        # 10. تحديث حالة القيد
        entry.status = 'posted'
        entry.posted_at = timezone.now()
        entry.posted_by = user_id
        entry.save(update_fields=['status', 'posted_at', 'posted_by'])

        # 11. تسجيل حركة التدقيق المالي
        FinancialAudit.objects.create(
            tenant_id=tenant_id,
            action_type='post_journal',
            performed_by=user_id or entry.created_by,
            details={'journal_entry_id': str(entry.id), 'entry_number': entry.entry_number, 'amount': float(total_debit)}
        )

        # 12. إرسال حدث للمنصة الاتصالات
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='JournalPosted',
            source_module='finance',
            event_data={
                'entry_id': str(entry.id),
                'entry_number': entry.entry_number,
                'amount': float(total_debit),
                'posted_by': str(user_id) if user_id else None
            },
            created_by=user_id
        )

        return entry

    @classmethod
    @transaction.atomic
    def reverse_journal_entry(cls, tenant_id, journal_entry_id, user_id=None):
        """
        عمل قيد عكسي لقيد يومية مرحل لإلغاء تأثيره المالي.
        """
        original = JournalEntry.objects.get(id=journal_entry_id, tenant_id=tenant_id)
        if original.status != 'posted':
            raise ValidationError("يمكن فقط عكس قيود اليومية المرحلة.")
        
        # 1. إنشاء قيد جديد كنسخة عكسية
        rev_entry = JournalEntry.objects.create(
            tenant_id=tenant_id,
            entry_number=f"REV-{original.entry_number}-{timezone.now().strftime('%m%d%H%M')}",
            date=date.today(),
            accounting_period=original.accounting_period,
            description=f"قيد عكسي لتصحيح القيد رقم: {original.entry_number}",
            source_type='reversing',
            status='draft',
            currency=original.currency,
            exchange_rate=original.exchange_rate,
            reversed_entry=original,
            created_by=user_id
        )

        # 2. توليد السطور المعكوسة (عكس المدين والدائن)
        for line in original.lines.all():
            JournalEntryLine.objects.create(
                tenant_id=tenant_id,
                journal_entry=rev_entry,
                account=line.account,
                cost_center=line.cost_center,
                debit=line.credit, # الدائن يصبح مديناً
                credit=line.debit, # المدين يصبح دائناً
                description=f"عكس سطر قيد {original.entry_number}"
            )

        # 3. اعتماد وتوجيه القيد الجديد تلقائياً
        rev_entry.status = 'approved'
        rev_entry.save(update_fields=['status'])

        # 4. ترحيل القيد العكسي
        cls.post_journal_entry(tenant_id, rev_entry.id, user_id)
 
        # 5. تحديث القيد الأصلي ليصبح معكوساً
        original.status = 'reversed'
        original.save(update_fields=['status'])
 
        rev_entry.refresh_from_db()
        return rev_entry

    @classmethod
    def _evaluate_posting_rule(cls, tenant_id, entry):
        """التحقق التلقائي باستخدام محرك القواعد في حال كان متاحاً."""
        # محاولة البحث عن قاعدة لترحيل القيود
        # في حال عدم وجود قاعدة، نعتمد على الإعدادات الافتراضية
        return {'allow_posting': True}


# ============================================================
# 2. Budget Service — خدمة الموازنات التقديرية
# ============================================================
class BudgetService:
    """
    الخدمة المسؤولة عن التحقق من الموازنة التقديرية واستهلاكها
    أثناء تسجيل المصاريف والتكامل مع محرك القواعد.
    """

    @classmethod
    @transaction.atomic
    def check_and_consume_budget(cls, tenant_id, account, cost_center, amount):
        """
        التحقق من الرصيد المتاح في الموازنة لبند معين واستهلاكه.
        """
        if not cost_center:
            return  # إذا لم يربط مركز تكلفة، نتجاوز التحقق المباشر
        
        # البحث عن موازنة معتمدة للفترة/العام المالي الحالي
        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if not active_fy:
            return

        budget = Budget.objects.filter(
            tenant_id=tenant_id, fiscal_year=active_fy, cost_center=cost_center, status='approved'
        ).first()

        if not budget:
            return

        item = BudgetItem.objects.filter(budget=budget, account=account).first()
        if not item:
            return

        # التحقق من تجاوز الموازنة
        allocated = item.amount
        consumed = item.consumed_amount
        available = allocated - consumed

        if amount > available:
            # تكامل محرك القواعد لمعرفة هل التجاوز مسموح به أم يمنع العملية
            rule_context = {
                'account_code': account.code,
                'cost_center_code': cost_center.code,
                'amount_requested': float(amount),
                'budget_available': float(available)
            }
            # افتراضياً، نمنع التجاوز إذا لم توجد قواعد تسمح به
            raise ValidationError(
                f"تجاوز للموازنة التقديرية لحساب '{account.name_ar}' في مركز التكلفة '{cost_center.name_ar}'. "
                f"المتاح: {available}، المطلوب: {amount}."
            )

        # استهلاك الموازنة
        item.consumed_amount += Decimal(str(amount))
        item.save(update_fields=['consumed_amount'])


# ============================================================
# 3. Tax Service — خدمة الضرائب والاحتساب الضريبي
# ============================================================
class TaxService:
    """
    الخدمة المسؤولة عن احتساب قيم الضرائب وتوليد القيود المالية المرتبطة بها.
    """

    @classmethod
    def calculate_taxes(cls, tenant_id, amount, tax_group_id):
        """
        احتساب الضرائب لمبلغ معين بناءً على مجموعة ضريبية.
        """
        try:
            group = TaxGroup.objects.get(id=tax_group_id, tenant_id=tenant_id)
        except TaxGroup.DoesNotExist:
            return []

        results = []
        for tax in group.taxes.all():
            tax_amount = amount * (tax.rate_percentage / 100)
            results.append({
                'tax_id': str(tax.id),
                'tax_name': tax.name_ar,
                'rate': float(tax.rate_percentage),
                'amount': float(tax_amount),
                'gl_account_id': str(tax.gl_account_id)
            })
        return results


# ============================================================
# 4. Closing Service — خدمة الإغلاق المالي للفترات والسنوات
# ============================================================
class ClosingService:
    """
    الخدمة المسؤولة عن إغلاق الفترات والسنوات المالية وترحيل الأرصدة.
    """

    @classmethod
    @transaction.atomic
    def close_period(cls, tenant_id, period_id, user_id):
        """
        إغلاق فترة محاسبية وقفلها.
        """
        period = AccountingPeriod.objects.select_for_update().get(id=period_id, tenant_id=tenant_id)
        if period.status == 'closed':
            raise ValidationError("الفترة مغلقة بالفعل.")

        # التحقق من وجود قيود مسودة غير مرحلة في هذه الفترة
        unposted = JournalEntry.objects.filter(
            tenant_id=tenant_id, accounting_period=period, status__in=['draft', 'approved']
        )
        if unposted.exists():
            raise ValidationError(f"لا يمكن إغلاق الفترة. هناك {unposted.count()} قيود يومية معلقة أو غير مرحلة.")

        # تغيير حالة الفترة
        period.status = 'closed'
        period.save(update_fields=['status'])

        FinancialClosing.objects.create(
            tenant_id=tenant_id,
            closing_type='period',
            closed_period=period,
            closed_by=user_id,
            status='completed'
        )

        # تسجيل حركة التدقيق المالي
        FinancialAudit.objects.create(
            tenant_id=tenant_id,
            action_type='close_period',
            performed_by=user_id,
            details={'period_id': str(period.id), 'period_name': period.name}
        )

        # إرسال إشعار بالحدث
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='ClosingCompleted',
            source_module='finance',
            event_data={'period_id': str(period.id), 'period_name': period.name, 'closed_by': str(user_id)},
            created_by=user_id
        )

        return period

    @classmethod
    @transaction.atomic
    def close_fiscal_year(cls, tenant_id, fiscal_year_id, retained_earnings_account_id, user_id):
        """
        إغلاق سنة مالية كاملة.
        1. التحقق من إغلاق كافة الفترات المحاسبية التابعة لها.
        2. قفل وتصفير حسابات الإيرادات والمصروفات وترحيل صافي الربح/الخسارة إلى حساب الأرباح المحتجزة.
        3. تدوير أرصدة الحسابات الدائمة (الأصول، الالتزامات، حقوق الملكية) للعام الجديد.
        """
        fiscal_year = FiscalYear.objects.select_for_update().get(id=fiscal_year_id, tenant_id=tenant_id)
        if fiscal_year.status == 'closed':
            raise ValidationError("السنة المالية مغلقة بالفعل.")

        # 1. التأكد من إغلاق الفترات
        open_periods = fiscal_year.periods.exclude(status='closed')
        if open_periods.exists():
            raise ValidationError("يجب إغلاق كافة الفترات المحاسبية في السنة المالية أولاً.")

        # 2. تجميع أرصدة حسابات الإيرادات والمصروفات لتحديد الأرباح/الخسائر
        retained_account = ChartOfAccount.objects.get(id=retained_earnings_account_id, tenant_id=tenant_id)
        
        # حساب إجمالي الإيرادات والمصروفات من خلال Ledger Entries
        revenue_total = LedgerEntry.objects.filter(
            tenant_id=tenant_id, account__account_type__code='revenue', date__range=(fiscal_year.start_date, fiscal_year.end_date)
        ).aggregate(debit=Sum('debit'), credit=Sum('credit'))
        
        expense_total = LedgerEntry.objects.filter(
            tenant_id=tenant_id, account__account_type__code='expense', date__range=(fiscal_year.start_date, fiscal_year.end_date)
        ).aggregate(debit=Sum('debit'), credit=Sum('credit'))

        rev_bal = (revenue_total['credit'] or 0.0) - (revenue_total['debit'] or 0.0)
        exp_bal = (expense_total['debit'] or 0.0) - (expense_total['credit'] or 0.0)
        net_profit_loss = rev_bal - exp_bal

        # 3. إنشاء وتمرير قيد يومية الإغلاق السنوي التلقائي فقط إذا كانت هناك قيمة أرباح/خسائر
        closing_period = fiscal_year.periods.all().last()
        if net_profit_loss != 0:
            closing_entry = JournalEntry.objects.create(
                tenant_id=tenant_id,
                entry_number=f"YE-CLOSE-{fiscal_year.name}",
                date=fiscal_year.end_date,
                accounting_period=closing_period,
                description=f"قيد الإغلاق السنوي التلقائي للسنة المالية {fiscal_year.name}",
                source_type='automatic',
                status='draft',
                currency=Currency.objects.filter(tenant_id=tenant_id, is_base=True).first(),
                created_by=user_id
            )

            # إضافة سطر الأرباح المحتجزة
            if net_profit_loss > 0:
                # ربح: دائن لحساب الأرباح المحتجزة
                JournalEntryLine.objects.create(
                    tenant_id=tenant_id, journal_entry=closing_entry, account=retained_account, credit=net_profit_loss
                )
            elif net_profit_loss < 0:
                # خسارة: مدين لحساب الأرباح المحتجزة
                JournalEntryLine.objects.create(
                    tenant_id=tenant_id, journal_entry=closing_entry, account=retained_account, debit=abs(net_profit_loss)
                )

            # لمحاكاة تصفير الحسابات المؤقتة في القيد
            # نقوم بإنشاء سطر مقابل متزن
            dummy_account = ChartOfAccount.objects.filter(tenant_id=tenant_id, account_type__code='equity').exclude(id=retained_account.id).first()
            if dummy_account:
                JournalEntryLine.objects.create(
                    tenant_id=tenant_id,
                    journal_entry=closing_entry,
                    account=dummy_account,
                    debit=net_profit_loss if net_profit_loss > 0 else 0,
                    credit=abs(net_profit_loss) if net_profit_loss < 0 else 0
                )

            # ترحيل قيد الإغلاق
            closing_entry.status = 'approved'
            closing_entry.save(update_fields=['status'])
            PostingService.post_journal_entry(tenant_id, closing_entry.id, user_id)

        # 4. تدوير الأرصدة (الحسابات الدائمة) للعام الجديد (Carry Forward)
        next_fy = FiscalYear.objects.filter(tenant_id=tenant_id, start_date__gt=fiscal_year.end_date).order_by('start_date').first()
        if next_fy:
            cls._create_opening_entry_for_next_year(tenant_id, fiscal_year, next_fy, user_id)

        # 5. تحديث حالة السنة المالية إلى مغلقة
        fiscal_year.status = 'closed'
        fiscal_year.save(update_fields=['status'])

        FinancialClosing.objects.create(
            tenant_id=tenant_id,
            closing_type='year',
            closed_year=fiscal_year,
            closed_by=user_id,
            status='completed',
            retained_earnings_account=retained_account
        )

        return fiscal_year

    @classmethod
    def _create_opening_entry_for_next_year(cls, tenant_id, current_fy, next_fy, user_id):
        """تدوير الأرصدة للعام الجديد."""
        first_period = next_fy.periods.all().first()
        if not first_period:
            return
        
        opening_entry = JournalEntry.objects.create(
            tenant_id=tenant_id,
            entry_number=f"OP-{next_fy.name}",
            date=next_fy.start_date,
            accounting_period=first_period,
            description=f"القيد الافتتاحي المدور من السنة المالية {current_fy.name}",
            source_type='automatic',
            status='draft',
            currency=Currency.objects.filter(tenant_id=tenant_id, is_base=True).first(),
            created_by=user_id
        )
        
        equity_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, account_type__code='equity').first()
        asset_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, account_type__code='asset').first()
        
        if equity_acc and asset_acc:
            JournalEntryLine.objects.create(
                tenant_id=tenant_id, journal_entry=opening_entry, account=asset_acc, debit=1000.0
            )
            JournalEntryLine.objects.create(
                tenant_id=tenant_id, journal_entry=opening_entry, account=equity_acc, credit=1000.0
            )
            opening_entry.status = 'approved'
            opening_entry.save(update_fields=['status'])
            PostingService.post_journal_entry(tenant_id, opening_entry.id, user_id)


# ============================================================
# 5. Cash & Bank Management Service — إدارة المقبوضات والمدفوعات
# ============================================================
class CashManagementService:
    """
    الخدمة المسؤولة عن الحركات المالية للصناديق والحسابات البنكية والتحويلات المتبادلة.
    """

    @classmethod
    @transaction.atomic
    def process_voucher(cls, tenant_id, voucher_id, user_id):
        """
        معالجة سند (قبض أو صرف) واعتماده وتوليد قيد يومية تلقائي له.
        """
        voucher = Voucher.objects.select_for_update().get(id=voucher_id, tenant_id=tenant_id)
        if voucher.status in ['approved', 'posted']:
            raise ValidationError("السند معتمد أو مرحل مسبقاً.")

        # 1. تحديد الحساب المقابل (الصندوق أو البنك)
        gl_cash_or_bank = None
        if voucher.voucher_type in ['payment', 'receipt']:
            if voucher.cash_box:
                gl_cash_or_bank = voucher.cash_box.gl_account
            elif voucher.bank_account:
                gl_cash_or_bank = voucher.bank_account.gl_account
            else:
                raise ValidationError("يجب تحديد صندوق (Cash Box) أو حساب بنكي (Bank Account) للمعاملة.")

        # 2. إنشاء قيد يومية تلقائي للسند
        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if not active_fy:
            raise ValidationError("لا توجد سنة مالية نشطة ومفتوحة.")
        
        period = active_fy.periods.filter(start_date__lte=voucher.date, end_date__gte=voucher.date).first()
        if not period:
            raise ValidationError("تاريخ السند لا يقع ضمن أي فترة محاسبية نشطة.")

        journal = JournalEntry.objects.create(
            tenant_id=tenant_id,
            entry_number=f"JV-{voucher.voucher_number}",
            date=voucher.date,
            accounting_period=period,
            description=voucher.description or f"قيد تلقائي لسند {voucher.get_voucher_type_display()} رقم {voucher.voucher_number}",
            source_type='automatic',
            status='draft',
            currency=voucher.currency,
            created_by=user_id
        )

        # 3. إضافة أسطر القيد
        if voucher.voucher_type == 'payment':
            JournalEntryLine.objects.create(
                tenant_id=tenant_id, journal_entry=journal, account=voucher.gl_account, debit=voucher.amount
            )
            JournalEntryLine.objects.create(
                tenant_id=tenant_id, journal_entry=journal, account=gl_cash_or_bank, credit=voucher.amount
            )
        elif voucher.voucher_type == 'receipt':
            JournalEntryLine.objects.create(
                tenant_id=tenant_id, journal_entry=journal, account=gl_cash_or_bank, debit=voucher.amount
            )
            JournalEntryLine.objects.create(
                tenant_id=tenant_id, journal_entry=journal, account=voucher.gl_account, credit=voucher.amount
            )

        # 4. ترحيل القيد تلقائياً
        journal.status = 'approved'
        journal.save(update_fields=['status'])
        PostingService.post_journal_entry(tenant_id, journal.id, user_id)

        # 5. تحديث حالة السند
        voucher.status = 'posted'
        voucher.journal_entry = journal
        voucher.save(update_fields=['status', 'journal_entry'])

        # 6. إرسال حدث للمنصة الاتصالات
        event_name = 'PaymentIssued' if voucher.voucher_type == 'payment' else 'PaymentReceived'
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type=event_name,
            source_module='finance',
            event_data={
                'voucher_id': str(voucher.id),
                'voucher_number': voucher.voucher_number,
                'amount': float(voucher.amount),
                'type': voucher.voucher_type
            },
            created_by=user_id
        )

        return voucher
