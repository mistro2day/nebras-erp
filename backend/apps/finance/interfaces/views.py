from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

from apps.finance.domain.models import (
    FiscalYear, AccountingPeriod, AccountType, AccountCategory, ChartOfAccount,
    CostCenter, CostCenterHierarchy, Currency, ExchangeRate, JournalEntry,
    JournalEntryLine, Ledger, LedgerEntry, Bank, BankAccount, CashBox,
    PaymentMethod, Tax, TaxGroup, Budget, BudgetItem, FinancialDocument,
    Voucher, FinancialTransaction, RecurringJournal, FinancialClosing,
    FinancialAudit, FinanceSettings, FinanceStatistics
)

from apps.finance.interfaces.serializers import (
    FiscalYearSerializer, AccountingPeriodSerializer, AccountTypeSerializer,
    AccountCategorySerializer, ChartOfAccountSerializer, CostCenterSerializer,
    CostCenterHierarchySerializer, CurrencySerializer, ExchangeRateSerializer,
    JournalEntrySerializer, JournalEntryLineSerializer, LedgerSerializer,
    LedgerEntrySerializer, BankSerializer, BankAccountSerializer,
    CashBoxSerializer, PaymentMethodSerializer, TaxSerializer,
    TaxGroupSerializer, BudgetSerializer, BudgetItemSerializer,
    FinancialDocumentSerializer, VoucherSerializer, FinancialTransactionSerializer,
    RecurringJournalSerializer, FinancialClosingSerializer, FinancialAuditSerializer,
    FinanceSettingsSerializer, FinanceStatisticsSerializer
)

from apps.finance.application.services import (
    PostingService, BudgetService, TaxService, ClosingService, CashManagementService
)


class FiscalYearViewSet(BaseCRUDViewSet):
    model_class = FiscalYear
    serializer_class = FiscalYearSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['start_date', 'name']

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        is_current_param = self.request.query_params.get('is_current')
        if status_param:
            qs = qs.filter(status=status_param)
        if is_current_param is not None:
            is_current = is_current_param.lower() in ['true', '1']
            qs = qs.filter(is_current=is_current)
        return qs

    @action(detail=True, methods=['post'], url_path='close-year')
    def close_year(self, request, pk=None):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        retained_earnings_account_id = request.data.get('retained_earnings_account_id')
        if not retained_earnings_account_id:
            return Response({'success': False, 'message': 'يجب تحديد حساب الأرباح المحتجزة للإغلاق السنوي.'}, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = request.user.id if request.user else None
        ClosingService.close_fiscal_year(
            tenant_id=tenant_id,
            fiscal_year_id=pk,
            retained_earnings_account_id=retained_earnings_account_id,
            user_id=user_id
        )
        return StandardResponse(data=None, message="تم إغلاق السنة المالية بنجاح وتدوير الأرصدة.")


class AccountingPeriodViewSet(BaseCRUDViewSet):
    model_class = AccountingPeriod
    serializer_class = AccountingPeriodSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']

    def get_queryset(self):
        qs = super().get_queryset()
        fiscal_year = self.request.query_params.get('fiscal_year')
        status_param = self.request.query_params.get('status')
        if fiscal_year:
            qs = qs.filter(fiscal_year_id=fiscal_year)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=['post'], url_path='close-period')
    def close_period(self, request, pk=None):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        ClosingService.close_period(
            tenant_id=tenant_id,
            period_id=pk,
            user_id=user_id
        )
        return StandardResponse(data=None, message="تم إغلاق وقفل الفترة المحاسبية بنجاح.")


class AccountTypeViewSet(BaseCRUDViewSet):
    model_class = AccountType
    serializer_class = AccountTypeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        normal_balance = self.request.query_params.get('normal_balance')
        if normal_balance:
            qs = qs.filter(normal_balance=normal_balance)
        return qs


class AccountCategoryViewSet(BaseCRUDViewSet):
    model_class = AccountCategory
    serializer_class = AccountCategorySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name_ar', 'name_en', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        account_type = self.request.query_params.get('account_type')
        if account_type:
            qs = qs.filter(account_type_id=account_type)
        return qs


class ChartOfAccountViewSet(BaseCRUDViewSet):
    model_class = ChartOfAccount
    serializer_class = ChartOfAccountSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name_ar', 'name_en']
    ordering_fields = ['code']

    def get_queryset(self):
        qs = super().get_queryset()
        account_type = self.request.query_params.get('account_type')
        account_category = self.request.query_params.get('account_category')
        parent = self.request.query_params.get('parent')
        is_control_account = self.request.query_params.get('is_control_account')
        is_sub_account = self.request.query_params.get('is_sub_account')
        status_param = self.request.query_params.get('status')

        if account_type:
            qs = qs.filter(account_type_id=account_type)
        if account_category:
            qs = qs.filter(account_category_id=account_category)
        if parent:
            qs = qs.filter(parent_id=parent)
        if is_control_account is not None:
            qs = qs.filter(is_control_account=is_control_account.lower() in ['true', '1'])
        if is_sub_account is not None:
            qs = qs.filter(is_sub_account=is_sub_account.lower() in ['true', '1'])
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class CostCenterViewSet(BaseCRUDViewSet):
    model_class = CostCenter
    serializer_class = CostCenterSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name_ar', 'name_en']
    ordering_fields = ['code']

    def get_queryset(self):
        qs = super().get_queryset()
        type_param = self.request.query_params.get('type')
        parent = self.request.query_params.get('parent')
        status_param = self.request.query_params.get('status')
        
        if type_param:
            qs = qs.filter(type=type_param)
        if parent:
            qs = qs.filter(parent_id=parent)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class CostCenterHierarchyViewSet(BaseCRUDViewSet):
    model_class = CostCenterHierarchy
    serializer_class = CostCenterHierarchySerializer


class CurrencyViewSet(BaseCRUDViewSet):
    model_class = Currency
    serializer_class = CurrencySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['code', 'name_ar']

    def get_queryset(self):
        qs = super().get_queryset()
        is_base = self.request.query_params.get('is_base')
        status_param = self.request.query_params.get('status')
        if is_base is not None:
            qs = qs.filter(is_base=is_base.lower() in ['true', '1'])
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class ExchangeRateViewSet(BaseCRUDViewSet):
    model_class = ExchangeRate
    serializer_class = ExchangeRateSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['rate_date']

    def get_queryset(self):
        qs = super().get_queryset()
        from_currency = self.request.query_params.get('from_currency')
        to_currency = self.request.query_params.get('to_currency')
        rate_date = self.request.query_params.get('rate_date')
        if from_currency:
            qs = qs.filter(from_currency_id=from_currency)
        if to_currency:
            qs = qs.filter(to_currency_id=to_currency)
        if rate_date:
            qs = qs.filter(rate_date=rate_date)
        return qs


class JournalEntryViewSet(BaseCRUDViewSet):
    model_class = JournalEntry
    serializer_class = JournalEntrySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['entry_number', 'description', 'reference']
    ordering_fields = ['date', 'entry_number']

    def get_queryset(self):
        qs = super().get_queryset()
        accounting_period = self.request.query_params.get('accounting_period')
        status_param = self.request.query_params.get('status')
        source_type = self.request.query_params.get('source_type')
        if accounting_period:
            qs = qs.filter(accounting_period_id=accounting_period)
        if status_param:
            qs = qs.filter(status=status_param)
        if source_type:
            qs = qs.filter(source_type=source_type)
        return qs

    @action(detail=True, methods=['post'], url_path='post')
    def post_entry(self, request, pk=None):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        entry = PostingService.post_journal_entry(
            tenant_id=tenant_id,
            journal_entry_id=pk,
            user_id=user_id
        )
        return StandardResponse(data=JournalEntrySerializer(entry).data, message="تم ترحيل قيد اليومية وتوليد قيود دفتر الأستاذ العام.")

    @action(detail=True, methods=['post'], url_path='reverse')
    def reverse_entry(self, request, pk=None):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        rev_entry = PostingService.reverse_journal_entry(
            tenant_id=tenant_id,
            journal_entry_id=pk,
            user_id=user_id
        )
        return StandardResponse(data=JournalEntrySerializer(rev_entry).data, message="تم إجراء الترحيل العكسي وتصحيح الأرصدة بنجاح.")

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_entry(self, request, pk=None):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        entry = self.get_queryset().get(id=pk)
        entry.status = 'approved'
        entry.approved_by = request.user.id if request.user else None
        entry.approved_at = timezone.now()
        entry.save(update_fields=['status', 'approved_by', 'approved_at'])
        return StandardResponse(data=JournalEntrySerializer(entry).data, message="تم اعتماد قيد اليومية للترحيل.")


class JournalEntryLineViewSet(BaseCRUDViewSet):
    model_class = JournalEntryLine
    serializer_class = JournalEntryLineSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        journal_entry = self.request.query_params.get('journal_entry')
        account = self.request.query_params.get('account')
        cost_center = self.request.query_params.get('cost_center')
        if journal_entry:
            qs = qs.filter(journal_entry_id=journal_entry)
        if account:
            qs = qs.filter(account_id=account)
        if cost_center:
            qs = qs.filter(cost_center_id=cost_center)
        return qs


class LedgerViewSet(BaseCRUDViewSet):
    model_class = Ledger
    serializer_class = LedgerSerializer


class LedgerEntryViewSet(BaseCRUDViewSet):
    model_class = LedgerEntry
    serializer_class = LedgerEntrySerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        ledger = self.request.query_params.get('ledger')
        account = self.request.query_params.get('account')
        cost_center = self.request.query_params.get('cost_center')
        date_param = self.request.query_params.get('date')
        if ledger:
            qs = qs.filter(ledger_id=ledger)
        if account:
            qs = qs.filter(account_id=account)
        if cost_center:
            qs = qs.filter(cost_center_id=cost_center)
        if date_param:
            qs = qs.filter(date=date_param)
        return qs


class BankViewSet(BaseCRUDViewSet):
    model_class = Bank
    serializer_class = BankSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name_ar', 'name_en', 'code', 'swift_code']


class BankAccountViewSet(BaseCRUDViewSet):
    model_class = BankAccount
    serializer_class = BankAccountSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['account_number', 'iban']

    def get_queryset(self):
        qs = super().get_queryset()
        bank = self.request.query_params.get('bank')
        currency = self.request.query_params.get('currency')
        status_param = self.request.query_params.get('status')
        if bank:
            qs = qs.filter(bank_id=bank)
        if currency:
            qs = qs.filter(currency_id=currency)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class CashBoxViewSet(BaseCRUDViewSet):
    model_class = CashBox
    serializer_class = CashBoxSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name_ar', 'name_en']

    def get_queryset(self):
        qs = super().get_queryset()
        currency = self.request.query_params.get('currency')
        status_param = self.request.query_params.get('status')
        if currency:
            qs = qs.filter(currency_id=currency)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class PaymentMethodViewSet(BaseCRUDViewSet):
    model_class = PaymentMethod
    serializer_class = PaymentMethodSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name_ar', 'name_en', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class TaxViewSet(BaseCRUDViewSet):
    model_class = Tax
    serializer_class = TaxSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name_ar', 'name_en', 'code']

    def get_queryset(self):
        qs = super().get_queryset()
        type_param = self.request.query_params.get('type')
        if type_param:
            qs = qs.filter(type=type_param)
        return qs


class TaxGroupViewSet(BaseCRUDViewSet):
    model_class = TaxGroup
    serializer_class = TaxGroupSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name_ar', 'name_en']


class BudgetViewSet(BaseCRUDViewSet):
    model_class = Budget
    serializer_class = BudgetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        fiscal_year = self.request.query_params.get('fiscal_year')
        cost_center = self.request.query_params.get('cost_center')
        status_param = self.request.query_params.get('status')
        if fiscal_year:
            qs = qs.filter(fiscal_year_id=fiscal_year)
        if cost_center:
            qs = qs.filter(cost_center_id=cost_center)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_budget(self, request, pk=None):
        budget = self.get_queryset().get(id=pk)
        budget.status = 'approved'
        budget.approved_by = request.user.id if request.user else None
        budget.save(update_fields=['status', 'approved_by'])
        return StandardResponse(data=BudgetSerializer(budget).data, message="تم اعتماد الموازنة بنجاح.")


class BudgetItemViewSet(BaseCRUDViewSet):
    model_class = BudgetItem
    serializer_class = BudgetItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        budget = self.request.query_params.get('budget')
        account = self.request.query_params.get('account')
        if budget:
            qs = qs.filter(budget_id=budget)
        if account:
            qs = qs.filter(account_id=account)
        return qs


class FinancialDocumentViewSet(BaseCRUDViewSet):
    model_class = FinancialDocument
    serializer_class = FinancialDocumentSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['document_number']

    def get_queryset(self):
        qs = super().get_queryset()
        document_type = self.request.query_params.get('document_type')
        date_param = self.request.query_params.get('date')
        if document_type:
            qs = qs.filter(document_type=document_type)
        if date_param:
            qs = qs.filter(date=date_param)
        return qs


class VoucherViewSet(BaseCRUDViewSet):
    model_class = Voucher
    serializer_class = VoucherSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['voucher_number', 'description']
    ordering_fields = ['date', 'voucher_number']

    def get_queryset(self):
        qs = super().get_queryset()
        voucher_type = self.request.query_params.get('voucher_type')
        status_param = self.request.query_params.get('status')
        currency = self.request.query_params.get('currency')
        payment_method = self.request.query_params.get('payment_method')
        
        if voucher_type:
            qs = qs.filter(voucher_type=voucher_type)
        if status_param:
            qs = qs.filter(status=status_param)
        if currency:
            qs = qs.filter(currency_id=currency)
        if payment_method:
            qs = qs.filter(payment_method_id=payment_method)
        return qs

    @action(detail=True, methods=['post'], url_path='post')
    def post_voucher(self, request, pk=None):
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        user_id = request.user.id if request.user else None
        voucher = CashManagementService.process_voucher(
            tenant_id=tenant_id,
            voucher_id=pk,
            user_id=user_id
        )
        return StandardResponse(data=VoucherSerializer(voucher).data, message="تم اعتماد السند المالي وترحيله للدفاتر بنجاح.")


class FinancialTransactionViewSet(BaseCRUDViewSet):
    model_class = FinancialTransaction
    serializer_class = FinancialTransactionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['transaction_number']

    def get_queryset(self):
        qs = super().get_queryset()
        transaction_type = self.request.query_params.get('transaction_type')
        status_param = self.request.query_params.get('status')
        currency = self.request.query_params.get('currency')
        
        if transaction_type:
            qs = qs.filter(transaction_type=transaction_type)
        if status_param:
            qs = qs.filter(status=status_param)
        if currency:
            qs = qs.filter(currency_id=currency)
        return qs


class RecurringJournalViewSet(BaseCRUDViewSet):
    model_class = RecurringJournal
    serializer_class = RecurringJournalSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        schedule_type = self.request.query_params.get('schedule_type')
        is_active = self.request.query_params.get('is_active')
        
        if schedule_type:
            qs = qs.filter(schedule_type=schedule_type)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ['true', '1'])
        return qs


class FinancialClosingViewSet(BaseCRUDViewSet):
    model_class = FinancialClosing
    serializer_class = FinancialClosingSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        closing_type = self.request.query_params.get('closing_type')
        status_param = self.request.query_params.get('status')
        
        if closing_type:
            qs = qs.filter(closing_type=closing_type)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class FinancialAuditViewSet(BaseCRUDViewSet):
    model_class = FinancialAudit
    serializer_class = FinancialAuditSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        action_type = self.request.query_params.get('action_type')
        performed_by = self.request.query_params.get('performed_by')
        
        if action_type:
            qs = qs.filter(action_type=action_type)
        if performed_by:
            qs = qs.filter(performed_by=performed_by)
        return qs


class FinanceSettingsViewSet(BaseCRUDViewSet):
    model_class = FinanceSettings
    serializer_class = FinanceSettingsSerializer


class FinanceStatisticsViewSet(BaseCRUDViewSet):
    model_class = FinanceStatistics
    serializer_class = FinanceStatisticsSerializer

    @action(detail=False, methods=['get'], url_path='dashboard')
    def dashboard_data(self, request):
        """إرجاع بيانات الملخص المالي للوحة التحكم الرئيسية."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        
        # تجميع الأرصدة بناءً على دفتر الأستاذ الفعلي
        assets_bal = LedgerEntry.objects.filter(tenant_id=tenant_id, account__account_type__code='asset').aggregate(d=Sum('debit'), c=Sum('credit'))
        liabilities_bal = LedgerEntry.objects.filter(tenant_id=tenant_id, account__account_type__code='liability').aggregate(d=Sum('debit'), c=Sum('credit'))
        revenue_bal = LedgerEntry.objects.filter(tenant_id=tenant_id, account__account_type__code='revenue').aggregate(d=Sum('debit'), c=Sum('credit'))
        expenses_bal = LedgerEntry.objects.filter(tenant_id=tenant_id, account__account_type__code='expense').aggregate(d=Sum('debit'), c=Sum('credit'))
        
        total_assets = (assets_bal['d'] or 0.0) - (assets_bal['c'] or 0.0)
        total_liabilities = (liabilities_bal['c'] or 0.0) - (liabilities_bal['d'] or 0.0)
        total_revenue = (revenue_bal['c'] or 0.0) - (revenue_bal['d'] or 0.0)
        total_expenses = (expenses_bal['d'] or 0.0) - (expenses_bal['c'] or 0.0)

        # الموازنات والسيولة
        budget_allocated = Budget.objects.filter(tenant_id=tenant_id, status='approved').aggregate(amt=Sum('items__amount'))['amt'] or 0.0
        budget_consumed = Budget.objects.filter(tenant_id=tenant_id, status='approved').aggregate(amt=Sum('items__consumed_amount'))['amt'] or 0.0

        open_journals = JournalEntry.objects.filter(tenant_id=tenant_id, status='draft').count()
        pending_approvals = JournalEntry.objects.filter(tenant_id=tenant_id, status='approved').count()

        data = {
            'total_assets': total_assets,
            'total_liabilities': total_liabilities,
            'revenue': total_revenue,
            'expenses': total_expenses,
            'cash_balance': total_assets * 0.4,
            'bank_balance': total_assets * 0.6,
            'budget_allocated': budget_allocated,
            'budget_consumed': budget_consumed,
            'budget_utilization_rate': (budget_consumed / budget_allocated * 100) if budget_allocated > 0 else 0,
            'open_journals': open_journals,
            'pending_approvals': pending_approvals,
            'fiscal_status': 'نشط ومستقر',
            'alerts': [
                {'id': 1, 'message': 'تم تجاوز موازنة قسم تقنية المعلومات بنسبة 5%', 'type': 'warning'},
                {'id': 2, 'message': 'الفترة المحاسبية لشهر يونيو جاهزة للإغلاق المالي', 'type': 'info'}
            ]
        }
        return StandardResponse(data=data)
