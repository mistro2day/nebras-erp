from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.procurement.interfaces.views import (
    VendorCategoryViewSet, VendorViewSet, VendorContactViewSet,
    VendorBankAccountViewSet, VendorDocumentViewSet, VendorEvaluationViewSet,
    VendorBlacklistViewSet, VendorPerformanceViewSet, PurchaseRequestViewSet,
    PurchaseRequestItemViewSet, PurchaseRequestApprovalViewSet, PurchasePlanViewSet,
    PurchaseBudgetViewSet, RFQViewSet, RFQItemViewSet, QuotationViewSet,
    QuotationItemViewSet, QuotationComparisonViewSet, VendorAwardViewSet,
    PurchaseOrderViewSet, PurchaseOrderItemViewSet, PurchaseOrderRevisionViewSet,
    PurchaseContractViewSet, ContractItemViewSet, ContractRenewalViewSet,
    PurchaseSettingsViewSet, ProcurementStatisticsViewSet, ProcurementAuditViewSet
)

router = DefaultRouter()
router.register('vendor-categories', VendorCategoryViewSet, basename='vendor-category')
router.register('vendors', VendorViewSet, basename='vendor')
router.register('vendor-contacts', VendorContactViewSet, basename='vendor-contact')
router.register('vendor-bank-accounts', VendorBankAccountViewSet, basename='vendor-bank-account')
router.register('vendor-documents', VendorDocumentViewSet, basename='vendor-document')
router.register('vendor-evaluations', VendorEvaluationViewSet, basename='vendor-evaluation')
router.register('vendor-blacklist', VendorBlacklistViewSet, basename='vendor-blacklist')
router.register('vendor-performance', VendorPerformanceViewSet, basename='vendor-performance')
router.register('requests', PurchaseRequestViewSet, basename='purchase-request')
router.register('request-items', PurchaseRequestItemViewSet, basename='purchase-request-item')
router.register('request-approvals', PurchaseRequestApprovalViewSet, basename='purchase-request-approval')
router.register('plans', PurchasePlanViewSet, basename='purchase-plan')
router.register('budgets', PurchaseBudgetViewSet, basename='purchase-budget')
router.register('rfqs', RFQViewSet, basename='rfq')
router.register('rfq-items', RFQItemViewSet, basename='rfq-item')
router.register('quotations', QuotationViewSet, basename='quotation')
router.register('quotation-items', QuotationItemViewSet, basename='quotation-item')
router.register('comparisons', QuotationComparisonViewSet, basename='quotation-comparison')
router.register('awards', VendorAwardViewSet, basename='vendor-award')
router.register('orders', PurchaseOrderViewSet, basename='purchase-order')
router.register('order-items', PurchaseOrderItemViewSet, basename='purchase-order-item')
router.register('order-revisions', PurchaseOrderRevisionViewSet, basename='purchase-order-revision')
router.register('contracts', PurchaseContractViewSet, basename='purchase-contract')
router.register('contract-items', ContractItemViewSet, basename='contract-item')
router.register('contract-renewals', ContractRenewalViewSet, basename='contract-renewal')
router.register('settings', PurchaseSettingsViewSet, basename='settings')
router.register('statistics', ProcurementStatisticsViewSet, basename='statistics')
router.register('audits', ProcurementAuditViewSet, basename='audit')

urlpatterns = [
    path('', include(router.urls)),
]
