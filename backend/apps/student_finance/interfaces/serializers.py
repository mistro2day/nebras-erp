from rest_framework import serializers
from apps.student_finance.domain.models import (
    FeeCategory, FeeType, FeeStructure, FeeSchedule, AcademicFeePlan,
    StudentBillingAccount, StudentInvoice, InvoiceItem, InvoiceAdjustment,
    InvoiceDiscount, Scholarship, ScholarshipRule, FinancialAid,
    InstallmentPlan, Installment, StudentReceivable, PaymentAllocation,
    Receipt, Refund, CreditNote, DebitNote, LateFeeRule, CollectionPolicy,
    FinancialHold, BillingCycle, Statement, BillingAudit, StudentFinanceSettings,
    OnlinePaymentRequest
)

class BaseStudentFinanceSerializer(serializers.ModelSerializer):
    class Meta:
        read_only_fields = ('tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at')

class FeeCategorySerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = FeeCategory
        fields = '__all__'

class FeeTypeSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = FeeType
        fields = '__all__'

class FeeStructureSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = FeeStructure
        fields = '__all__'

class FeeScheduleSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = FeeSchedule
        fields = '__all__'

class AcademicFeePlanSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = AcademicFeePlan
        fields = '__all__'

class StudentBillingAccountSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = StudentBillingAccount
        fields = '__all__'

class InvoiceItemSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = InvoiceItem
        fields = '__all__'

class InvoiceDiscountSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = InvoiceDiscount
        fields = '__all__'

class InvoiceAdjustmentSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = InvoiceAdjustment
        fields = '__all__'

class StudentInvoiceSerializer(BaseStudentFinanceSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    discounts = InvoiceDiscountSerializer(many=True, read_only=True)
    adjustments = InvoiceAdjustmentSerializer(many=True, read_only=True)
    
    student_name = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()
    guardian_phone = serializers.SerializerMethodField()

    class Meta(BaseStudentFinanceSerializer.Meta):
        model = StudentInvoice
        fields = '__all__'

    def get_student_name(self, obj):
        try:
            return obj.student_billing_account.student.profile.arabic_name
        except Exception:
            return ""

    def get_guardian_name(self, obj):
        try:
            # Assuming guardian name is on billing_account or student profile
            # We don't have the exact structure of student module here, but we will access it dynamically
            student = obj.student_billing_account.student
            family = student.family_relations.first()
            if family:
                return family.name
            return ""
        except Exception:
            return ""

    def get_guardian_phone(self, obj):
        try:
            student = obj.student_billing_account.student
            family = student.family_relations.first()
            if family:
                return family.phone
            return ""
        except Exception:
            return ""

class ScholarshipSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Scholarship
        fields = '__all__'

class ScholarshipRuleSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = ScholarshipRule
        fields = '__all__'

class FinancialAidSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = FinancialAid
        fields = '__all__'

class InstallmentPlanSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = InstallmentPlan
        fields = '__all__'

class InstallmentSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Installment
        fields = '__all__'

class StudentReceivableSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = StudentReceivable
        fields = '__all__'

class PaymentAllocationSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = PaymentAllocation
        fields = '__all__'

class ReceiptSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Receipt
        fields = '__all__'

class RefundSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Refund
        fields = '__all__'

class CreditNoteSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = CreditNote
        fields = '__all__'

class DebitNoteSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = DebitNote
        fields = '__all__'

class LateFeeRuleSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = LateFeeRule
        fields = '__all__'

class CollectionPolicySerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = CollectionPolicy
        fields = '__all__'

class FinancialHoldSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = FinancialHold
        fields = '__all__'

class BillingCycleSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = BillingCycle
        fields = '__all__'

class StatementSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Statement
        fields = '__all__'

class BillingAuditSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = BillingAudit
        fields = '__all__'

class StudentFinanceSettingsSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = StudentFinanceSettings
        fields = '__all__'


class OnlinePaymentRequestSerializer(BaseStudentFinanceSerializer):
    student_name = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta(BaseStudentFinanceSerializer.Meta):
        model = OnlinePaymentRequest
        fields = '__all__'
        read_only_fields = BaseStudentFinanceSerializer.Meta.read_only_fields + (
            'status', 'reviewed_by', 'reviewed_at', 'rejection_reason',
            'receipt_id', 'posted_to_gl', 'submitted_by_user_id', 'student_id',
        )

    def get_student_name(self, obj):
        try:
            from apps.students.domain.models import Student
            s = Student.objects.filter(id=obj.student_id).select_related('profile').first()
            return getattr(getattr(s, 'profile', None), 'arabic_name', None)
        except Exception:
            return None

    def get_receipt_url(self, obj):
        if not obj.receipt_attachment:
            return None
        request = self.context.get('request')
        url = obj.receipt_attachment.url
        return request.build_absolute_uri(url) if request else url
