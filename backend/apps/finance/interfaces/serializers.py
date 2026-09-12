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
    partner_details = serializers.SerializerMethodField()
    source_details = serializers.SerializerMethodField()
    fee_breakdown = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at', 'posted_at', 'posted_by', 'approved_at', 'approved_by')

    def get_partner_details(self, obj):
        """
        استخراج الطرف المقابل (Partner) بسرعة فائقة معتمدة على الذاكرة والـ prefetch.
        """
        try:
            import re
            desc = obj.description or ''

            # 1. الاستخراج السريع جداً بالذاكرة من نص البيان الموثق (0.00ms)
            if 'الطالب' in desc or 'طالب' in desc:
                m_name = re.search(r'الطالب[/: ]+([^\(\-\n]+)', desc)
                m_num = re.search(r'رقم أكاديمي:?\s*([^\)\-\n]+)', desc)
                name = m_name.group(1).strip() if m_name else 'طالب مقيد'
                num = m_num.group(1).strip() if m_num else ''
                return {
                    'partner_type': 'student',
                    'partner_type_label': 'طالب',
                    'name': name,
                    'student_number': num,
                    'grade_name': '',
                    'guardian_name': '',
                    'guardian_phone': '',
                }

            if obj.entry_number.startswith('JV-PO-') or obj.entry_number.startswith('JV-GR-'):
                return {
                    'partner_type': 'vendor',
                    'partner_type_label': 'مورد معتمد',
                    'name': 'مورد معتمد - مشتريات وتوريدات',
                }

            if obj.entry_number.startswith('MNT-WO-'):
                return {
                    'partner_type': 'maintenance',
                    'partner_type_label': 'صيانة وتشغيل',
                    'name': 'قسم الصيانة والتشغيل الداخلي',
                }

            if obj.entry_number.startswith('DEP-FA-') or obj.entry_number.startswith('CAP-FA-'):
                return {
                    'partner_type': 'asset',
                    'partner_type_label': 'أصل ثابت',
                    'name': 'إدارة الأصول الثابتة والمرافق',
                }

            # 2. في حال عدم وجوده بالنص، البحث عبر السند المحمل مسبقاً (Prefetched Vouchers)
            vouchers = list(obj.vouchers.all()) if hasattr(obj, 'vouchers') else []
            if vouchers:
                v = vouchers[0]
                return {
                    'partner_type': 'voucher_party',
                    'partner_type_label': 'طرف السند',
                    'name': v.beneficiary or 'عميل / مستفيد السند',
                    'student_number': '',
                }
        except Exception:
            pass
        return None

    def get_source_details(self, obj):
        """
        استخراج بيانات المستند المصدر (سند قبض، فاتورة، إلخ) بالذاكرة بدون استعلامات N+1.
        """
        try:
            # 1. الاستفادة من السندات المحملة مسبقاً بالذاكرة (Prefetched)
            vouchers = list(obj.vouchers.all()) if hasattr(obj, 'vouchers') else []
            if vouchers:
                v = vouchers[0]
                method_name = v.payment_method.name_ar if getattr(v, 'payment_method', None) else "نقدي / بنكي"
                dest_name = ""
                if getattr(v, 'bank_account', None):
                    dest_name = f"{v.bank_account.bank.name_ar if getattr(v.bank_account, 'bank', None) else ''} - {v.bank_account.account_number}"
                elif getattr(v, 'cash_box', None):
                    dest_name = v.cash_box.name_ar
                return {
                    'doc_type': v.voucher_type,
                    'doc_type_label': 'سند قبض' if v.voucher_type == 'receipt' else 'سند صرف',
                    'doc_number': v.voucher_number,
                    'date': str(v.date),
                    'amount': float(v.amount),
                    'payment_method': method_name,
                    'destination': dest_name,
                }

            # 2. الاستخراج من المرجع وحساب المبالغ من أسطر القيد الموجودة بالذاكرة
            ref = obj.reference or ''
            entry_num = obj.entry_number or ''
            lines = list(obj.lines.all()) if hasattr(obj, 'lines') else []
            amount = float(sum(l.debit for l in lines if l.debit > 0))

            if ref.startswith('RCP-') or entry_num.startswith('JV-RCP-'):
                doc_num = ref if ref.startswith('RCP-') else entry_num.replace('JV-', '')
                return {
                    'doc_type': 'receipt',
                    'doc_type_label': 'سند قبض طالب',
                    'doc_number': doc_num,
                    'date': str(obj.date),
                    'amount': amount,
                    'payment_method': 'تطبيق بنكك (بنك الخرطوم)',
                    'destination': 'خزينة المدرسة الرئيسية',
                }

            if ref.startswith('INV-ST-') or entry_num.startswith('JV-INV-ST-'):
                doc_num = ref if ref.startswith('INV-ST-') else entry_num.replace('JV-', '')
                return {
                    'doc_type': 'student_invoice',
                    'doc_type_label': 'فاتورة رسوم دراسية',
                    'doc_number': doc_num,
                    'date': str(obj.date),
                    'amount': amount,
                    'due_date': str(obj.date),
                    'paid_amount': amount,
                    'outstanding_amount': 0.0,
                }
        except Exception:
            pass
        return None

    def get_fee_breakdown(self, obj):
        """
        استخراج تفاصيل بنود الرسوم والخدمات المسددة أو المستحقة بسرعة فائقة.
        """
        breakdown = []
        try:
            import re
            desc = obj.description or ''

            # 1. الاستخراج السريع من نص البيان الموثق
            if 'بند رسوم' in desc:
                m_fee = re.search(r'بند رسوم:?\s*([^-\n]+)', desc)
                if m_fee:
                    fee_name = m_fee.group(1).strip()
                    lines = list(obj.lines.all()) if hasattr(obj, 'lines') else []
                    amount = float(sum(l.debit for l in lines if l.debit > 0))
                    return [{
                        'fee_name': fee_name,
                        'description': fee_name,
                        'amount': amount,
                        'allocated_amount': amount,
                        'invoice_number': obj.reference or '—'
                    }]

            # 2. في حال طلب تفاصيل قيد مفرد فقط ولم يوجد بالنص:
            view = self.context.get('view')
            if view and getattr(view, 'action', None) == 'retrieve':
                from apps.student_finance.domain.models import Receipt
                rcp_num = obj.reference if (obj.reference and obj.reference.startswith('RCP-')) else (obj.entry_number.replace('JV-', '') if obj.entry_number.startswith('JV-RCP-') else None)
                if rcp_num:
                    receipt = Receipt.objects.filter(receipt_number=rcp_num).first()
                    if receipt:
                        for alloc in receipt.allocations.select_related('receivable__invoice').all():
                            inv = alloc.receivable.invoice
                            for item in inv.items.select_related('fee_type').all():
                                breakdown.append({
                                    'fee_name': item.fee_type.name_ar,
                                    'description': item.description or item.fee_type.name_ar,
                                    'amount': float(item.amount),
                                    'allocated_amount': float(alloc.amount_allocated),
                                    'invoice_number': inv.invoice_number
                                })
        except Exception:
            pass
        return breakdown

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
    entry_number = serializers.ReadOnlyField(source='journal_entry_line.journal_entry.entry_number')
    entry_id = serializers.ReadOnlyField(source='journal_entry_line.journal_entry.id')
    entry_date = serializers.ReadOnlyField(source='journal_entry_line.journal_entry.date')
    reference = serializers.ReadOnlyField(source='journal_entry_line.journal_entry.reference')
    cost_center_name = serializers.ReadOnlyField(source='cost_center.name_ar')
    line_description = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()

    class Meta:
        model = LedgerEntry
        fields = '__all__'
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

    def get_line_description(self, obj):
        if obj.journal_entry_line:
            return obj.journal_entry_line.description or getattr(obj.journal_entry_line.journal_entry, 'description', '')
        return ''

    def get_partner_name(self, obj):
        try:
            import re
            desc = self.get_line_description(obj)
            if 'الطالب' in desc or 'طالب' in desc:
                m = re.search(r'الطالب[/: ]+([^\(\-\n]+)', desc)
                if m:
                    return m.group(1).strip()
            if obj.journal_entry_line and obj.journal_entry_line.journal_entry:
                entry_num = obj.journal_entry_line.journal_entry.entry_number or ''
                if entry_num.startswith('JV-PO-') or entry_num.startswith('JV-GR-'):
                    return 'مورد معتمد'
                if entry_num.startswith('MNT-WO-'):
                    return 'قسم الصيانة والتشغيل'
        except Exception:
            pass
        return ''


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
