from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. FiscalYear (السنة المالية)
class FiscalYear(CombinedSharedModel):
    STATUS_CHOICES = (
        ('open', 'مفتوحة'),
        ('closed', 'مغلقة'),
        ('locked', 'مقفلة'),
        ('reopened', 'معاد فتحها'),
    )
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', db_index=True)
    is_current = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_fiscal_years'
        unique_together = ('tenant_id', 'name')
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


# 2. AccountingPeriod (الفترة المحاسبية)
class AccountingPeriod(CombinedSharedModel):
    STATUS_CHOICES = (
        ('open', 'مفتوحة'),
        ('closed', 'مغلقة'),
        ('locked', 'مقفلة'),
    )
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='periods')
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open', db_index=True)

    class Meta:
        db_table = 'nebras_accounting_periods'
        unique_together = ('tenant_id', 'fiscal_year', 'name')
        ordering = ['start_date']

    def __str__(self):
        return f"{self.name} - {self.fiscal_year.name}"


# 3. AccountType (نوع الحساب)
class AccountType(CombinedSharedModel):
    BALANCE_CHOICES = (
        ('debit', 'مدين'),
        ('credit', 'دائن'),
    )
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)  # asset, liability, equity, revenue, expense
    normal_balance = models.CharField(max_length=10, choices=BALANCE_CHOICES)

    class Meta:
        db_table = 'nebras_account_types'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return f"{self.name_ar} ({self.code})"


# 4. AccountCategory (تصنيف الحساب)
class AccountCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)  # current_assets, fixed_assets, etc.
    account_type = models.ForeignKey(AccountType, on_delete=models.PROTECT, related_name='categories')

    class Meta:
        db_table = 'nebras_account_categories'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name_ar


# 5. ChartOfAccount (شجرة الحسابات)
class ChartOfAccount(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشط'),
        ('inactive', 'غير نشط'),
    )
    BALANCE_CHOICES = (
        ('debit', 'مدين'),
        ('credit', 'دائن'),
    )
    code = models.CharField(max_length=50, db_index=True)
    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255)
    
    account_type = models.ForeignKey(AccountType, on_delete=models.PROTECT, related_name='accounts')
    account_category = models.ForeignKey(AccountCategory, on_delete=models.PROTECT, related_name='accounts', null=True, blank=True)
    parent = models.ForeignKey('self', on_delete=models.PROTECT, related_name='children', null=True, blank=True)
    
    is_control_account = models.BooleanField(default=False)
    is_sub_account = models.BooleanField(default=False)
    normal_balance = models.CharField(max_length=10, choices=BALANCE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_chart_of_accounts'
        unique_together = ('tenant_id', 'code')
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name_ar}"


# 6. CostCenter (مركز التكلفة)
class CostCenter(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشط'),
        ('inactive', 'غير نشط'),
    )
    TYPE_CHOICES = (
        ('branch', 'فرع'),
        ('campus', 'حرم جامعي/مدرسي'),
        ('department', 'قسم'),
        ('project', 'مشروع'),
        ('activity', 'نشاط'),
        ('custom', 'مخصص'),
    )
    code = models.CharField(max_length=50, db_index=True)
    name_ar = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='custom')
    parent = models.ForeignKey('self', on_delete=models.PROTECT, related_name='children', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    budget_allocated = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_cost_centers'
        unique_together = ('tenant_id', 'code')
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name_ar}"


# 7. CostCenterHierarchy (هيكل مراكز التكلفة)
class CostCenterHierarchy(CombinedSharedModel):
    name = models.CharField(max_length=150)
    root_cost_center = models.ForeignKey(CostCenter, on_delete=models.CASCADE, related_name='hierarchies')
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_cost_center_hierarchies'

    def __str__(self):
        return self.name


# 8. Currency (العملات)
class Currency(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشط'),
        ('inactive', 'غير نشط'),
    )
    code = models.CharField(max_length=10)  # USD, SAR, EUR
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    symbol = models.CharField(max_length=10)
    is_base = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'nebras_currencies'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return f"{self.code} ({self.name_ar})"


# 9. ExchangeRate (أسعار الصرف)
class ExchangeRate(CombinedSharedModel):
    from_currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='from_rates')
    to_currency = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='to_rates')
    rate = models.DecimalField(max_digits=12, decimal_places=6)
    rate_date = models.DateField(db_index=True)
    is_manual_override = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_exchange_rates'
        unique_together = ('tenant_id', 'from_currency', 'to_currency', 'rate_date')
        ordering = ['-rate_date']

    def __str__(self):
        return f"1 {self.from_currency.code} = {self.rate} {self.to_currency.code} on {self.rate_date}"


# 10. JournalEntry (قيود اليومية)
class JournalEntry(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('approved', 'معتمد'),
        ('posted', 'رحّل'),
        ('cancelled', 'ملغي'),
        ('reversed', 'معكوس'),
    )
    SOURCE_CHOICES = (
        ('manual', 'يدوي'),
        ('automatic', 'تلقائي'),
        ('recurring', 'دوري/متكرر'),
        ('reversing', 'عكسي'),
        ('imported', 'مستورد'),
    )
    entry_number = models.CharField(max_length=50, db_index=True)
    date = models.DateField(db_index=True)
    accounting_period = models.ForeignKey(AccountingPeriod, on_delete=models.PROTECT, related_name='journal_entries')
    description = models.TextField()
    reference = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1.0)
    
    posted_at = models.DateTimeField(null=True, blank=True)
    posted_by = models.UUIDField(null=True, blank=True)
    approved_by = models.UUIDField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    
    reversed_entry = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='reversal_of')

    class Meta:
        db_table = 'nebras_journal_entries'
        unique_together = ('tenant_id', 'entry_number')
        ordering = ['-date', '-entry_number']

    def __str__(self):
        return f"{self.entry_number} ({self.get_status_display()})"


# 11. JournalEntryLine (سطور قيود اليومية)
class JournalEntryLine(CombinedSharedModel):
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='journal_lines')
    cost_center = models.ForeignKey(CostCenter, on_delete=models.PROTECT, related_name='journal_lines', null=True, blank=True)
    
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    debit_base = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    credit_base = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_journal_entry_lines'

    def __str__(self):
        return f"{self.journal_entry.entry_number} - {self.account.code} (D:{self.debit} C:{self.credit})"


# 12. Ledger (دفتر الأستاذ العام)
class Ledger(CombinedSharedModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_ledgers'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# 13. LedgerEntry (قيود دفتر الأستاذ)
class LedgerEntry(CombinedSharedModel):
    ledger = models.ForeignKey(Ledger, on_delete=models.PROTECT, related_name='entries')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='ledger_entries')
    cost_center = models.ForeignKey(CostCenter, on_delete=models.PROTECT, related_name='ledger_entries', null=True, blank=True)
    journal_entry_line = models.ForeignKey(JournalEntryLine, on_delete=models.PROTECT, related_name='ledger_entries')
    
    date = models.DateField(db_index=True)
    debit = models.DecimalField(max_digits=15, decimal_places=2)
    credit = models.DecimalField(max_digits=15, decimal_places=2)
    balance_snapshot = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'nebras_ledger_entries'
        ordering = ['date', 'created_at']

    def __str__(self):
        return f"{self.account.code} - D:{self.debit} C:{self.credit} (Bal:{self.balance_snapshot})"


# 14. Bank (البنوك)
class Bank(CombinedSharedModel):
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    swift_code = models.CharField(max_length=20)

    class Meta:
        db_table = 'nebras_banks'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name_ar


# 15. BankAccount (الحسابات البنكية)
class BankAccount(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشط'),
        ('inactive', 'غير نشط'),
    )
    bank = models.ForeignKey(Bank, on_delete=models.PROTECT, related_name='accounts')
    account_number = models.CharField(max_length=50)
    iban = models.CharField(max_length=50)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    gl_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='bank_accounts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'nebras_bank_accounts'
        unique_together = ('tenant_id', 'account_number')

    def __str__(self):
        return f"{self.bank.name_ar} - {self.account_number}"


# 16. CashBox (الصناديق/الخزائن)
class CashBox(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشطة'),
        ('inactive', 'غير نشطة'),
    )
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    gl_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='cash_boxes')
    custodian_id = models.UUIDField(help_text="معرف الموظف المسؤول عن الخزنة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'nebras_cash_boxes'
        unique_together = ('tenant_id', 'name_en')

    def __str__(self):
        return self.name_ar


# 17. PaymentMethod (طرق الدفع)
class PaymentMethod(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشط'),
        ('inactive', 'غير نشط'),
    )
    name_ar = models.CharField(max_length=100)
    name_en = models.CharField(max_length=100)
    code = models.CharField(max_length=50, db_index=True)  # cash, bank_transfer, check, card, etc.
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'nebras_payment_methods'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name_ar


# 18. Tax (الضرائب)
class Tax(CombinedSharedModel):
    TYPE_CHOICES = (
        ('vat', 'ضريبة القيمة المضافة VAT'),
        ('withholding', 'ضريبة الاستقطاع WHT'),
        ('custom', 'رسوم جمركية / أخرى'),
    )
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    rate_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='vat')
    gl_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='taxes')

    class Meta:
        db_table = 'nebras_taxes'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return f"{self.name_ar} ({self.rate_percentage}%)"


# 19. TaxGroup (مجموعات الضرائب)
class TaxGroup(CombinedSharedModel):
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    taxes = models.ManyToManyField(Tax, related_name='tax_groups')

    class Meta:
        db_table = 'nebras_tax_groups'

    def __str__(self):
        return self.name_ar


# 20. Budget (الموازنات التقديرية)
class Budget(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('approved', 'معتمدة'),
        ('revised', 'معدلة'),
    )
    name = models.CharField(max_length=150)
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT, related_name='budgets')
    cost_center = models.ForeignKey(CostCenter, on_delete=models.PROTECT, related_name='budgets', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    approved_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_budgets'
        unique_together = ('tenant_id', 'fiscal_year', 'cost_center')

    def __str__(self):
        return f"{self.name} - {self.fiscal_year.name}"


# 21. BudgetItem (بنود الموازنة)
class BudgetItem(CombinedSharedModel):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name='items')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='budget_items')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    consumed_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'nebras_budget_items'
        unique_together = ('tenant_id', 'budget', 'account')

    def __str__(self):
        return f"{self.account.code} - Allocated: {self.amount} (Consumed: {self.consumed_amount})"


# 22. FinancialDocument (المستند المالي المرجعي)
class FinancialDocument(CombinedSharedModel):
    TYPE_CHOICES = (
        ('invoice', 'فاتورة'),
        ('receipt', 'إيصال استلام'),
        ('payment_voucher', 'سند صرف'),
        ('journal_voucher', 'قيد يومية تسوية'),
    )
    document_number = models.CharField(max_length=100)
    document_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    date = models.DateField(db_index=True)
    meta_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_financial_documents'

    def __str__(self):
        return f"{self.document_type} - {self.document_number}"


# 23. Voucher (السندات المالية)
class Voucher(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('approved', 'معتمد'),
        ('posted', 'مرحل'),
        ('cancelled', 'ملغي'),
    )
    TYPE_CHOICES = (
        ('payment', 'سند صرف'),
        ('receipt', 'سند قبض'),
        ('journal', 'سند قيد تسوية'),
    )
    voucher_number = models.CharField(max_length=50, db_index=True)
    voucher_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='payment')
    date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, null=True, blank=True)
    cash_box = models.ForeignKey(CashBox, on_delete=models.PROTECT, null=True, blank=True)
    gl_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='vouchers')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    description = models.TextField()
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='vouchers')

    class Meta:
        db_table = 'nebras_vouchers'
        unique_together = ('tenant_id', 'voucher_number')

    def __str__(self):
        return f"{self.voucher_type} - {self.voucher_number}"


# 24. FinancialTransaction (الحركات والتحويلات المالية بين الخزائن والبنوك)
class FinancialTransaction(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('completed', 'مكتملة'),
        ('cancelled', 'ملغاة'),
    )
    TYPE_CHOICES = (
        ('deposit', 'إيداع'),
        ('withdrawal', 'سحب'),
        ('transfer', 'تحويل مالي'),
    )
    transaction_number = models.CharField(max_length=100)
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='transfer')
    date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    
    source_bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='outgoing_transfers', null=True, blank=True)
    destination_bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='incoming_transfers', null=True, blank=True)
    source_cash_box = models.ForeignKey(CashBox, on_delete=models.PROTECT, related_name='outgoing_transfers', null=True, blank=True)
    destination_cash_box = models.ForeignKey(CashBox, on_delete=models.PROTECT, related_name='incoming_transfers', null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name='transactions')

    class Meta:
        db_table = 'nebras_financial_transactions'

    def __str__(self):
        return f"{self.transaction_type} - {self.transaction_number}"


# 25. RecurringJournal (القيود الدورية المتكررة)
class RecurringJournal(CombinedSharedModel):
    SCHEDULE_CHOICES = (
        ('monthly', 'شهري'),
        ('quarterly', 'ربع سنوي'),
        ('yearly', 'سنوي'),
    )
    name = models.CharField(max_length=150)
    schedule_type = models.CharField(max_length=20, choices=SCHEDULE_CHOICES, default='monthly')
    next_run_date = models.DateField(db_index=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    template_data = models.JSONField(help_text="البيانات الهيكلية لسطور قيد اليومية")

    class Meta:
        db_table = 'nebras_recurring_journals'
        unique_together = ('tenant_id', 'name')

    def __str__(self):
        return self.name


# 26. FinancialClosing (الإغلاق المالي)
class FinancialClosing(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'معلق الموافقة'),
        ('approved', 'موافق عليه'),
        ('rejected', 'مرفوض'),
        ('completed', 'مكتمل ومنتهي'),
    )
    TYPE_CHOICES = (
        ('period', 'إغلاق فترة محاسبية'),
        ('year', 'إغلاق سنة مالية كاملة'),
    )
    closing_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='period')
    closed_period = models.ForeignKey(AccountingPeriod, on_delete=models.PROTECT, null=True, blank=True)
    closed_year = models.ForeignKey(FiscalYear, on_delete=models.PROTECT, null=True, blank=True)
    closed_at = models.DateTimeField(default=timezone.now)
    closed_by = models.UUIDField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    retained_earnings_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, null=True, blank=True)

    class Meta:
        db_table = 'nebras_financial_closings'

    def __str__(self):
        return f"{self.closing_type} - {self.get_status_display()}"


# 27. FinancialAudit (سجل تدقيق العمليات المالية)
class FinancialAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100)  # e.g., create_journal, post_journal, lock_period, etc.
    performed_by = models.UUIDField(null=True, blank=True)
    performed_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField()
    ip_address = models.CharField(max_length=45, blank=True, null=True)

    class Meta:
        db_table = 'nebras_financial_audits'

    def __str__(self):
        return f"{self.action_type} by {self.performed_by} at {self.performed_at}"


# 28. FinanceSettings (إعدادات النظام المالي)
class FinanceSettings(CombinedSharedModel):
    base_currency = models.ForeignKey(Currency, on_delete=models.PROTECT, related_name='+')
    allow_manual_posting = models.BooleanField(default=True)
    require_journal_approval = models.BooleanField(default=True)
    auto_reverse_accruals = models.BooleanField(default=False)
    default_retained_earnings_account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, null=True, blank=True, related_name='+')

    class Meta:
        db_table = 'nebras_finance_settings'

    def __str__(self):
        return f"Settings for Tenant: {self.tenant_id}"


# 29. FinanceStatistics (الإحصائيات والملخصات المالية)
class FinanceStatistics(CombinedSharedModel):
    as_of_date = models.DateField(db_index=True)
    total_assets = models.DecimalField(max_digits=15, decimal_places=2)
    total_liabilities = models.DecimalField(max_digits=15, decimal_places=2)
    total_equity = models.DecimalField(max_digits=15, decimal_places=2)
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2)
    total_expenses = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_finance_statistics'

    def __str__(self):
        return f"Stats on {self.as_of_date}"