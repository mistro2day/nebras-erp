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
from apps.student_finance.application import online_payment as online_payment_service
from apps.student_finance.domain.models import OnlinePaymentRequest
from apps.student_finance.interfaces.serializers import OnlinePaymentRequestSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.exceptions import ValidationError as DjangoValidationError


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

    @action(detail=True, methods=['get'], url_path='statement')
    def statement(self, request, pk=None):
        """كشف حساب مالي تفصيلي شامل للطالب مع تفاصيل وهوية المستأجر."""
        account = self.get_object()
        tenant = getattr(request, 'tenant', None)
        tenant_id = request.tenant_id

        from apps.student_finance.interfaces.serializers import _extract_student_finance_metadata
        student_meta = _extract_student_finance_metadata(account)

        # 1. بيانات وهوية المستأجر (المدرسة)
        tenant = getattr(request, 'tenant', None)
        if not tenant and hasattr(account, 'tenant_id') and account.tenant_id:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.filter(id=account.tenant_id).first()
        if not tenant:
            from apps.tenants.models import Tenant
            tenant = Tenant.objects.first()

        tenant_name_ar = (tenant.name_ar or tenant.name) if tenant else 'مدارس المودة النموذجية الخاصة'
        tenant_name_en = (tenant.name_en) if (tenant and tenant.name_en) else 'Al-Mawadda Model Private Schools'

        tenant_info = {
            'id': str(tenant.id) if tenant else str(tenant_id),
            'name': getattr(tenant, 'name', '') or tenant_name_ar,
            'name_ar': tenant_name_ar,
            'name_en': tenant_name_en,
            'logo_url': request.build_absolute_uri(tenant.logo.url) if (tenant and getattr(tenant, 'logo', None)) else '/assets/branding/al_mawadda_logo.jpg',
            'stamp_url': request.build_absolute_uri(tenant.stamp.url) if (tenant and getattr(tenant, 'stamp', None)) else '',
            'phone': getattr(tenant, 'phone_number', '') or '09123456789',
            'email': getattr(tenant, 'email', '') or 'accounts@almawadda.edu.sd',
            'address': getattr(tenant, 'address', '') or 'الخرطوم - العمارات - شارع 15، السودان',
            'affiliation': 'المرحلة الابتدائية والمتوسطة والثانوية • ولاية الخرطوم',
        }

        # 2. بيانات الحساب
        account_info = {
            'id': str(account.id),
            'account_number': account.account_number,
            'opening_balance': float(account.opening_balance or 0.0),
            'current_balance': float(account.current_balance or 0.0),
            'outstanding_balance': float(account.outstanding_balance or 0.0),
            'credit_balance': float(account.credit_balance or 0.0),
            'financial_hold': account.financial_hold,
            'currency': 'ج.س',
        }

        # 3. تجميع الحركات المالية وترتيبها زمنياً لحساب الرصيد التراكمي
        transactions = []

        # رصيد افتتاحي
        if account.opening_balance and float(account.opening_balance) > 0:
            transactions.append({
                'date': str(account.created_at.date() if account.created_at else timezone.localdate()),
                'type': 'opening_balance',
                'type_label': 'رصيد افتتاحي سابق',
                'reference_number': account.account_number,
                'description': 'الرصيد الافتتاحي المقيد عند فتح الحساب المالي',
                'debit': float(account.opening_balance),
                'credit': 0.0,
                'payment_method': '',
            })

        # فواتير الرسوم
        invoices = StudentInvoice.objects.filter(
            student_billing_account=account, tenant_id=tenant_id
        ).order_by('issue_date', 'created_at')
        
        for inv in invoices:
            transactions.append({
                'date': str(inv.issue_date or inv.created_at.date()),
                'type': 'invoice',
                'type_label': 'فاتورة رسوم دراسية',
                'reference_number': inv.invoice_number,
                'description': f"فاتورة رسوم - تاريخ الاستحقاق: {inv.due_date}",
                'debit': float(inv.total_amount or 0.0),
                'credit': 0.0,
                'payment_method': '',
                'invoice_status': inv.status,
            })

        # سندات القبض والتحصيلات
        receipts = Receipt.objects.filter(
            student_billing_account=account, tenant_id=tenant_id
        ).order_by('payment_date', 'created_at')

        for rec in receipts:
            transactions.append({
                'date': str(rec.payment_date or rec.created_at.date()),
                'type': 'receipt',
                'type_label': 'سند قبض / تحصيل',
                'reference_number': rec.receipt_number,
                'description': rec.description or 'سداد رسوم دراسية',
                'debit': 0.0,
                'credit': float(rec.amount or 0.0),
                'payment_method': rec.payment_method or 'نقداً',
                'reference_trans': rec.reference_number or '',
            })

        # المنح والخصومات
        scholarships = Scholarship.objects.filter(
            student_billing_account=account, tenant_id=tenant_id
        ).order_by('start_date', 'created_at')

        for sch in scholarships:
            val = float(sch.fixed_amount or 0.0)
            if val > 0:
                transactions.append({
                    'date': str(sch.start_date or sch.created_at.date()),
                    'type': 'scholarship',
                    'type_label': f"منحة ({sch.name})",
                    'reference_number': sch.code or 'SCH',
                    'description': f"منحة دراسية معتمدة: {sch.name}",
                    'debit': 0.0,
                    'credit': val,
                    'payment_method': '',
                })

        # فرز الحركات تصاعدياً بالتاريخ
        transactions.sort(key=lambda x: x['date'])

        # حساب الرصيد التراكمي (Running Balance)
        running_bal = 0.0
        total_invoiced = 0.0
        total_paid = 0.0
        total_discounted = 0.0

        for t in transactions:
            debit = t['debit']
            credit = t['credit']
            running_bal += (debit - credit)
            t['running_balance'] = float(running_bal)
            
            if t['type'] in ('invoice', 'opening_balance'):
                total_invoiced += debit
            if t['type'] == 'receipt':
                total_paid += credit
            if t['type'] == 'scholarship':
                total_discounted += credit

        # جدول الأقساط
        installments_qs = Installment.objects.filter(
            student_billing_account=account, tenant_id=tenant_id
        ).order_by('due_date')

        installments_data = []
        for ins in installments_qs:
            installments_data.append({
                'id': str(ins.id),
                'due_date': str(ins.due_date),
                'amount': float(ins.amount or 0.0),
                'paid_amount': float(ins.paid_amount or 0.0),
                'remaining_amount': float(max(0.0, float(ins.amount or 0.0) - float(ins.paid_amount or 0.0))),
                'status': ins.status,
                'status_label': 'مسدد بالكامل' if ins.status == 'paid' else ('متأخر' if str(ins.due_date) < str(timezone.localdate()) else 'مجدول'),
                'plan_name': ins.installment_plan.name if ins.installment_plan else '',
            })

        import uuid
        statement_number = f"STMT-{timezone.localdate().strftime('%Y%m%d')}-{account.account_number[-4:] if len(account.account_number) >= 4 else uuid.uuid4().hex[:4].upper()}"

        return StandardResponse(data={
            'meta': {
                'statement_number': statement_number,
                'generated_at': timezone.now().strftime('%Y-%m-%d %H:%M'),
                'academic_year': '2026 / 2027',
                'currency': 'ج.س',
            },
            'tenant': tenant_info,
            'student': student_meta,
            'account': account_info,
            'summary': {
                'total_invoiced': float(total_invoiced),
                'total_paid': float(total_paid),
                'total_discounted': float(total_discounted),
                'net_outstanding': float(account.outstanding_balance or running_bal),
                'credit_balance': float(account.credit_balance or 0.0),
                'installments_count': len(installments_data),
            },
            'transactions': transactions,
            'installments': installments_data,
        })


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
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice__invoice_number', 'student_billing_account__account_number']

    def get_queryset(self):
        qs = super().get_queryset()
        account = self.request.query_params.get('student_billing_account')
        status_param = self.request.query_params.get('status')
        month = self.request.query_params.get('month')
        year = self.request.query_params.get('year')
        range_param = self.request.query_params.get('range')
        
        today = timezone.localdate()
        if account:
            qs = qs.filter(student_billing_account_id=account)
        if status_param and status_param != 'all':
            if status_param == 'overdue':
                qs = qs.filter(due_date__lt=today).exclude(status='paid')
            else:
                qs = qs.filter(status=status_param)
        if year and month:
            try:
                qs = qs.filter(due_date__year=int(year), due_date__month=int(month))
            except ValueError:
                pass
        if range_param == 'today':
            qs = qs.filter(due_date=today)
        elif range_param == 'this_week':
            week_end = today + timezone.timedelta(days=7)
            qs = qs.filter(due_date__range=(today, week_end))
        elif range_param == 'overdue':
            qs = qs.filter(due_date__lt=today).exclude(status='paid')

        return qs.order_by('due_date', 'amount')

    @action(detail=False, methods=['get'], url_path='calendar')
    def calendar(self, request):
        """عرض تقويم استحقاق الأقساط والدفعات للطلاب مع مؤشرات ذكية وتصنيف زمني."""
        tenant_id = request.tenant_id
        today = timezone.localdate()
        
        # قراءة معايير التاريخ
        try:
            year = int(request.query_params.get('year', today.year))
            month = int(request.query_params.get('month', today.month))
        except (ValueError, TypeError):
            year, month = today.year, today.month

        status_param = request.query_params.get('status', 'all')
        range_param = request.query_params.get('range', 'all')
        search_query = request.query_params.get('search', '').strip()

        # استعلام الأساس
        base_qs = Installment.objects.filter(tenant_id=tenant_id)
        
        # مؤشرات عامة سريعة (KPI Counters)
        total_overdue_qs = base_qs.filter(due_date__lt=today).exclude(status='paid')
        overdue_count = total_overdue_qs.count()
        overdue_amount = float(total_overdue_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

        due_today_qs = base_qs.filter(due_date=today).exclude(status='paid')
        due_today_count = due_today_qs.count()
        due_today_amount = float(due_today_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

        next_7_days = today + timezone.timedelta(days=7)
        due_week_qs = base_qs.filter(due_date__range=(today, next_7_days)).exclude(status='paid')
        due_week_count = due_week_qs.count()
        due_week_amount = float(due_week_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

        paid_month_qs = base_qs.filter(due_date__year=year, due_date__month=month, status='paid')
        paid_month_count = paid_month_qs.count()
        paid_month_amount = float(paid_month_qs.aggregate(s=Sum('amount'))['s'] or 0.0)

        # التصفية حسب نطاق الشهر المطلوب للتقويم
        month_qs = base_qs.filter(due_date__year=year, due_date__month=month)
        
        # التجميع اليومي للشهر المختار (Calendar Matrix)
        days_summary = {}
        for item in month_qs.values('due_date', 'status').annotate(total_amount=Sum('amount')):
            d_str = str(item['due_date'])
            if d_str not in days_summary:
                days_summary[d_str] = {
                    'date': d_str,
                    'count': 0,
                    'total_amount': 0.0,
                    'pending_count': 0,
                    'paid_count': 0,
                    'overdue_count': 0,
                    'has_overdue': False,
                    'is_today': (item['due_date'] == today)
                }
            st = item['status']
            amt = float(item['total_amount'] or 0.0)
            days_summary[d_str]['count'] += 1
            days_summary[d_str]['total_amount'] += amt
            if st == 'paid':
                days_summary[d_str]['paid_count'] += 1
            elif item['due_date'] < today and st != 'paid':
                days_summary[d_str]['overdue_count'] += 1
                days_summary[d_str]['has_overdue'] = True
            else:
                days_summary[d_str]['pending_count'] += 1

        # قائمة الأقساط المعروضة حسب الفلتر
        filtered_qs = base_qs
        if range_param == 'today':
            filtered_qs = filtered_qs.filter(due_date=today)
        elif range_param == 'this_week':
            filtered_qs = filtered_qs.filter(due_date__range=(today, next_7_days))
        elif range_param == 'overdue':
            filtered_qs = filtered_qs.filter(due_date__lt=today).exclude(status='paid')
        elif range_param == 'this_month':
            filtered_qs = filtered_qs.filter(due_date__year=year, due_date__month=month)
        else:
            filtered_qs = filtered_qs.filter(due_date__year=year, due_date__month=month)

        if status_param and status_param != 'all':
            if status_param == 'overdue':
                filtered_qs = filtered_qs.filter(due_date__lt=today).exclude(status='paid')
            else:
                filtered_qs = filtered_qs.filter(status=status_param)

        filtered_qs = filtered_qs.select_related('student_billing_account', 'invoice', 'installment_plan').order_by('due_date', 'status')
        
        serialized_data = InstallmentSerializer(filtered_qs[:200], many=True).data

        if search_query:
            q_lower = search_query.lower()
            serialized_data = [
                d for d in serialized_data
                if q_lower in (d.get('student_name') or '').lower()
                or q_lower in (d.get('student_number') or '').lower()
                or q_lower in (d.get('invoice_number') or '').lower()
                or q_lower in (d.get('guardian_phone') or '').lower()
            ]

        for d in serialized_data:
            due_d = d.get('due_date')
            if due_d and d.get('status') != 'paid' and str(due_d) < str(today):
                d['computed_status'] = 'overdue'
                d['computed_status_label'] = 'متأخر السداد'
            elif due_d and str(due_d) == str(today) and d.get('status') != 'paid':
                d['computed_status'] = 'due_today'
                d['computed_status_label'] = 'يستحق اليوم'
            elif d.get('status') == 'paid':
                d['computed_status'] = 'paid'
                d['computed_status_label'] = 'مسدد بالكامل'
            else:
                d['computed_status'] = 'pending'
                d['computed_status_label'] = 'مجدول'

        return StandardResponse(data={
            'meta': {
                'year': year,
                'month': month,
                'today': str(today),
            },
            'summary': {
                'overdue_count': overdue_count,
                'overdue_amount': overdue_amount,
                'due_today_count': due_today_count,
                'due_today_amount': due_today_amount,
                'due_week_count': due_week_count,
                'due_week_amount': due_week_amount,
                'paid_month_count': paid_month_count,
                'paid_month_amount': paid_month_amount,
                'month_total_due': float(month_qs.exclude(status='paid').aggregate(s=Sum('amount'))['s'] or 0.0),
            },
            'days_summary': days_summary,
            'installments': serialized_data
        })

    @action(detail=True, methods=['post'], url_path='quick-pay')
    def quick_pay(self, request, pk=None):
        """تسجيل سداد فوري لقسط مجدول وتحديث الفاتورة وإصدار سند قبض."""
        tenant_id = request.tenant_id
        installment = self.get_object()
        
        remaining = float(max(0.0, float(installment.amount) - float(installment.paid_amount)))
        amount_to_pay = float(request.data.get('amount') or remaining)
        if amount_to_pay <= 0:
            return StandardResponse(message="مبلغ السداد يجب أن يكون أكبر من الصفر.", success=False, status=status.HTTP_400_BAD_REQUEST)
        
        reference_number = request.data.get('reference_number', '')
        payment_method_name = request.data.get('payment_method', 'تطبيق بنكك (بنك الخرطوم)')
        notes = request.data.get('notes', 'سداد قسط دراسي عبر تقويم الدفعات')
        
        new_paid = float(installment.paid_amount) + amount_to_pay
        installment.paid_amount = min(new_paid, float(installment.amount))
        if installment.paid_amount >= float(installment.amount):
            installment.status = 'paid'
        installment.save()

        if installment.invoice:
            inv = installment.invoice
            inv.paid_amount = float(inv.paid_amount or 0.0) + amount_to_pay
            inv.outstanding_amount = max(0.0, float(inv.total_amount) - float(inv.paid_amount))
            inv.save()

        import uuid
        receipt_no = f"REC-{timezone.localdate().strftime('%Y%m%d')}-{uuid.uuid4().hex[:5].upper()}"
        receipt = Receipt.objects.create(
            tenant_id=tenant_id,
            student_billing_account=installment.student_billing_account,
            receipt_number=receipt_no,
            payment_date=timezone.localdate(),
            amount=amount_to_pay,
            payment_method=payment_method_name,
            reference_number=reference_number,
            description=f"سداد قسط مستحق بتاريخ {installment.due_date} - {notes}",
            status='posted'
        )

        return StandardResponse(data={
            'message': 'تم تسجيل السداد بنجاح وإصدار سند القبض.',
            'receipt_number': receipt.receipt_number,
            'installment_id': str(installment.id),
            'installment_status': installment.status,
            'paid_amount': float(installment.paid_amount),
            'remaining_amount': float(max(0.0, float(installment.amount) - float(installment.paid_amount)))
        })

    @action(detail=True, methods=['get'], url_path='reminder-info')
    def reminder_info(self, request, pk=None):
        """تجهيز نص إشعار تذكير بالسداد مناسب للواتساب متوافق مع السياق السوداني."""
        from apps.student_finance.interfaces.serializers import _extract_student_finance_metadata
        installment = self.get_object()
        meta = _extract_student_finance_metadata(installment.student_billing_account)
        student_name = meta.get('student_name') or 'الطالب'
        guardian_phone = meta.get('guardian_phone') or ''
        remaining = float(max(0.0, float(installment.amount) - float(installment.paid_amount)))
        formatted_amount = f"{remaining:,.0f} ج.س"
        
        clean_phone = guardian_phone.replace(' ', '').replace('-', '').replace('+', '')
        if clean_phone.startswith('0'):
            clean_phone = '249' + clean_phone[1:]
        elif not clean_phone.startswith('249') and len(clean_phone) == 9:
            clean_phone = '249' + clean_phone

        text = (
            f"السلام عليكم ورحمة الله وبركاته،\n"
            f"الأخ/الأخت ولي أمر الطالب: {student_name}\n"
            f"نود تذكيركم بموعد استحقاق القسط المدرسي بمبلغ ({formatted_amount}) والمستحق بتاريخ {installment.due_date}.\n\n"
            f"طرق السداد المعتمدة لدى المدرسة:\n"
            f"• تطبيق بنكك (بنك الخرطوم)\n"
            f"• تطبيق فوري (بنك فيصل الإسلامي)\n"
            f"• أوكاش (بنك أمدرمان الوطني)\n\n"
            f"الرجاء إرسال إشعار التحويل البنكي مع ذكر اسم الطالب لتحديث السجل المالي فوراً.\n"
            f"شاكرين لكم حسن تعاونكم الدائم.\n"
            f"إدارة الحسابات المدرسية — منظومة نبراس التعليمية"
        )

        import urllib.parse
        encoded_text = urllib.parse.quote(text)
        whatsapp_url = f"https://wa.me/{clean_phone}?text={encoded_text}" if clean_phone else ""

        return StandardResponse(data={
            'student_name': student_name,
            'guardian_phone': guardian_phone,
            'clean_phone': clean_phone,
            'amount': remaining,
            'formatted_amount': formatted_amount,
            'due_date': str(installment.due_date),
            'reminder_text': text,
            'whatsapp_url': whatsapp_url
        })


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


class OnlinePaymentRequestViewSet(BaseCRUDViewSet):
    """طلبات السداد الأونلاين لأولياء الأمور (تحويل بنكي + مراجعة المحاسب)."""
    model_class = OnlinePaymentRequest
    serializer_class = OnlinePaymentRequestSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']

    def _tenant(self, request):
        return request.tenant.id if hasattr(request, 'tenant') and request.tenant else None

    def get_queryset(self):
        qs = super().get_queryset()
        status_param = self.request.query_params.get('status')
        account = self.request.query_params.get('student_billing_account')
        student = self.request.query_params.get('student_id')
        mine = self.request.query_params.get('mine')
        if status_param:
            qs = qs.filter(status=status_param)
        if account:
            qs = qs.filter(student_billing_account_id=account)
        if student:
            qs = qs.filter(student_id=student)
        if mine in ('1', 'true', 'yes') and self.request.user:
            qs = qs.filter(submitted_by_user_id=self.request.user.id)
        return qs

    def create(self, request, *args, **kwargs):
        """تقديم طلب سداد جديد من ولي الأمر (multipart مع إيصال التحويل)."""
        tenant_id = self._tenant(request)
        data = request.data
        try:
            req = online_payment_service.submit_payment_request(
                tenant_id=tenant_id,
                billing_account_id=data.get('student_billing_account') or data.get('billing_account_id'),
                amount=data.get('amount'),
                transfer_reference=data.get('transfer_reference'),
                transfer_date=data.get('transfer_date'),
                receipt_attachment=request.FILES.get('receipt_attachment'),
                sender_name=data.get('sender_name'),
                note=data.get('note'),
                bank_name=data.get('bank_name', 'بنك الخرطوم'),
                submitted_by_user_id=request.user.id if request.user else None,
            )
        except DjangoValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)},
                            status=status.HTTP_400_BAD_REQUEST)
        serializer = self.get_serializer(req)
        return StandardResponse(serializer.data,
                                message="تم استلام طلب السداد وهو الآن قيد مراجعة المحاسبة.",
                                status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        tenant_id = self._tenant(request)
        try:
            req = online_payment_service.approve_payment_request(
                tenant_id=tenant_id, request_id=pk,
                reviewer_id=request.user.id if request.user else None,
            )
        except DjangoValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)},
                            status=status.HTTP_400_BAD_REQUEST)
        return StandardResponse(self.get_serializer(req).data,
                                message="تم اعتماد السداد وتحديث حساب الطالب المالي.")

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        tenant_id = self._tenant(request)
        try:
            req = online_payment_service.reject_payment_request(
                tenant_id=tenant_id, request_id=pk,
                reviewer_id=request.user.id if request.user else None,
                reason=request.data.get('reason'),
            )
        except DjangoValidationError as e:
            return Response({'error': str(e.message if hasattr(e, 'message') else e)},
                            status=status.HTTP_400_BAD_REQUEST)
        return StandardResponse(self.get_serializer(req).data,
                                message="تم رفض طلب السداد وإشعار ولي الأمر.")

    @action(detail=False, methods=['get'], url_path='pending-count')
    def pending_count(self, request):
        n = self.get_queryset().filter(status='pending').count()
        return StandardResponse({'pending': n}, message="عدد الطلبات المعلقة.")
