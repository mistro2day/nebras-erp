from rest_framework import serializers
from django.db.models import Sum
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

_STUDENT_META_CACHE = {}
_ACC_TOTALS_CACHE = {}
_PAYMENT_METHOD_CACHE = {}

def _get_payment_method_name(pm_id):
    if not pm_id:
        return 'تحويل بنكي'
    pm_key = str(pm_id)
    if pm_key in _PAYMENT_METHOD_CACHE:
        return _PAYMENT_METHOD_CACHE[pm_key]
    try:
        from apps.finance.domain.models import PaymentMethod
        pm = PaymentMethod.objects.filter(id=pm_id).first()
        name = (pm.name_ar or pm.name) if pm else 'تحويل بنكي'
        _PAYMENT_METHOD_CACHE[pm_key] = name
        return name
    except Exception:
        return 'تحويل بنكي'

def _extract_student_finance_metadata(billing_account, student_map=None, grade_map=None, section_map=None, branch_map=None, **kwargs):
    if not billing_account:
        return {
            'student_id': '', 'student_number': '', 'student_name': '',
            'grade_name': '', 'section_name': '', 'guardian_name': '',
            'guardian_phone': '', 'account_number': '',
        }
    acc_id = getattr(billing_account, 'id', None)
    if acc_id and acc_id in _STUDENT_META_CACHE:
        return _STUDENT_META_CACHE[acc_id]

    if hasattr(billing_account, '_cached_finance_meta'):
        return billing_account._cached_finance_meta

    data = {
        'student_id': '',
        'student_number': '',
        'student_name': '',
        'grade_name': '',
        'section_name': '',
        'stage_name': '',
        'branch_name': '',
        'gender': '',
        'guardian_name': '',
        'guardian_phone': '',
        'account_number': billing_account.account_number or '',
        'outstanding_balance': float(billing_account.outstanding_balance or 0.0),
        'current_balance': float(billing_account.current_balance or 0.0),
        'remaining_balance': float(billing_account.outstanding_balance or 0.0),
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
            gender_val = 'male'
            if prof:
                data['student_name'] = prof.arabic_name or prof.english_name or ''
                gender_val = getattr(prof, 'gender', 'male')
                data['gender'] = 'بنات' if gender_val == 'female' else 'بنين'

            enrs = list(student.enrollments.all())
            enrollment = next((e for e in enrs if e.status == 'active'), enrs[0] if enrs else None)
            if enrollment:
                # Branch
                bid = getattr(enrollment, 'branch_id', None)
                if bid:
                    if branch_map is not None and bid in branch_map:
                        data['branch_name'] = branch_map[bid]
                    else:
                        try:
                            from apps.organization.domain.models import Branch
                            br = Branch.objects.filter(id=bid).first()
                            if br:
                                data['branch_name'] = getattr(br, 'name_ar', '') or getattr(br, 'name', '') or ''
                        except Exception:
                            pass
                if not data['branch_name']:
                    data['branch_name'] = 'فرع البنات' if gender_val == 'female' else 'فرع البنين'

                gid = getattr(enrollment, 'grade_id', None)
                if gid:
                    if grade_map is not None and gid in grade_map:
                        data['grade_name'] = grade_map[gid]
                    else:
                        from apps.academics.domain.models import Grade
                        g = Grade.objects.filter(id=gid).select_related('stage').first()
                        if g:
                            data['grade_name'] = getattr(g, 'name_ar', '') or getattr(g, 'name', '') or ''
                            if getattr(g, 'stage', None):
                                data['stage_name'] = getattr(g.stage, 'name', '')

                sid = getattr(enrollment, 'section_id', None)
                if sid:
                    if section_map is not None and sid in section_map:
                        data['section_name'] = section_map[sid]
                    else:
                        from apps.academics.domain.models import Section
                        sec = Section.objects.filter(id=sid).first()
                        if sec:
                            data['section_name'] = getattr(sec, 'name_ar', '') or getattr(sec, 'name', '') or ''

            if not data['branch_name']:
                data['branch_name'] = 'فرع البنات' if gender_val == 'female' else 'فرع البنين'

            # Fallback for stage_name if not retrieved from grade relation
            if not data['stage_name'] and data['grade_name']:
                gname = data['grade_name']
                if 'متوسط' in gname:
                    data['stage_name'] = 'المرحلة المتوسطة'
                elif 'ثانوي' in gname:
                    data['stage_name'] = 'المرحلة الثانوية'
                elif 'ابتدائي' in gname:
                    data['stage_name'] = 'المرحلة الابتدائية'
                elif 'رياض' in gname or 'روض' in gname:
                    data['stage_name'] = 'رياض الأطفال'
                else:
                    data['stage_name'] = 'المرحلة الأساسية'

            f_list = list(student.family_relations.all())
            if f_list:
                family = f_list[0]
                data['guardian_name'] = family.full_name or ''
                data['guardian_phone'] = family.phone or ''
    except Exception:
        pass

    billing_account._cached_finance_meta = data
    if acc_id:
        _STUDENT_META_CACHE[acc_id] = data
    return data


class StudentBillingAccountSerializer(BaseStudentFinanceSerializer):
    student_name = serializers.SerializerMethodField()
    student_number = serializers.SerializerMethodField()
    stage_name = serializers.SerializerMethodField()
    grade_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()
    guardian_phone = serializers.SerializerMethodField()
    total_billed = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta(BaseStudentFinanceSerializer.Meta):
        model = StudentBillingAccount
        fields = '__all__'

    def _meta_for(self, obj):
        return _extract_student_finance_metadata(obj)

    def get_student_name(self, obj):
        return self._meta_for(obj)['student_name']

    def get_student_number(self, obj):
        return self._meta_for(obj)['student_number']

    def get_stage_name(self, obj):
        return self._meta_for(obj)['stage_name']

    def get_grade_name(self, obj):
        return self._meta_for(obj)['grade_name']

    def get_section_name(self, obj):
        return self._meta_for(obj)['section_name']

    def get_branch_name(self, obj):
        return self._meta_for(obj)['branch_name']

    def get_gender(self, obj):
        return self._meta_for(obj)['gender']

    def get_guardian_name(self, obj):
        return self._meta_for(obj)['guardian_name']

    def get_guardian_phone(self, obj):
        return self._meta_for(obj)['guardian_phone']

    def get_total_billed(self, obj):
        try:
            inv_sum = obj.invoices.aggregate(s=Sum('total_amount'))['s']
            if inv_sum is not None and float(inv_sum) > 0:
                return float(inv_sum)
        except Exception:
            pass
        out = float(obj.outstanding_balance or 0.0)
        curr = float(obj.current_balance or 0.0)
        return max(out, curr, 0.0)

    def get_total_paid(self, obj):
        try:
            paid_sum = obj.invoices.aggregate(s=Sum('paid_amount'))['s']
            if paid_sum is not None:
                return float(paid_sum)
        except Exception:
            pass
        billed = self.get_total_billed(obj)
        out = float(obj.outstanding_balance or 0.0)
        return max(0.0, billed - out)

    def get_remaining_balance(self, obj):
        return float(obj.outstanding_balance or 0.0)

    def get_payment_status(self, obj):
        out = float(obj.outstanding_balance or 0.0)
        if out <= 0:
            return 'paid'
        billed = self.get_total_billed(obj)
        paid = self.get_total_paid(obj)
        if paid > 0 and out > 0:
            return 'partial'
        return 'unpaid'


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
    stage_name = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    receipt_date = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()
    guardian_phone = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    outstanding_balance = serializers.SerializerMethodField()
    total_invoiced = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    payment_method_name = serializers.SerializerMethodField()
    is_under_24h = serializers.SerializerMethodField()
    can_delete_edit = serializers.SerializerMethodField()
    can_reverse = serializers.SerializerMethodField()
    hours_since_creation = serializers.SerializerMethodField()
    is_admin_unlocked = serializers.SerializerMethodField()

    class Meta(BaseStudentFinanceSerializer.Meta):
        model = Receipt
        fields = '__all__'

    def get_stage_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account).get('stage_name', '')

    def get_branch_name(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account).get('branch_name', '')

    def get_gender(self, obj):
        return _extract_student_finance_metadata(obj.student_billing_account).get('gender', '')

    def get_receipt_date(self, obj):
        if getattr(obj, 'payment_date', None):
            return str(obj.payment_date)
        if getattr(obj, 'created_at', None):
            return str(obj.created_at).split('T')[0]
        return ''

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

    def get_remaining_balance(self, obj):
        acc = getattr(obj, 'student_billing_account', None)
        if acc:
            return float(acc.outstanding_balance or 0.0)
        return 0.0

    def get_outstanding_balance(self, obj):
        return self.get_remaining_balance(obj)

    def get_total_invoiced(self, obj):
        acc = getattr(obj, 'student_billing_account', None)
        if acc:
            acc_id = getattr(acc, 'id', None)
            if acc_id and acc_id in _ACC_TOTALS_CACHE:
                return _ACC_TOTALS_CACHE[acc_id][0]
            try:
                inv_total = float(sum(inv.total_amount for inv in acc.invoices.filter(status='posted')))
                rec_total = float(sum(r.amount for r in acc.receipts.filter(status='posted')))
            except Exception:
                inv_total, rec_total = 0.0, 0.0
            if acc_id:
                _ACC_TOTALS_CACHE[acc_id] = (inv_total, rec_total)
            return inv_total
        return 0.0

    def get_total_paid(self, obj):
        acc = getattr(obj, 'student_billing_account', None)
        if acc:
            acc_id = getattr(acc, 'id', None)
            if acc_id and acc_id in _ACC_TOTALS_CACHE:
                return _ACC_TOTALS_CACHE[acc_id][1]
            try:
                inv_total = float(sum(inv.total_amount for inv in acc.invoices.filter(status='posted')))
                rec_total = float(sum(r.amount for r in acc.receipts.filter(status='posted')))
            except Exception:
                inv_total, rec_total = 0.0, 0.0
            if acc_id:
                _ACC_TOTALS_CACHE[acc_id] = (inv_total, rec_total)
            return rec_total
        return 0.0

    def get_payment_method_name(self, obj):
        if hasattr(obj, 'payment_method_name') and obj.payment_method_name:
            return obj.payment_method_name
        return _get_payment_method_name(getattr(obj, 'payment_method_id', None))

    def get_hours_since_creation(self, obj):
        if not getattr(obj, 'created_at', None):
            return 999.0
        from django.utils import timezone
        diff = timezone.now() - obj.created_at
        return round(diff.total_seconds() / 3600.0, 1)

    def get_is_under_24h(self, obj):
        hours = self.get_hours_since_creation(obj)
        return hours <= 24.0

    def get_is_admin_unlocked(self, obj):
        if not getattr(obj, 'admin_unlocked_until', None):
            return False
        from django.utils import timezone
        return obj.admin_unlocked_until >= timezone.now()

    def get_can_delete_edit(self, obj):
        if obj.status == 'reversed':
            return False
        # متاح خلال 24 ساعة أو إذا قام الأدمن بفتح القفل أو إذا كان المستخدم سوبر يوزر
        req = self.context.get('request')
        is_su = bool(req and req.user and req.user.is_superuser)
        return self.get_is_under_24h(obj) or self.get_is_admin_unlocked(obj) or is_su

    def get_can_reverse(self, obj):
        if obj.status != 'posted':
            return False
        if obj.status == 'reversed' or getattr(obj, 'reversed_at', None):
            return False
        # العكس يتفعل بعد مرور 24 ساعة (أو للسوبر يوزر)
        req = self.context.get('request')
        is_su = bool(req and req.user and req.user.is_superuser)
        return (not self.get_is_under_24h(obj)) or is_su

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
