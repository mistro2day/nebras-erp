from django.contrib import admin
from apps.finance.domain.models import (
    FiscalYear,
    AccountingPeriod,
    AccountType,
    AccountCategory,
    ChartOfAccount,
    CostCenter,
    CostCenterHierarchy,
    Currency,
    ExchangeRate,
    JournalEntry,
    JournalEntryLine,
    Ledger,
    LedgerEntry,
    Bank,
    BankAccount,
    CashBox,
    PaymentMethod,
    Tax,
    TaxGroup,
    Budget,
    BudgetItem,
    FinancialDocument,
    Voucher,
    FinancialTransaction,
    RecurringJournal,
    FinancialClosing,
    FinancialAudit,
    FinanceSettings,
    FinanceStatistics,
)

# 1. FiscalYear
@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display = ('name', 'start_date', 'end_date', 'status', 'is_current', 'tenant_id')
    list_filter = ('status', 'is_current')
    search_fields = ('name',)

# 2. AccountingPeriod
@admin.register(AccountingPeriod)
class AccountingPeriodAdmin(admin.ModelAdmin):
    list_display = ('name', 'fiscal_year', 'start_date', 'end_date', 'status', 'tenant_id')
    list_filter = ('status', 'fiscal_year')
    search_fields = ('name',)

# 3. ChartOfAccount
@admin.register(ChartOfAccount)
class ChartOfAccountAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'name_en', 'account_type', 'normal_balance', 'is_control_account', 'status')
    list_filter = ('account_type', 'normal_balance', 'is_control_account', 'status')
    search_fields = ('code', 'name_ar', 'name_en')
    ordering = ('code',)

# 4. CostCenter
@admin.register(CostCenter)
class CostCenterAdmin(admin.ModelAdmin):
    list_display = ('code', 'name_ar', 'type', 'status', 'budget_allocated')
    list_filter = ('type', 'status')
    search_fields = ('code', 'name_ar')

# 5. JournalEntry
class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 2

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('entry_number', 'date', 'accounting_period', 'status', 'source_type', 'currency', 'exchange_rate')
    list_filter = ('status', 'source_type', 'currency')
    search_fields = ('entry_number', 'description', 'reference')
    inlines = [JournalEntryLineInline]

# 6. LedgerEntry
@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('account', 'date', 'debit', 'credit', 'balance_snapshot', 'cost_center')
    list_filter = ('date', 'account')
    search_fields = ('account__code', 'account__name_ar')

# 7. Budget
class BudgetItemInline(admin.TabularInline):
    model = BudgetItem
    extra = 1

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ('name', 'fiscal_year', 'cost_center', 'status')
    list_filter = ('status', 'fiscal_year')
    search_fields = ('name',)
    inlines = [BudgetItemInline]

# 8. Voucher
@admin.register(Voucher)
class VoucherAdmin(admin.ModelAdmin):
    list_display = ('voucher_number', 'voucher_type', 'date', 'amount', 'currency', 'status')
    list_filter = ('voucher_type', 'status', 'currency')
    search_fields = ('voucher_number', 'description')

# 9. CashBox
@admin.register(CashBox)
class CashBoxAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'currency', 'status')
    list_filter = ('status', 'currency')
    search_fields = ('name_ar', 'name_en')

# 10. BankAccount
@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('bank', 'account_number', 'iban', 'currency', 'status')
    list_filter = ('status', 'currency')
    search_fields = ('account_number', 'iban')

# تسجيل بقية النماذج بشكل افتراضي لتسهيل الإدارة
admin.site.register(AccountType)
admin.site.register(AccountCategory)
admin.site.register(CostCenterHierarchy)
admin.site.register(Currency)
admin.site.register(ExchangeRate)
admin.site.register(Bank)
admin.site.register(PaymentMethod)
admin.site.register(Tax)
admin.site.register(TaxGroup)
admin.site.register(FinancialDocument)
admin.site.register(FinancialTransaction)
admin.site.register(RecurringJournal)
admin.site.register(FinancialClosing)
admin.site.register(FinancialAudit)
admin.site.register(FinanceSettings)
admin.site.register(FinanceStatistics)
