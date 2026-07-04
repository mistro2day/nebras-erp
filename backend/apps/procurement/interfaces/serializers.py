from rest_framework import serializers
from apps.procurement.domain.models import (
    VendorCategory, Vendor, VendorContact, VendorBankAccount, VendorDocument,
    VendorEvaluation, VendorBlacklist, VendorPerformance, PurchaseRequest,
    PurchaseRequestItem, PurchaseRequestApproval, PurchasePlan, PurchaseBudget,
    RFQ, RFQItem, Quotation, QuotationItem, QuotationComparison, VendorAward,
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderRevision, PurchaseContract,
    ContractItem, ContractRenewal, PurchaseSettings, ProcurementStatistics, ProcurementAudit
)

class BaseProcurementSerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class VendorCategorySerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorCategory
        fields = '__all__'

class VendorSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = Vendor
        fields = '__all__'

class VendorContactSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorContact
        fields = '__all__'

class VendorBankAccountSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorBankAccount
        fields = '__all__'

class VendorDocumentSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorDocument
        fields = '__all__'

class VendorEvaluationSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorEvaluation
        fields = '__all__'

class VendorBlacklistSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorBlacklist
        fields = '__all__'

class VendorPerformanceSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorPerformance
        fields = '__all__'

class PurchaseRequestItemSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseRequestItem
        fields = '__all__'

class PurchaseRequestSerializer(BaseProcurementSerializer):
    items = PurchaseRequestItemSerializer(many=True, read_only=True)

    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseRequest
        fields = '__all__'

class PurchaseRequestApprovalSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseRequestApproval
        fields = '__all__'

class PurchasePlanSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchasePlan
        fields = '__all__'

class PurchaseBudgetSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseBudget
        fields = '__all__'

class RFQItemSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = RFQItem
        fields = '__all__'

class RFQSerializer(BaseProcurementSerializer):
    items = RFQItemSerializer(many=True, read_only=True)

    class Meta(BaseProcurementSerializer.Meta):
        model = RFQ
        fields = '__all__'

class QuotationItemSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = QuotationItem
        fields = '__all__'

class QuotationSerializer(BaseProcurementSerializer):
    items = QuotationItemSerializer(many=True, read_only=True)

    class Meta(BaseProcurementSerializer.Meta):
        model = Quotation
        fields = '__all__'

class QuotationComparisonSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = QuotationComparison
        fields = '__all__'

class VendorAwardSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = VendorAward
        fields = '__all__'

class PurchaseOrderItemSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseOrderItem
        fields = '__all__'

class PurchaseOrderSerializer(BaseProcurementSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)

    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseOrder
        fields = '__all__'

class PurchaseOrderRevisionSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseOrderRevision
        fields = '__all__'

class PurchaseContractSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseContract
        fields = '__all__'

class ContractItemSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = ContractItem
        fields = '__all__'

class ContractRenewalSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = ContractRenewal
        fields = '__all__'

class PurchaseSettingsSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = PurchaseSettings
        fields = '__all__'

class ProcurementStatisticsSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = ProcurementStatistics
        fields = '__all__'

class ProcurementAuditSerializer(BaseProcurementSerializer):
    class Meta(BaseProcurementSerializer.Meta):
        model = ProcurementAudit
        fields = '__all__'
