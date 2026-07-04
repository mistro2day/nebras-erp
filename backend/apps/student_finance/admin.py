from django.contrib import admin
from apps.student_finance.domain.models import (
    FeeCategory,
    FeeType,
    FeeStructure,
    FeeSchedule,
    AcademicFeePlan,
    StudentBillingAccount,
    StudentInvoice,
    InvoiceItem,
    InvoiceAdjustment,
    InvoiceDiscount,
    Scholarship,
    ScholarshipRule,
    FinancialAid,
    InstallmentPlan,
    Installment,
    StudentReceivable,
    PaymentAllocation,
    Receipt,
    Refund,
    CreditNote,
    DebitNote,
    LateFeeRule,
    CollectionPolicy,
    FinancialHold,
    BillingCycle,
    Statement,
    BillingAudit,
    StudentFinanceSettings,
)

@admin.register(StudentBillingAccount)
class StudentBillingAccountAdmin(admin.ModelAdmin):
    list_display = ('account_number', 'student_id', 'outstanding_balance', 'credit_balance', 'is_blocked', 'financial_hold')
    list_filter = ('is_blocked', 'financial_hold')
    search_fields = ('account_number', 'student_id')

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 1

@admin.register(StudentInvoice)
class StudentInvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'student_billing_account', 'issue_date', 'due_date', 'status', 'total_amount')
    list_filter = ('status', 'issue_date')
    search_fields = ('invoice_number',)
    inlines = [InvoiceItemInline]

@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'student_billing_account', 'payment_date', 'amount', 'status')
    list_filter = ('status', 'payment_date')
    search_fields = ('receipt_number',)

@admin.register(FinancialHold)
class FinancialHoldAdmin(admin.ModelAdmin):
    list_display = ('student_billing_account', 'hold_type', 'status', 'applied_at')
    list_filter = ('status', 'hold_type')
    search_fields = ('student_billing_account__account_number',)

admin.site.register(FeeCategory)
admin.site.register(FeeType)
admin.site.register(FeeStructure)
admin.site.register(FeeSchedule)
admin.site.register(AcademicFeePlan)
admin.site.register(InvoiceItem)
admin.site.register(InvoiceAdjustment)
admin.site.register(InvoiceDiscount)
admin.site.register(Scholarship)
admin.site.register(ScholarshipRule)
admin.site.register(FinancialAid)
admin.site.register(InstallmentPlan)
admin.site.register(Installment)
admin.site.register(StudentReceivable)
admin.site.register(PaymentAllocation)
admin.site.register(Refund)
admin.site.register(CreditNote)
admin.site.register(DebitNote)
admin.site.register(LateFeeRule)
admin.site.register(CollectionPolicy)
admin.site.register(BillingCycle)
admin.site.register(Statement)
admin.site.register(BillingAudit)
admin.site.register(StudentFinanceSettings)
