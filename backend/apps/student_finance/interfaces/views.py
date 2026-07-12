from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

from apps.student_finance.domain.models import (
    FeeCategory, FeeType, FeeStructure, FeeSchedule, AcademicFeePlan,
    StudentBillingAccount, StudentInvoice, InvoiceItem, InvoiceAdjustment,
    InvoiceDiscount, Scholarship, ScholarshipRule, FinancialAid,
    InstallmentPlan, Installment, StudentReceivable, PaymentAllocation,
    Receipt, Refund, CreditNote, DebitNote, LateFeeRule, CollectionPolicy,
    FinancialHold, BillingCycle, Statement, BillingAudit, StudentFinanceSettings
)

from apps.student_finance.interfaces.serializers import (
    FeeCategorySerializer, FeeTypeSerializer, FeeStructureSerializer,
    FeeScheduleSerializer, AcademicFeePlanSerializer, StudentBillingAccountSerializer,
    StudentInvoiceSerializer, InvoiceItemSerializer, InvoiceAdjustmentSerializer,
    InvoiceDiscountSerializer, ScholarshipSerializer, ScholarshipRuleSerializer,
    FinancialAidSerializer, InstallmentPlanSerializer, InstallmentSerializer,
    StudentReceivableSerializer, PaymentAllocationSerializer, ReceiptSerializer,
    RefundSerializer, CreditNoteSerializer, DebitNoteSerializer,
    LateFeeRuleSerializer, CollectionPolicySerializer, FinancialHoldSerializer,
    BillingCycleSerializer, StatementSerializer, BillingAuditSerializer,
    StudentFinanceSettingsSerializer
)

from apps.student_finance.application.services import (
    BillingService, PaymentService, ScholarshipService, HoldService
)


class FeeCategoryViewSet(BaseCRUDViewSet):
    model_class = FeeCategory
    serializer_class = FeeCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'code']


class FeeTypeViewSet(BaseCRUDViewSet):
    model_class = FeeType
    serializer_class = FeeTypeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'code']


class FeeStructureViewSet(BaseCRUDViewSet):
    model_class = FeeStructure
    serializer_class = FeeStructureSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'academic_year']


class FeeScheduleViewSet(BaseCRUDViewSet):
    model_class = FeeSchedule
    serializer_class = FeeScheduleSerializer


class AcademicFeePlanViewSet(BaseCRUDViewSet):
    model_class = AcademicFeePlan
    serializer_class = AcademicFeePlanSerializer


class StudentBillingAccountViewSet(BaseCRUDViewSet):
    model_class = StudentBillingAccount
    serializer_class = StudentBillingAccountSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['account_number']

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة التحكم المالية للطلاب."""
        tenant_id = request.tenant_id
        
        # إجمالي حسابات القبض المستحقة
        outstanding_receivables = StudentReceivable.objects.filter(
            tenant_id=tenant_id, status='outstanding'
        ).aggregate(total=Sum('outstanding_amount'))['total'] or 0.0

        # تحصيلات اليوم
        today = timezone.localdate()
        today_collections = Receipt.objects.filter(
            tenant_id=tenant_id, payment_date=today, status='posted'
        ).aggregate(total=Sum('amount'))['total'] or 0.0

        # تحصيلات الشهر
        start_of_month = today.replace(day=1)
        monthly_collections = Receipt.objects.filter(
            tenant_id=tenant_id, payment_date__gte=start_of_month, status='posted'
        ).aggregate(total=Sum('amount'))['total'] or 0.0

        # الحظر المالي النشط
        active_holds = FinancialHold.objects.filter(
            tenant_id=tenant_id, status='active'
        ).count()

        # طلبات الاسترداد المعلقة
        pending_refunds = Refund.objects.filter(
            tenant_id=tenant_id, status='pending'
        ).count()

        # الأقساط المستحقة خلال 7 أيام القادمة
        next_week = today + timezone.timedelta(days=7)
        due_installments = Installment.objects.filter(
            tenant_id=tenant_id, due_date__range=(today, next_week), status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0.0

        stats = {
            'outstanding_receivables': float(outstanding_receivables),
            'today_collections': float(today_collections),
            'monthly_collections': float(monthly_collections),
            'active_holds': active_holds,
            'pending_refunds': pending_refunds,
            'due_installments': float(due_installments)
        }
        return Response(stats, status=status.HTTP_200_OK)


class StudentInvoiceViewSet(BaseCRUDViewSet):
    model_class = StudentInvoice
    serializer_class = StudentInvoiceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number']

    def get_queryset(self):
        qs = super().get_queryset()
        account = self.request.query_params.get('student_billing_account')
        status_param = self.request.query_params.get('status')
        if account:
            qs = qs.filter(student_billing_account_id=account)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=False, methods=['post'], url_path='generate-invoice')
    def generate_invoice(self, request):
        tenant_id = request.tenant_id
        billing_account_id = request.data.get('billing_account_id')
        fee_structure_ids = request.data.get('fee_structure_ids', [])
        due_date_str = request.data.get('due_date')
        
        if not billing_account_id or not fee_structure_ids or not due_date_str:
            return Response({'error': 'billing_account_id, fee_structure_ids, and due_date are required'}, status=status.HTTP_400_BAD_REQUEST)

        fee_structures = FeeStructure.objects.filter(id__in=fee_structure_ids, tenant_id=tenant_id)
        due_date = timezone.datetime.strptime(due_date_str, '%Y-%m-%d').date()

        invoice = BillingService.generate_student_invoice(
            tenant_id=tenant_id,
            billing_account_id=billing_account_id,
            fee_structures=fee_structures,
            due_date=due_date,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class InvoiceItemViewSet(BaseCRUDViewSet):
    model_class = InvoiceItem
    serializer_class = InvoiceItemSerializer


class InvoiceAdjustmentViewSet(BaseCRUDViewSet):
    model_class = InvoiceAdjustment
    serializer_class = InvoiceAdjustmentSerializer


class InvoiceDiscountViewSet(BaseCRUDViewSet):
    model_class = InvoiceDiscount
    serializer_class = InvoiceDiscountSerializer


class ScholarshipViewSet(BaseCRUDViewSet):
    model_class = Scholarship
    serializer_class = ScholarshipSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        account = self.request.query_params.get('student_billing_account')
        if account:
            qs = qs.filter(student_billing_account_id=account)
        return qs

    @action(detail=False, methods=['post'], url_path='apply-scholarship')
    def apply_scholarship(self, request):
        tenant_id = request.tenant_id
        billing_account_id = request.data.get('billing_account_id')
        name = request.data.get('name')
        scholarship_type = request.data.get('type')
        amount_percentage = request.data.get('amount_percentage', 0.0)
        fixed_amount = request.data.get('fixed_amount', 0.0)
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')

        sc = ScholarshipService.apply_scholarship(
            tenant_id=tenant_id,
            billing_account_id=billing_account_id,
            name=name,
            scholarship_type=scholarship_type,
            amount_percentage=amount_percentage,
            fixed_amount=fixed_amount,
            start_date=start_date,
            end_date=end_date,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(sc)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ScholarshipRuleViewSet(BaseCRUDViewSet):
    model_class = ScholarshipRule
    serializer_class = ScholarshipRuleSerializer


class FinancialAidViewSet(BaseCRUDViewSet):
    model_class = FinancialAid
    serializer_class = FinancialAidSerializer


class InstallmentPlanViewSet(BaseCRUDViewSet):
    model_class = InstallmentPlan
    serializer_class = InstallmentPlanSerializer


class InstallmentViewSet(BaseCRUDViewSet):
    model_class = Installment
    serializer_class = InstallmentSerializer


class StudentReceivableViewSet(BaseCRUDViewSet):
    model_class = StudentReceivable
    serializer_class = StudentReceivableSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        account = self.request.query_params.get('student_billing_account')
        status_param = self.request.query_params.get('status')
        if account:
            qs = qs.filter(student_billing_account_id=account)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs


class PaymentAllocationViewSet(BaseCRUDViewSet):
    model_class = PaymentAllocation
    serializer_class = PaymentAllocationSerializer


class ReceiptViewSet(BaseCRUDViewSet):
    model_class = Receipt
    serializer_class = ReceiptSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['receipt_number']

    def get_queryset(self):
        qs = super().get_queryset()
        account = self.request.query_params.get('student_billing_account')
        if account:
            qs = qs.filter(student_billing_account_id=account)
        return qs

    @action(detail=False, methods=['post'], url_path='receive-payment')
    def receive_payment(self, request):
        tenant_id = request.tenant_id
        billing_account_id = request.data.get('billing_account_id')
        amount = request.data.get('amount')
        payment_method_id = request.data.get('payment_method_id')
        bank_account_id = request.data.get('bank_account_id')
        cash_box_id = request.data.get('cash_box_id')

        if not billing_account_id or amount is None or not payment_method_id:
            return Response({'error': 'billing_account_id, amount, and payment_method_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        receipt = PaymentService.receive_payment(
            tenant_id=tenant_id,
            billing_account_id=billing_account_id,
            amount=amount,
            payment_method_id=payment_method_id,
            bank_account_id=bank_account_id,
            cash_box_id=cash_box_id,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(receipt)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RefundViewSet(BaseCRUDViewSet):
    model_class = Refund
    serializer_class = RefundSerializer


class CreditNoteViewSet(BaseCRUDViewSet):
    model_class = CreditNote
    serializer_class = CreditNoteSerializer


class DebitNoteViewSet(BaseCRUDViewSet):
    model_class = DebitNote
    serializer_class = DebitNoteSerializer


class LateFeeRuleViewSet(BaseCRUDViewSet):
    model_class = LateFeeRule
    serializer_class = LateFeeRuleSerializer


class CollectionPolicyViewSet(BaseCRUDViewSet):
    model_class = CollectionPolicy
    serializer_class = CollectionPolicySerializer


class FinancialHoldViewSet(BaseCRUDViewSet):
    model_class = FinancialHold
    serializer_class = FinancialHoldSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        account = self.request.query_params.get('student_billing_account')
        status_param = self.request.query_params.get('status')
        if account:
            qs = qs.filter(student_billing_account_id=account)
        if status_param:
            qs = qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=['post'], url_path='release')
    def release_hold(self, request, pk=None):
        hold = self.get_queryset().get(id=pk)
        hold.status = 'released'
        hold.released_at = timezone.now()
        hold.save(update_fields=['status', 'released_at'])
        # رفع علم الحظر عن الحساب إذا لم تبقَ حالات حظر نشطة
        acc = hold.student_billing_account
        if not FinancialHold.objects.filter(student_billing_account=acc, status='active').exists():
            acc.financial_hold = False
            acc.save(update_fields=['financial_hold'])
        return StandardResponse(data=self.get_serializer(hold).data, message="تم رفع الحظر المالي بنجاح.")

    @action(detail=False, methods=['post'], url_path='apply-hold')
    def apply_hold(self, request):
        tenant_id = request.tenant_id
        billing_account_id = request.data.get('billing_account_id')
        hold_type = request.data.get('hold_type')
        reason = request.data.get('reason')

        hold = HoldService.apply_financial_hold(
            tenant_id=tenant_id,
            billing_account_id=billing_account_id,
            hold_type=hold_type,
            reason=reason,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(hold)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BillingCycleViewSet(BaseCRUDViewSet):
    model_class = BillingCycle
    serializer_class = BillingCycleSerializer


class StatementViewSet(BaseCRUDViewSet):
    model_class = Statement
    serializer_class = StatementSerializer


class BillingAuditViewSet(BaseCRUDViewSet):
    model_class = BillingAudit
    serializer_class = BillingAuditSerializer


class StudentFinanceSettingsViewSet(BaseCRUDViewSet):
    model_class = StudentFinanceSettings
    serializer_class = StudentFinanceSettingsSerializer
