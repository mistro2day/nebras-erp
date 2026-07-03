from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.finance.interfaces.views import (
    FiscalYearViewSet, AccountingPeriodViewSet, AccountTypeViewSet,
    AccountCategoryViewSet, ChartOfAccountViewSet, CostCenterViewSet,
    CostCenterHierarchyViewSet, CurrencyViewSet, ExchangeRateViewSet,
    JournalEntryViewSet, JournalEntryLineViewSet, LedgerViewSet,
    LedgerEntryViewSet, BankViewSet, BankAccountViewSet, CashBoxViewSet,
    PaymentMethodViewSet, TaxViewSet, TaxGroupViewSet, BudgetViewSet,
    BudgetItemViewSet, FinancialDocumentViewSet, VoucherViewSet,
    FinancialTransactionViewSet, RecurringJournalViewSet, FinancialClosingViewSet,
    FinancialAuditViewSet, FinanceSettingsViewSet, FinanceStatisticsViewSet
)

router = DefaultRouter()
router.register('fiscal-years', FiscalYearViewSet, basename='fiscal-years')
router.register('periods', AccountingPeriodViewSet, basename='periods')
router.register('account-types', AccountTypeViewSet, basename='account-types')
router.register('categories', AccountCategoryViewSet, basename='categories')
router.register('coa', ChartOfAccountViewSet, basename='coa')
router.register('cost-centers', CostCenterViewSet, basename='cost-centers')
router.register('cost-center-hierarchies', CostCenterHierarchyViewSet, basename='cost-center-hierarchies')
router.register('currencies', CurrencyViewSet, basename='currencies')
router.register('exchange-rates', ExchangeRateViewSet, basename='exchange-rates')
router.register('journals', JournalEntryViewSet, basename='journals')
router.register('journal-lines', JournalEntryLineViewSet, basename='journal-lines')
router.register('ledgers', LedgerViewSet, basename='ledgers')
router.register('ledger-entries', LedgerEntryViewSet, basename='ledger-entries')
router.register('banks', BankViewSet, basename='banks')
router.register('bank-accounts', BankAccountViewSet, basename='bank-accounts')
router.register('cash-boxes', CashBoxViewSet, basename='cash-boxes')
router.register('payment-methods', PaymentMethodViewSet, basename='payment-methods')
router.register('taxes', TaxViewSet, basename='taxes')
router.register('tax-groups', TaxGroupViewSet, basename='tax-groups')
router.register('budgets', BudgetViewSet, basename='budgets')
router.register('budget-items', BudgetItemViewSet, basename='budget-items')
router.register('documents', FinancialDocumentViewSet, basename='documents')
router.register('vouchers', VoucherViewSet, basename='vouchers')
router.register('transactions', FinancialTransactionViewSet, basename='transactions')
router.register('recurring-journals', RecurringJournalViewSet, basename='recurring-journals')
router.register('closings', FinancialClosingViewSet, basename='closings')
router.register('audits', FinancialAuditViewSet, basename='audits')
router.register('settings', FinanceSettingsViewSet, basename='settings')
router.register('statistics', FinanceStatisticsViewSet, basename='statistics')

urlpatterns = [
    path('', include(router.urls)),
]
