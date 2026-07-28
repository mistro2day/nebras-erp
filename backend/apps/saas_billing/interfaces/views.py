"""واجهات فوترة المنصّة — على مستوى المشغّل، عبر جميع المستأجرين (لا عزل مستأجر)."""
from decimal import Decimal, InvalidOperation

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.common.responses import StandardResponse, StandardPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from apps.saas_billing.domain.models import (
    SubscriptionPlan, TenantSubscription, Invoice, Payment, PaymentSubmission,
    TenantSignupRequest,
)
from apps.saas_billing.interfaces.serializers import (
    SubscriptionPlanSerializer, TenantSubscriptionSerializer,
    InvoiceSerializer, PaymentSerializer, PaymentSubmissionSerializer,
    TenantSignupRequestSerializer,
)
from apps.saas_billing.application import services


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    """خطط الاشتراك العامّة (تُدار من مشغّل المنصّة)."""
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name_ar', 'name_en']
    ordering_fields = ['sort_order', 'price', 'created_at']

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def public(self, request):
        """الباقات العامة المعروضة في موقع نبراس التسويقي (بلا مصادقة)."""
        plans = SubscriptionPlan.objects.filter(is_active=True, is_public=True).order_by('sort_order', 'price')
        return StandardResponse(data=SubscriptionPlanSerializer(plans, many=True).data)


class TenantSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = TenantSubscriptionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'current_period_end', 'status']

    def get_queryset(self):
        qs = TenantSubscription.objects.select_related('plan', 'tenant').all()
        tenant_id = self.request.query_params.get('tenant_id')
        status_f = self.request.query_params.get('status')
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    @action(detail=False, methods=['post'])
    def provision(self, request):
        """إنشاء اشتراك لمستأجر على خطة، مع فترة تجريبية اختيارية."""
        tenant_id = request.data.get('tenant_id')
        plan_id = request.data.get('plan_id')
        trial_days = int(request.data.get('trial_days') or 0)
        if not tenant_id or not plan_id:
            return StandardResponse(success=False, message='tenant_id و plan_id مطلوبان',
                                    status=status.HTTP_400_BAD_REQUEST)
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return StandardResponse(success=False, message='الخطة غير موجودة',
                                    status=status.HTTP_404_NOT_FOUND)
        sub = services.create_subscription(tenant_id=tenant_id, plan=plan, trial_days=trial_days)
        return StandardResponse(data=TenantSubscriptionSerializer(sub).data,
                                message='تم إنشاء الاشتراك', status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def generate_invoice(self, request, pk=None):
        """يولّد فاتورة لدورة الاشتراك الحالية."""
        sub = self.get_object()
        invoice = services.generate_invoice_for_subscription(sub)
        return StandardResponse(data=InvoiceSerializer(invoice).data,
                                message='تم توليد الفاتورة', status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        sub = self.get_object()
        from django.utils import timezone
        sub.cancel_at_period_end = bool(request.data.get('at_period_end', True))
        if not sub.cancel_at_period_end:
            sub.status = 'canceled'
        sub.canceled_at = timezone.now()
        sub.save()
        return StandardResponse(data=TenantSubscriptionSerializer(sub).data, message='تم إلغاء الاشتراك')


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['number']
    ordering_fields = ['issue_date', 'due_date', 'total', 'created_at']

    def get_queryset(self):
        qs = Invoice.objects.select_related('tenant', 'subscription').prefetch_related(
            'line_items', 'payments').all()
        tenant_id = self.request.query_params.get('tenant_id')
        status_f = self.request.query_params.get('status')
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """تسجيل دفعة على الفاتورة."""
        invoice = self.get_object()
        try:
            amount = Decimal(str(request.data.get('amount')))
        except (InvalidOperation, TypeError):
            return StandardResponse(success=False, message='مبلغ غير صالح',
                                    status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return StandardResponse(success=False, message='المبلغ يجب أن يكون أكبر من صفر',
                                    status=status.HTTP_400_BAD_REQUEST)
        payment = services.record_payment(
            invoice=invoice, amount=amount,
            method=request.data.get('method', 'bank_transfer'),
            reference=request.data.get('reference'),
            recorded_by=getattr(request.user, 'id', None),
        )
        invoice.refresh_from_db()
        return StandardResponse(
            data={'payment': PaymentSerializer(payment).data,
                  'invoice': InvoiceSerializer(invoice).data},
            message='تم تسجيل الدفعة', status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser, JSONParser])
    def submit_payment(self, request, pk=None):
        """سداد ذاتي من المستأجر: يرفع إثبات تحويل بنكي يبقى معلّقاً للمراجعة."""
        invoice = self.get_object()
        try:
            amount = Decimal(str(request.data.get('amount')))
        except (InvalidOperation, TypeError):
            return StandardResponse(success=False, message='مبلغ غير صالح',
                                    status=status.HTTP_400_BAD_REQUEST)
        submission = services.submit_payment_request(
            invoice=invoice, amount=amount,
            method=request.data.get('method', 'bank_transfer'),
            bank_name=request.data.get('bank_name'),
            transfer_reference=request.data.get('transfer_reference'),
            transfer_date=request.data.get('transfer_date') or None,
            sender_name=request.data.get('sender_name'),
            note=request.data.get('note'),
            receipt_attachment=request.FILES.get('receipt_attachment'),
            submitted_by=getattr(request.user, 'id', None),
        )
        return StandardResponse(data=PaymentSubmissionSerializer(submission).data,
                                message='تم إرسال طلب السداد للمراجعة', status=status.HTTP_201_CREATED)


class PaymentSubmissionViewSet(viewsets.ModelViewSet):
    """طلبات السداد الذاتي — يراجعها مشغّل المنصّة (اعتماد/رفض)."""
    serializer_class = PaymentSubmissionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'status', 'amount']

    def get_queryset(self):
        qs = PaymentSubmission.objects.select_related('tenant', 'invoice').all()
        tenant_id = self.request.query_params.get('tenant_id')
        status_f = self.request.query_params.get('status')
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        submission = self.get_object()
        try:
            services.approve_payment_submission(submission, reviewed_by=getattr(request.user, 'id', None))
        except ValueError as exc:
            return StandardResponse(success=False, message=str(exc), status=status.HTTP_400_BAD_REQUEST)
        submission.refresh_from_db()
        return StandardResponse(data=PaymentSubmissionSerializer(submission).data, message='تم اعتماد السداد')

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        submission = self.get_object()
        try:
            services.reject_payment_submission(
                submission, reviewed_by=getattr(request.user, 'id', None),
                reason=request.data.get('reason'))
        except ValueError as exc:
            return StandardResponse(success=False, message=str(exc), status=status.HTTP_400_BAD_REQUEST)
        submission.refresh_from_db()
        return StandardResponse(data=PaymentSubmissionSerializer(submission).data, message='تم رفض الطلب')


class TenantSignupRequestViewSet(viewsets.ModelViewSet):
    """طلبات انضمام المدارس — الإنشاء وفحص التوفّر عامّان، والمراجعة لمالك المنصّة."""
    serializer_class = TenantSignupRequestSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'status']

    def get_permissions(self):
        if self.action in ('create', 'check_subdomain'):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = TenantSignupRequest.objects.select_related('plan', 'created_tenant').all()
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data
        plan = None
        plan_id = data.get('plan') or data.get('plan_id')
        if plan_id:
            plan = SubscriptionPlan.objects.filter(id=plan_id).first()
        try:
            req = services.create_signup_request(
                school_name=data.get('school_name'), subdomain=data.get('subdomain'),
                email=data.get('email'), contact_name=data.get('contact_name'),
                phone=data.get('phone'), city=data.get('city'), plan=plan, note=data.get('note'),
            )
        except ValueError as exc:
            return StandardResponse(success=False, message=str(exc), status=status.HTTP_400_BAD_REQUEST)
        return StandardResponse(data=TenantSignupRequestSerializer(req).data,
                                message='تم استلام طلبك، سنراجعه ونوافيك.', status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def check_subdomain(self, request):
        sub = request.query_params.get('subdomain', '')
        normalized = services.normalize_subdomain(sub)
        return StandardResponse(data={'subdomain': normalized, 'available': services.subdomain_available(normalized)})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        req = self.get_object()
        try:
            tenant = services.approve_signup_request(req, reviewed_by=getattr(request.user, 'id', None),
                                                     trial_days=int(request.data.get('trial_days') or 14))
        except ValueError as exc:
            return StandardResponse(success=False, message=str(exc), status=status.HTTP_400_BAD_REQUEST)
        req.refresh_from_db()
        return StandardResponse(data=TenantSignupRequestSerializer(req).data,
                                message=f'تم إنشاء المستأجر «{tenant.name}» ونطاقه {tenant.subdomain}.')

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        req = self.get_object()
        try:
            services.reject_signup_request(req, reviewed_by=getattr(request.user, 'id', None),
                                           reason=request.data.get('reason'))
        except ValueError as exc:
            return StandardResponse(success=False, message=str(exc), status=status.HTTP_400_BAD_REQUEST)
        req.refresh_from_db()
        return StandardResponse(data=TenantSignupRequestSerializer(req).data, message='تم رفض الطلب')


class BillingDashboardView(viewsets.ViewSet):
    """مؤشرات لوحة الفوترة على مستوى المنصّة."""
    permission_classes = [IsAuthenticated]

    def list(self, request):
        services.sync_overdue_invoices()
        m = services.compute_metrics()
        return StandardResponse(data={
            'active_subscriptions': m.active_subscriptions,
            'trial_subscriptions': m.trial_subscriptions,
            'mrr': m.mrr,
            'outstanding': m.outstanding,
            'collected_this_year': m.collected_this_year,
            'overdue_invoices': m.overdue_invoices,
        })

    @action(detail=False, methods=['post'])
    def run_cycle(self, request):
        """تشغيل دورة الفوترة يدوياً الآن (تجديد + متأخرات + تصعيد)."""
        summary = services.run_billing_cycle()
        return StandardResponse(data=summary, message='تم تشغيل دورة الفوترة')

    @action(detail=False, methods=['get'])
    def usage(self, request):
        """استخدام المستأجر مقابل حدود خطته (الطلاب/الموظفون/الفروع/الوحدات)."""
        from apps.saas_billing.application import limits
        tenant_id = request.query_params.get('tenant_id')
        if not tenant_id and hasattr(request, 'tenant') and request.tenant:
            tenant_id = request.tenant.id
        if not tenant_id:
            return StandardResponse(success=False, message='tenant_id مطلوب',
                                    status=status.HTTP_400_BAD_REQUEST)
        return StandardResponse(data=limits.get_usage(tenant_id))
