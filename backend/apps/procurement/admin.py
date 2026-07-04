from django.contrib import admin
from apps.procurement.domain.models import (
    VendorCategory, Vendor, VendorContact, VendorBankAccount, VendorDocument,
    VendorEvaluation, VendorBlacklist, VendorPerformance, PurchaseRequest,
    PurchaseRequestItem, PurchaseRequestApproval, PurchasePlan, PurchaseBudget,
    RFQ, RFQItem, Quotation, QuotationItem, QuotationComparison, VendorAward,
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderRevision, PurchaseContract,
    ContractItem, ContractRenewal, PurchaseSettings, ProcurementStatistics, ProcurementAudit
)

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name_ar', 'category', 'status', 'rating', 'tax_number')
    list_filter = ('status', 'category')
    search_fields = ('name_ar', 'name_en', 'cr_number')

class PurchaseRequestItemInline(admin.TabularInline):
    model = PurchaseRequestItem
    extra = 1

@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ('request_number', 'date', 'status', 'total_estimated_amount', 'priority')
    list_filter = ('status', 'priority')
    search_fields = ('request_number', 'reason')
    inlines = [PurchaseRequestItemInline]

class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'vendor', 'date', 'status', 'total_amount')
    list_filter = ('status', 'date')
    search_fields = ('po_number',)
    inlines = [PurchaseOrderItemInline]

@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ('rfq_number', 'purchase_request', 'deadline', 'status')
    list_filter = ('status', 'deadline')
    search_fields = ('rfq_number',)

admin.site.register(VendorCategory)
admin.site.register(VendorContact)
admin.site.register(VendorBankAccount)
admin.site.register(VendorDocument)
admin.site.register(VendorEvaluation)
admin.site.register(VendorBlacklist)
admin.site.register(VendorPerformance)
admin.site.register(PurchaseRequestApproval)
admin.site.register(PurchasePlan)
admin.site.register(PurchaseBudget)
admin.site.register(RFQItem)
admin.site.register(Quotation)
admin.site.register(QuotationItem)
admin.site.register(QuotationComparison)
admin.site.register(VendorAward)
admin.site.register(PurchaseOrderRevision)
admin.site.register(PurchaseContract)
admin.site.register(ContractItem)
admin.site.register(ContractRenewal)
admin.site.register(PurchaseSettings)
admin.site.register(ProcurementStatistics)
admin.site.register(ProcurementAudit)
