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

# للمحافظة على التوافقية إن وجدت
Account = ChartOfAccount
Transaction = JournalEntry
TransactionLine = JournalEntryLine