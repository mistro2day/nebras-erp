from rest_framework import status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum
from django.core.exceptions import ValidationError as DjangoValidationError

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

from apps.procurement.domain.models import (
    VendorCategory, Vendor, VendorContact, VendorBankAccount, VendorDocument,
    VendorEvaluation, VendorBlacklist, VendorPerformance, PurchaseRequest,
    PurchaseRequestItem, PurchaseRequestApproval, PurchasePlan, PurchaseBudget,
    RFQ, RFQItem, Quotation, QuotationItem, QuotationComparison, VendorAward,
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderRevision, PurchaseContract,
    ContractItem, ContractRenewal, PurchaseSettings, ProcurementStatistics, ProcurementAudit
)

from apps.procurement.interfaces.serializers import (
    VendorCategorySerializer, VendorSerializer, VendorContactSerializer,
    VendorBankAccountSerializer, VendorDocumentSerializer, VendorEvaluationSerializer,
    VendorBlacklistSerializer, VendorPerformanceSerializer, PurchaseRequestSerializer,
    PurchaseRequestItemSerializer, PurchaseRequestApprovalSerializer, PurchasePlanSerializer,
    PurchaseBudgetSerializer, RFQSerializer, RFQItemSerializer, QuotationSerializer,
    QuotationItemSerializer, QuotationComparisonSerializer, VendorAwardSerializer,
    PurchaseOrderSerializer, PurchaseOrderItemSerializer, PurchaseOrderRevisionSerializer,
    PurchaseContractSerializer, ContractItemSerializer, ContractRenewalSerializer,
    PurchaseSettingsSerializer, ProcurementStatisticsSerializer, ProcurementAuditSerializer
)

from apps.procurement.application.services import ProcurementService, PurchaseOrderService


class VendorCategoryViewSet(BaseCRUDViewSet):
    model_class = VendorCategory
    serializer_class = VendorCategorySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'code']


class VendorViewSet(BaseCRUDViewSet):
    model_class = Vendor
    serializer_class = VendorSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name_ar', 'name_en', 'tax_number', 'cr_number']
    ordering_fields = ['rating', 'name_ar']


class VendorContactViewSet(BaseCRUDViewSet):
    model_class = VendorContact
    serializer_class = VendorContactSerializer


class VendorBankAccountViewSet(BaseCRUDViewSet):
    model_class = VendorBankAccount
    serializer_class = VendorBankAccountSerializer


class VendorDocumentViewSet(BaseCRUDViewSet):
    model_class = VendorDocument
    serializer_class = VendorDocumentSerializer


class VendorEvaluationViewSet(BaseCRUDViewSet):
    model_class = VendorEvaluation
    serializer_class = VendorEvaluationSerializer


class VendorBlacklistViewSet(BaseCRUDViewSet):
    model_class = VendorBlacklist
    serializer_class = VendorBlacklistSerializer


class VendorPerformanceViewSet(BaseCRUDViewSet):
    model_class = VendorPerformance
    serializer_class = VendorPerformanceSerializer


class PurchaseRequestViewSet(BaseCRUDViewSet):
    model_class = PurchaseRequest
    serializer_class = PurchaseRequestSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['request_number', 'reason']

    @action(detail=False, methods=['get'], url_path='dashboard-stats')
    def get_dashboard_stats(self, request):
        """جلب إحصائيات لوحة تحكم المشتريات والإنفاق العام."""
        tenant_id = request.tenant_id
        
        open_requests = PurchaseRequest.objects.filter(tenant_id=tenant_id, status__in=['draft', 'pending_approval']).count()
        pending_approvals = PurchaseRequestApproval.objects.filter(tenant_id=tenant_id, status='pending').count()
        active_rfqs = RFQ.objects.filter(tenant_id=tenant_id, status='published').count()
        active_pos = PurchaseOrder.objects.filter(tenant_id=tenant_id, status='approved').count()
        active_contracts = PurchaseContract.objects.filter(tenant_id=tenant_id, status='active').count()

        stats_record = ProcurementStatistics.objects.filter(tenant_id=tenant_id).first()
        total_spent = stats_record.total_spent if stats_record else 0.0
        savings = stats_record.savings_achieved if stats_record else 0.0

        stats = {
            'open_requests': open_requests,
            'pending_approvals': pending_approvals,
            'active_rfqs': active_rfqs,
            'active_pos': active_pos,
            'active_contracts': active_contracts,
            'total_spent': float(total_spent),
            'savings': float(savings)
        }
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='reference-data')
    def reference_data(self, request):
        """بيانات مرجعية موحّدة لنموذج طلب الشراء: الأقسام + حسابات الموازنة + مراكز التكلفة.

        تُجمَّع هنا (بصلاحية المشتريات) لتفادي اعتماد نموذج الطلب على صلاحيات وحدة المالية.
        """
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        from apps.organization.domain.models import Department
        from apps.finance.domain.models import ChartOfAccount, CostCenter

        departments = [
            {'id': str(d.id), 'name': d.name, 'code': d.code, 'type': d.type}
            for d in Department.objects.filter(tenant_id=tenant_id, is_active=True, deleted_at__isnull=True)
        ]
        accounts = [
            {'id': str(a.id), 'code': a.code, 'name': a.name_ar or a.name_en}
            for a in ChartOfAccount.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)[:500]
        ]
        # مراكز التكلفة أبعاد مالية تملكها المالية — تُقرأ هنا للاستهلاك فقط (نمط Odoo/D365).
        # نُرفق الميزانية المخصصة ليرى مقدّم الطلب أثر اختياره قبل الإرسال.
        cost_centers = [
            {
                'id': str(c.id),
                'code': c.code,
                'name': c.name_ar or c.name_en or c.code,
                'budget_allocated': float(c.budget_allocated or 0),
            }
            for c in CostCenter.objects.filter(
                tenant_id=tenant_id, status='active', deleted_at__isnull=True
            )
        ]
        return StandardResponse({
            'departments': departments,
            'accounts': accounts,
            'cost_centers': cost_centers,
        }, message="البيانات المرجعية لطلب الشراء.")

    @action(detail=False, methods=['post'], url_path='create-request')
    def create_request(self, request):
        tenant_id = request.tenant_id
        department_id = request.data.get('department_id')
        requested_by = request.data.get('requested_by')
        items = request.data.get('items', [])
        reason = request.data.get('reason', '')

        if not department_id or not requested_by or not items:
            return Response({'error': 'department_id, requested_by, and items are required'}, status=status.HTTP_400_BAD_REQUEST)

        pr = ProcurementService.create_purchase_request(
            tenant_id=tenant_id,
            department_id=department_id,
            requested_by=requested_by,
            items_data=items,
            reason=reason,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(pr)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_request(self, request, pk=None):
        tenant_id = request.tenant_id
        approver_id = request.data.get('approver_id')

        if not approver_id:
            return Response({'error': 'approver_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        pr = ProcurementService.approve_purchase_request(
            tenant_id=tenant_id,
            request_id=pk,
            approver_id=approver_id,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(pr)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PurchaseRequestItemViewSet(BaseCRUDViewSet):
    model_class = PurchaseRequestItem
    serializer_class = PurchaseRequestItemSerializer


class PurchaseRequestApprovalViewSet(BaseCRUDViewSet):
    model_class = PurchaseRequestApproval
    serializer_class = PurchaseRequestApprovalSerializer


class PurchasePlanViewSet(BaseCRUDViewSet):
    model_class = PurchasePlan
    serializer_class = PurchasePlanSerializer


class PurchaseBudgetViewSet(BaseCRUDViewSet):
    model_class = PurchaseBudget
    serializer_class = PurchaseBudgetSerializer


class RFQViewSet(BaseCRUDViewSet):
    model_class = RFQ
    serializer_class = RFQSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['rfq_number']

    @action(detail=False, methods=['post'], url_path='create-rfq')
    def create_rfq(self, request):
        tenant_id = request.tenant_id
        request_id = request.data.get('purchase_request_id')
        deadline_str = request.data.get('deadline')
        notes = request.data.get('notes', '')

        if not request_id or not deadline_str:
            return Response({'error': 'purchase_request_id and deadline are required'}, status=status.HTTP_400_BAD_REQUEST)

        deadline = timezone.datetime.strptime(deadline_str, '%Y-%m-%dT%H:%M:%S')

        rfq = ProcurementService.create_rfq_from_request(
            tenant_id=tenant_id,
            request_id=request_id,
            deadline=deadline,
            notes=notes,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(rfq)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submit-quotation')
    def submit_quotation(self, request, pk=None):
        """تسجيل عرض سعر مورّد على هذا الـ RFQ — الحلقة السابقة للترسية."""
        tenant_id = request.tenant_id
        try:
            q = ProcurementService.submit_quotation(
                tenant_id=tenant_id,
                rfq_id=pk,
                vendor_id=request.data.get('vendor_id'),
                quotation_reference=request.data.get('quotation_reference'),
                items_data=request.data.get('items', []),
                lead_time_days=request.data.get('lead_time_days', 7),
                user_id=request.user.id if request.user else None,
            )
        except DjangoValidationError as e:
            return Response({'error': e.messages[0] if getattr(e, 'messages', None) else str(e)},
                            status=status.HTTP_400_BAD_REQUEST)
        return StandardResponse(
            {'quotation_id': str(q.id), 'total_amount': float(q.total_amount)},
            message="تم تسجيل عرض السعر بنجاح.", status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=['post'], url_path='compare-and-award')
    def compare_and_award(self, request):
        tenant_id = request.tenant_id
        rfq_id = request.data.get('rfq_id')
        vendor_id = request.data.get('vendor_id')
        quotation_id = request.data.get('quotation_id')

        if not rfq_id or not vendor_id or not quotation_id:
            return Response({'error': 'rfq_id, vendor_id, and quotation_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        po = ProcurementService.compare_quotations_and_award(
            tenant_id=tenant_id,
            rfq_id=rfq_id,
            vendor_id=vendor_id,
            quotation_id=quotation_id,
            user_id=request.user.id if request.user else None
        )
        # نقوم بإرجاع بيانات أمر الشراء المولد
        return Response({'purchase_order_id': str(po.id), 'po_number': po.po_number}, status=status.HTTP_201_CREATED)


class RFQItemViewSet(BaseCRUDViewSet):
    model_class = RFQItem
    serializer_class = RFQItemSerializer


class QuotationViewSet(BaseCRUDViewSet):
    model_class = Quotation
    serializer_class = QuotationSerializer


class QuotationItemViewSet(BaseCRUDViewSet):
    model_class = QuotationItem
    serializer_class = QuotationItemSerializer


class QuotationComparisonViewSet(BaseCRUDViewSet):
    model_class = QuotationComparison
    serializer_class = QuotationComparisonSerializer


class VendorAwardViewSet(BaseCRUDViewSet):
    model_class = VendorAward
    serializer_class = VendorAwardSerializer


class PurchaseOrderViewSet(BaseCRUDViewSet):
    model_class = PurchaseOrder
    serializer_class = PurchaseOrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['po_number']

    @action(detail=True, methods=['post'], url_path='post-invoice')
    def post_invoice(self, request, pk=None):
        """تسجيل فاتورة المورّد وترحيل قيدها في دفتر الأستاذ (آخر حلقة نحو المالية)."""
        tenant_id = request.tenant_id
        invoice_number = request.data.get('invoice_number')
        invoice_date = request.data.get('invoice_date') or None

        try:
            po = PurchaseOrderService.post_vendor_invoice(
                tenant_id=tenant_id,
                po_id=pk,
                invoice_number=invoice_number,
                invoice_date=invoice_date,
                user_id=request.user.id if request.user else None,
            )
        except DjangoValidationError as e:
            return Response({'error': e.messages[0] if getattr(e, 'messages', None) else str(e)},
                            status=status.HTTP_400_BAD_REQUEST)

        return StandardResponse(
            {'po_number': po.po_number, 'journal_entry_id': str(po.journal_entry_id), 'status': po.status},
            message="تم تسجيل فاتورة المورّد وترحيل قيدها المحاسبي بنجاح.",
        )

    @action(detail=True, methods=['post'], url_path='issue')
    def issue_po(self, request, pk=None):
        tenant_id = request.tenant_id
        
        po = PurchaseOrderService.issue_purchase_order(
            tenant_id=tenant_id,
            po_id=pk,
            user_id=request.user.id if request.user else None
        )
        serializer = self.get_serializer(po)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PurchaseOrderItemViewSet(BaseCRUDViewSet):
    model_class = PurchaseOrderItem
    serializer_class = PurchaseOrderItemSerializer


class PurchaseOrderRevisionViewSet(BaseCRUDViewSet):
    model_class = PurchaseOrderRevision
    serializer_class = PurchaseOrderRevisionSerializer


class PurchaseContractViewSet(BaseCRUDViewSet):
    model_class = PurchaseContract
    serializer_class = PurchaseContractSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['contract_number', 'title']


class ContractItemViewSet(BaseCRUDViewSet):
    model_class = ContractItem
    serializer_class = ContractItemSerializer


class ContractRenewalViewSet(BaseCRUDViewSet):
    model_class = ContractRenewal
    serializer_class = ContractRenewalSerializer


class PurchaseSettingsViewSet(BaseCRUDViewSet):
    model_class = PurchaseSettings
    serializer_class = PurchaseSettingsSerializer


class ProcurementStatisticsViewSet(BaseCRUDViewSet):
    model_class = ProcurementStatistics
    serializer_class = ProcurementStatisticsSerializer


class ProcurementAuditViewSet(BaseCRUDViewSet):
    model_class = ProcurementAudit
    serializer_class = ProcurementAuditSerializer
