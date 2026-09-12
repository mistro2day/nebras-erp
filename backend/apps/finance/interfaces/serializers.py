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
        استخراج الطرف المقابل (Partner) على غرار Odoo و Dynamics 365:
        طالب، ولي أمر، مورد، أو مركز صيانة/أصول.
        """
        try:
            from apps.student_finance.domain.models import Receipt, StudentInvoice
            from apps.students.domain.models import Student

            receipt = None
            voucher = obj.vouchers.first() if hasattr(obj, 'vouchers') else None
            if voucher:
                receipt = Receipt.objects.filter(voucher_id=voucher.id).first() or Receipt.objects.filter(receipt_number=voucher.voucher_number).first()
            
            if not receipt and (obj.entry_number.startswith('JV-RCP-') or (obj.reference and obj.reference.startswith('RCP-'))):
                rcp_num = obj.reference if (obj.reference and obj.reference.startswith('RCP-')) else obj.entry_number.replace('JV-', '')
                receipt = Receipt.objects.filter(receipt_number=rcp_num).first()
            
            if receipt and receipt.student_billing_account:
                st = Student.objects.filter(id=receipt.student_billing_account.student_id).first()
                if st:
                    grade_name = ""
                    if hasattr(st, 'academic_enrollments'):
                        enc = st.academic_enrollments.filter(status='active').first()
                        if enc and hasattr(enc, 'grade_level') and enc.grade_level:
                            grade_name = enc.grade_level.name_ar
                    guardian_name = ""
                    guardian_phone = ""
                    fam = st.family_relations.first()
                    if fam:
                        guardian_name = getattr(fam, 'full_name', '') or ""
                        guardian_phone = getattr(fam, 'phone', '') or ""
                    return {
                        'partner_type': 'student',
                        'partner_type_label': 'طالب',
                        'name': st.profile.arabic_name if hasattr(st, 'profile') and st.profile else str(st),
                        'student_number': getattr(st, 'student_number', ''),
                        'grade_name': grade_name,
                        'guardian_name': guardian_name,
                        'guardian_phone': guardian_phone,
                    }

            if obj.entry_number.startswith('JV-INV-ST-') or (obj.reference and obj.reference.startswith('INV-ST-')):
                inv_num = obj.reference if (obj.reference and obj.reference.startswith('INV-ST-')) else obj.entry_number.replace('JV-', '')
                invoice = StudentInvoice.objects.filter(invoice_number=inv_num).first() or StudentInvoice.objects.filter(journal_entry_id=obj.id).first()
                if invoice and invoice.student_billing_account:
                    st = Student.objects.filter(id=invoice.student_billing_account.student_id).first()
                    if st:
                        return {
                            'partner_type': 'student',
                            'partner_type_label': 'طالب',
                            'name': st.profile.arabic_name if hasattr(st, 'profile') and st.profile else str(st),
                            'student_number': getattr(st, 'student_number', ''),
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
        except Exception:
            pass
        return None

    def get_source_details(self, obj):
        """
        استخراج بيانات المستند المصدر (سند قبض، فاتورة، أمر صيانة، إلخ).
        """
        try:
            from apps.student_finance.domain.models import Receipt, StudentInvoice

            voucher = obj.vouchers.first() if hasattr(obj, 'vouchers') else None
            if voucher:
                method_name = voucher.payment_method.name_ar if voucher.payment_method else "نقدي / بنكي"
                dest_name = ""
                if voucher.bank_account:
                    dest_name = f"{voucher.bank_account.bank.name_ar} - {voucher.bank_account.account_number}"
                elif voucher.cash_box:
                    dest_name = voucher.cash_box.name_ar
                return {
                    'doc_type': voucher.voucher_type,
                    'doc_type_label': 'سند قبض' if voucher.voucher_type == 'receipt' else 'سند صرف',
                    'doc_number': voucher.voucher_number,
                    'date': str(voucher.date),
                    'amount': float(voucher.amount),
                    'payment_method': method_name,
                    'destination': dest_name,
                }

            if obj.entry_number.startswith('JV-RCP-') or (obj.reference and obj.reference.startswith('RCP-')):
                rcp_num = obj.reference if (obj.reference and obj.reference.startswith('RCP-')) else obj.entry_number.replace('JV-', '')
                receipt = Receipt.objects.filter(receipt_number=rcp_num).first()
                if receipt:
                    return {
                        'doc_type': 'receipt',
                        'doc_type_label': 'سند قبض طالب',
                        'doc_number': receipt.receipt_number,
                        'date': str(receipt.payment_date),
                        'amount': float(receipt.amount),
                        'payment_method': 'تطبيق بنكك (بنك الخرطوم)',
                        'destination': 'خزينة المدرسة الرئيسية',
                    }

            if obj.entry_number.startswith('JV-INV-ST-') or (obj.reference and obj.reference.startswith('INV-ST-')):
                inv_num = obj.reference if (obj.reference and obj.reference.startswith('INV-ST-')) else obj.entry_number.replace('JV-', '')
                invoice = StudentInvoice.objects.filter(invoice_number=inv_num).first() or StudentInvoice.objects.filter(journal_entry_id=obj.id).first()
                if invoice:
                    return {
                        'doc_type': 'student_invoice',
                        'doc_type_label': 'فاتورة رسوم دراسية',
                        'doc_number': invoice.invoice_number,
                        'date': str(invoice.issue_date),
                        'amount': float(invoice.total_amount),
                        'due_date': str(invoice.due_date),
                        'paid_amount': float(invoice.paid_amount),
                        'outstanding_amount': float(invoice.outstanding_amount),
                    }
        except Exception:
            pass
        return None

    def get_fee_breakdown(self, obj):
        """
        استخراج تفاصيل بنود الرسوم والخدمات المسددة أو المستحقة.
        """
        breakdown = []
        try:
            from apps.student_finance.domain.models import Receipt, StudentInvoice

            rcp_num = None
            voucher = obj.vouchers.first() if hasattr(obj, 'vouchers') else None
            if voucher and voucher.voucher_number.startswith('RCP-'):
                rcp_num = voucher.voucher_number
            elif obj.entry_number.startswith('JV-RCP-') or (obj.reference and obj.reference.startswith('RCP-')):
                rcp_num = obj.reference if (obj.reference and obj.reference.startswith('RCP-')) else obj.entry_number.replace('JV-', '')

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
                    if not breakdown and receipt.student_billing_account:
                        acc = receipt.student_billing_account
                        for inv in acc.invoices.all()[:2]:
                            for item in inv.items.select_related('fee_type').all():
                                breakdown.append({
                                    'fee_name': item.fee_type.name_ar,
                                    'description': item.description or item.fee_type.name_ar,
                                    'amount': float(item.amount),
                                    'allocated_amount': float(receipt.amount),
                                    'invoice_number': inv.invoice_number
                                })

            if not breakdown and (obj.entry_number.startswith('JV-INV-ST-') or (obj.reference and obj.reference.startswith('INV-ST-'))):
                inv_num = obj.reference if (obj.reference and obj.reference.startswith('INV-ST-')) else obj.entry_number.replace('JV-', '')
                invoice = StudentInvoice.objects.filter(invoice_number=inv_num).first() or StudentInvoice.objects.filter(journal_entry_id=obj.id).first()
                if invoice:
                    for item in invoice.items.select_related('fee_type').all():
                        breakdown.append({
                            'fee_name': item.fee_type.name_ar,
                            'description': item.description or item.fee_type.name_ar,
                            'amount': float(item.amount),
                            'allocated_amount': float(item.amount),
                            'invoice_number': invoice.invoice_number
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
