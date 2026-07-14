from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.student_finance.interfaces.views import (
    FeeCategoryViewSet, FeeTypeViewSet, FeeStructureViewSet,
    FeeScheduleViewSet, AcademicFeePlanViewSet, StudentBillingAccountViewSet,
    StudentInvoiceViewSet, InvoiceItemViewSet, InvoiceAdjustmentViewSet,
    InvoiceDiscountViewSet, ScholarshipViewSet, ScholarshipRuleViewSet,
    FinancialAidViewSet, InstallmentPlanViewSet, InstallmentViewSet,
    StudentReceivableViewSet, PaymentAllocationViewSet, ReceiptViewSet,
    RefundViewSet, CreditNoteViewSet, DebitNoteViewSet,
    LateFeeRuleViewSet, CollectionPolicyViewSet, FinancialHoldViewSet,
    BillingCycleViewSet, StatementViewSet, BillingAuditViewSet,
    StudentFinanceSettingsViewSet, OnlinePaymentRequestViewSet
)

router = DefaultRouter()
router.register('fee-categories', FeeCategoryViewSet, basename='fee-category')
router.register('fee-types', FeeTypeViewSet, basename='fee-type')
router.register('fee-structures', FeeStructureViewSet, basename='fee-structure')
router.register('fee-schedules', FeeScheduleViewSet, basename='fee-schedule')
router.register('academic-fee-plans', AcademicFeePlanViewSet, basename='academic-fee-plan')
router.register('billing-accounts', StudentBillingAccountViewSet, basename='billing-account')
router.register('invoices', StudentInvoiceViewSet, basename='invoice')
router.register('invoice-items', InvoiceItemViewSet, basename='invoice-item')
router.register('invoice-adjustments', InvoiceAdjustmentViewSet, basename='invoice-adjustment')
router.register('invoice-discounts', InvoiceDiscountViewSet, basename='invoice-discount')
router.register('scholarships', ScholarshipViewSet, basename='scholarship')
router.register('scholarship-rules', ScholarshipRuleViewSet, basename='scholarship-rule')
router.register('financial-aids', FinancialAidViewSet, basename='financial-aid')
router.register('installment-plans', InstallmentPlanViewSet, basename='installment-plan')
router.register('installments', InstallmentViewSet, basename='installment')
router.register('receivables', StudentReceivableViewSet, basename='receivable')
router.register('payment-allocations', PaymentAllocationViewSet, basename='payment-allocation')
router.register('receipts', ReceiptViewSet, basename='receipt')
router.register('refunds', RefundViewSet, basename='refund')
router.register('credit-notes', CreditNoteViewSet, basename='credit-note')
router.register('debit-notes', DebitNoteViewSet, basename='debit-note')
router.register('late-fee-rules', LateFeeRuleViewSet, basename='late-fee-rule')
router.register('collection-policies', CollectionPolicyViewSet, basename='collection-policy')
router.register('financial-holds', FinancialHoldViewSet, basename='financial-hold')
router.register('billing-cycles', BillingCycleViewSet, basename='billing-cycle')
router.register('statements', StatementViewSet, basename='statement')
router.register('billing-audits', BillingAuditViewSet, basename='billing-audit')
router.register('settings', StudentFinanceSettingsViewSet, basename='settings')
router.register('online-payments', OnlinePaymentRequestViewSet, basename='online-payment')

urlpatterns = [
    path('', include(router.urls)),
]
