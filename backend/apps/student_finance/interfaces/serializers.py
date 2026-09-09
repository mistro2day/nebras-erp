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

def _extract_student_finance_metadata(billing_account, student_map=None, grade_map=None, section_map=None):
    if not billing_account:
        return {
            'student_id': '', 'student_number': '', 'student_name': '',
            'grade_name': '', 'section_name': '', 'guardian_name': '',
            'guardian_phone': '', 'account_number': '',
        }
    if hasattr(billing_account, '_cached_finance_meta'):
        return billing_account._cached_finance_meta

    data = {
        'student_id': '',
        'student_number': '',
        'student_name': '',
        'grade_name': '',
        'section_name': '',
        'guardian_name': '',
        'guardian_phone': '',
        'account_number': billing_account.account_number or '',
    }
    st_id = billing_account.student_id
    if not st_id:
        billing_account._cached_finance_meta = data
        return data

    try:
        from apps.students.domain.models import Student
        student = None
        if student_map is not None:
            student = student_map.get(st_id)
        if not student:
            student = Student.objects.filter(id=st_id).select_related('profile').prefetch_related(
                'enrollments', 'family_relations'
            ).first()

        if student:
            data['student_id'] = str(student.id)
            data['student_number'] = student.student_number or ''
            prof = getattr(student, 'profile', None)
            if prof:
                data['student_name'] = prof.arabic_name or prof.english_name or ''

            enrs = list(student.enrollments.all())
            enrollment = next((e for e in enrs if e.status == 'active'), enrs[0] if enrs else None)
            if enrollment:
                gid = getattr(enrollment, 'grade_id', None)
                if gid:
                    if grade_map is not None and gid in grade_map:
                        data['grade_name'] = grade_map[gid]
                    else:
                        from apps.academics.domain.models import Grade
                        g = Grade.objects.filter(id=gid).first()
                        if g:
                            data['grade_name'] = getattr(g, 'name_ar', '') or getattr(g, 'name', '') or ''
                sid = getattr(enrollment, 'section_id', None)
                if sid:
                    if section_map is not None and sid in section_map:
                        data['section_name'] = section_map[sid]
                    else:
                        from apps.academics.domain.models import Section
                        sec = Section.objects.filter(id=sid).first()
                        if sec:
                            data['section_name'] = getattr(sec, 'name_ar', '') or getattr(sec, 'name', '') or ''

            f_list = list(student.family_relations.all())
            if f_list:
                family = f_list[0]
                data['guardian_name'] = family.full_name or ''
                data['guardian_phone'] = family.phone or ''
    except Exception:
        pass

    billing_account._cached_finance_meta = data
    return data


class StudentInvoiceSerializer(BaseStudentFinanceSerializer):
    items = InvoiceItemSerializer(many=True, read_only=True)
    discounts = InvoiceDiscountSerializer(many=True, read_only=True)
    adjustments = InvoiceAdjustmentSerializer(many=True, read_only=True)
    
    student_id = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    grade_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()
    guardian_phone = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()

    class Meta(BaseStudentFinanceSerializer.Meta):
        model = StudentInvoice
        fields = '__all__'

    def get_student_id(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_id']

    def get_student_number(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_number']

    def get_student_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_name']

    def get_grade_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['grade_name']

    def get_section_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['section_name']

    def get_guardian_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['guardian_name']

    def get_guardian_phone(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['guardian_phone']

    def get_account_number(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['account_number']


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
    student_id = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    grade_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()
    guardian_phone = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    invoice_number = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()
    plan_name = serializers.SerializerMethodField()
    account_id = serializers.SerializerMethodField()

    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Installment
        fields = '__all__'

    def get_account_id(self, obj):
        return str(obj.student_billing_account_id) if obj.student_billing_account_id else ''

    def get_student_id(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_id']

    def get_student_number(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_number']

    def get_student_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_name']

    def get_grade_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['grade_name']

    def get_section_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['section_name']

    def get_guardian_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['guardian_name']

    def get_guardian_phone(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['guardian_phone']

    def get_account_number(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['account_number']

    def get_invoice_number(self, obj):
        return obj.invoice.invoice_number if obj.invoice else ''

    def get_remaining_amount(self, obj):
        return float(max(0, (obj.amount or 0) - (obj.paid_amount or 0)))

    def get_plan_name(self, obj):
        return obj.installment_plan.name if obj.installment_plan else ''

class StudentReceivableSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = StudentReceivable
        fields = '__all__'

class PaymentAllocationSerializer(BaseStudentFinanceSerializer):
    class Meta(BaseStudentFinanceSerializer.Meta):
        model = PaymentAllocation
        fields = '__all__'


class ReceiptSerializer(BaseStudentFinanceSerializer):
    student_id = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    grade_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()
    guardian_phone = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()

    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Receipt
        fields = '__all__'

    def get_student_id(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_id']

    def get_student_number(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_number']

    def get_student_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['student_name']

    def get_grade_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['grade_name']

    def get_section_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['section_name']

    def get_guardian_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['guardian_name']

    def get_guardian_phone(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['guardian_phone']

    def get_account_number(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account)['account_number']

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


class OnlinePaymentRequestSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    receipt_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = OnlinePaymentRequest
        fields = '__all__'
        read_only_fields = (
            'tenant_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_at',
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
