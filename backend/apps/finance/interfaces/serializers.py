from rest_framework import serializers
from apps.finance.domain.models import (
    FiscalYear, AccountingPeriod, AccountType, AccountCategory, ChartOfAccount,
    CostCenter, CostCenterHierarchy, Currency, ExchangeRate, JournalEntry,
    JournalEntryLine, Ledger, LedgerEntry, Bank, BankAccount, CashBox,
    PaymentMethod, Tax, TaxGroup, Budget, BudgetItem, FinancialDocument,
    Voucher, FinancialTransaction, RecurringJournal, FinancialClosing,
    FinancialAudit, FinanceSettings, FinanceStatistics
)


class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYear
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class AccountingPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountingPeriod
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class AccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class AccountCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountCategory
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class ChartOfAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChartOfAccount
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class CostCenterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCenter
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class CostCenterHierarchySerializer(serializers.ModelSerializer):
    class Meta:
        model = CostCenterHierarchy
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExchangeRate
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_code = serializers.ReadOnlyField(source='account.code')
    account_name = serializers.ReadOnlyField(source='account.name_ar')

    class Meta:
        model = JournalEntryLine
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'debit_base', 'credit_base')


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True, required=False)

    class Meta:
        model = JournalEntry
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'posted_at', 'posted_by', 'approved_at', 'approved_by')

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        # إنشاء القيد
        journal_entry = JournalEntry.objects.create(**validated_data)
        
        # إنشاء السطور الملحقة
        for line_data in lines_data:
            JournalEntryLine.objects.create(
                tenant_id=journal_entry.tenant_id,
                journal_entry=journal_entry,
                **line_data
            )
        return journal_entry

    def update(self, instance, validated_data):
        if instance.status == 'posted':
            raise serializers.ValidationError("لا يمكن تعديل قيد تم ترحيله بالفعل.")
            
        lines_data = validated_data.pop('lines', None)
        
        # تحديث الحقول الرئيسية للقيد
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # تحديث السطور إذا كانت مرسلة
        if lines_data is not None:
            # مسح السطور القديمة وإعادة الإضافة كعملية تحديث بسيطة وآمنة
            instance.lines.all().delete()
            for line_data in lines_data:
                JournalEntryLine.objects.create(
                    tenant_id=instance.tenant_id,
                    journal_entry=instance,
                    **line_data
                )
        return instance


class LedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ledger
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class LedgerEntrySerializer(serializers.ModelSerializer):
    account_code = serializers.ReadOnlyField(source='account.code')
    account_name = serializers.ReadOnlyField(source='account.name_ar')

    class Meta:
        model = LedgerEntry
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class BankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bank
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class BankAccountSerializer(serializers.ModelSerializer):
    bank_name = serializers.ReadOnlyField(source='bank.name_ar')

    class Meta:
        model = BankAccount
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class CashBoxSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashBox
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class TaxSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tax
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class TaxGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxGroup
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class BudgetItemSerializer(serializers.ModelSerializer):
    account_code = serializers.ReadOnlyField(source='account.code')
    account_name = serializers.ReadOnlyField(source='account.name_ar')

    class Meta:
        model = BudgetItem
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'consumed_amount')


class BudgetSerializer(serializers.ModelSerializer):
    items = BudgetItemSerializer(many=True, required=False)

    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        budget = Budget.objects.create(**validated_data)
        for item_data in items_data:
            BudgetItem.objects.create(
                tenant_id=budget.tenant_id,
                budget=budget,
                **item_data
            )
        return budget


class FinancialDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialDocument
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class VoucherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Voucher
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'journal_entry')


class FinancialTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialTransaction
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'journal_entry')


class RecurringJournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringJournal
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class FinancialClosingSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialClosing
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class FinancialAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialAudit
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class FinanceSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceSettings
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


class FinanceStatisticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinanceStatistics
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')


# Serializers لعمليات مخصصة (Custom operations)
class PostJournalSerializer(serializers.Serializer):
    pass


class ClosePeriodSerializer(serializers.Serializer):
    period_id = serializers.UUIDField()


class CloseYearSerializer(serializers.Serializer):
    fiscal_year_id = serializers.UUIDField()
    retained_earnings_account_id = serializers.UUIDField()
