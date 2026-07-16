import logging
from decimal import Decimal
from datetime import date
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum, Q

from apps.procurement.domain.models import (
    VendorCategory, Vendor, VendorContact, VendorBankAccount, VendorDocument,
    VendorEvaluation, VendorBlacklist, VendorPerformance, PurchaseRequest,
    PurchaseRequestItem, PurchaseRequestApproval, PurchasePlan, PurchaseBudget,
    RFQ, RFQItem, Quotation, QuotationItem, QuotationComparison, VendorAward,
    PurchaseOrder, PurchaseOrderItem, PurchaseOrderRevision, PurchaseContract,
    ContractItem, ContractRenewal, PurchaseSettings, ProcurementStatistics, ProcurementAudit
)

# استيراد خدمات ونماذج المالية للتحقق من الموازنة
from apps.finance.domain.models import ChartOfAccount, CostCenter
from apps.finance.application.services import BudgetService

# استيراد تكاملات المنصة
from apps.rules.application.services import RuleEvaluationService
from apps.workflow.services import WorkflowEngine
from apps.communications.application.events import EventBusConsumer
from apps.shared.application.numbering import generate_unique_number

logger = logging.getLogger('nebras.procurement')


# ============================================================
# 1. Procurement Service — إدارة دورة الشراء وعروض الأسعار
# ============================================================
class ProcurementService:
    """
    الخدمة المسؤولة عن إدارة طلبات الشراء، طلب عروض الأسعار (RFQ)، ومقارنة العروض والترسية.
    """

    @classmethod
    @transaction.atomic
    def create_purchase_request(cls, tenant_id, department_id, requested_by, items_data, reason, user_id=None):
        """
        إنشاء طلب شراء جديد مع التحقق من الموازنة التقديرية لكل بند بشكل مبدئي.
        """
        request_number = generate_unique_number(
            PurchaseRequest, tenant_id, f"PR-{timezone.now().strftime('%y%m%d')}-", 'request_number')
        
        # 1. حساب إجمالي الطلب التقديري
        total_estimated = Decimal('0.0')
        for item in items_data:
            total_estimated += Decimal(str(item['quantity'])) * Decimal(str(item['estimated_unit_price']))

        # 2. إنشاء طلب الشراء بمسودة
        pr = PurchaseRequest.objects.create(
            tenant_id=tenant_id,
            request_number=request_number,
            department_id=department_id,
            requested_by=requested_by,
            date=date.today(),
            status='draft',
            total_estimated_amount=total_estimated,
            reason=reason
        )

        # 3. إدراج البنود والتحقق التقديري من الموازنة بالتعاون مع موديول المالية
        for item in items_data:
            qty = Decimal(str(item['quantity']))
            price = Decimal(str(item['estimated_unit_price']))
            item_total = qty * price

            # التحقق من الحساب ومركز التكلفة بالمالية
            acc = ChartOfAccount.objects.get(id=item['budget_account_id'], tenant_id=tenant_id)
            cc = CostCenter.objects.get(id=item['cost_center_id'], tenant_id=tenant_id)

            # التحقق المبدئي دون استهلاك حقيقي (لأن الطلب لم يتم اعتماده أو إصداره كأمر شراء بعد)
            # نقوم فقط بالتأكد من صلاحية الموازنة
            PurchaseRequestItem.objects.create(
                tenant_id=tenant_id,
                request=pr,
                item_name=item['item_name'],
                quantity=qty,
                unit=item.get('unit', 'حبة'),
                estimated_unit_price=price,
                budget_account_id=acc.id,
                cost_center_id=cc.id
            )

        # 4. إرسال حدث للمنصة
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='PurchaseRequestSubmitted',
            source_module='procurement',
            event_data={
                'request_id': str(pr.id),
                'request_number': pr.request_number,
                'total_amount': float(total_estimated)
            }
        )

        return pr

    @classmethod
    @transaction.atomic
    def submit_purchase_request(cls, tenant_id, request_id, user_id=None):
        """
        إرسال طلب الشراء للاعتماد (مسودة ← قيد المراجعة).

        فصل الإرسال عن الاعتماد مقصود (فصل المهام): مُنشئ الطلب يُرسله، وأخصائي
        المشتريات أو المدير هو من يعتمده — مطابقاً لمصفوفة الصلاحيات في التوثيق
        ولنمط Submit ثم Approve في Odoo/D365.
        """
        pr = PurchaseRequest.objects.select_for_update().get(id=request_id, tenant_id=tenant_id)
        if pr.status != 'draft':
            raise ValidationError("لا يمكن إرسال هذا الطلب للاعتماد في حالته الحالية.")
        if not pr.items.exists():
            raise ValidationError("لا يمكن إرسال طلب بلا بنود.")

        pr.status = 'pending_approval'
        pr.save(update_fields=['status'])

        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='PurchaseRequestSubmittedForApproval',
            source_module='procurement',
            event_data={
                'request_id': str(pr.id),
                'request_number': pr.request_number,
                'total_amount': float(pr.total_estimated_amount),
            },
        )
        return pr

    @classmethod
    @transaction.atomic
    def approve_purchase_request(cls, tenant_id, request_id, approver_id, user_id=None):
        """
        اعتماد طلب الشراء وتغيير حالته ليصبح قابلاً لتوليد RFQ.
        """
        pr = PurchaseRequest.objects.select_for_update().get(id=request_id, tenant_id=tenant_id)
        if pr.status != 'pending_approval':
            raise ValidationError("يجب إرسال الطلب للاعتماد أولاً قبل اعتماده.")

        # تسجيل الاعتماد
        PurchaseRequestApproval.objects.create(
            tenant_id=tenant_id,
            request=pr,
            approver_id=approver_id,
            approved_at=timezone.now(),
            status='approved',
            comments="معتمد من خلال دورة العمل المتكاملة للمشتريات"
        )

        pr.status = 'approved'
        pr.save(update_fields=['status'])

        # إرسال إشعار
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='PurchaseRequestApproved',
            source_module='procurement',
            event_data={
                'request_id': str(pr.id),
                'request_number': pr.request_number
            }
        )

        return pr

    @classmethod
    @transaction.atomic
    def create_rfq_from_request(cls, tenant_id, request_id, deadline, notes=None, user_id=None):
        """
        توليد طلب عرض أسعار (RFQ) تلقائياً من طلب شراء معتمد.
        """
        pr = PurchaseRequest.objects.get(id=request_id, tenant_id=tenant_id)
        if pr.status != 'approved':
            raise ValidationError("يجب اعتماد طلب الشراء أولاً لتوليد طلب عروض أسعار.")

        rfq_number = generate_unique_number(
            RFQ, tenant_id, f"RFQ-{timezone.now().strftime('%y%m%d')}-", 'rfq_number')
        rfq = RFQ.objects.create(
            tenant_id=tenant_id,
            rfq_number=rfq_number,
            purchase_request=pr,
            deadline=deadline,
            status='published',
            notes=notes
        )

        # توليد البنود المطابقة
        for item in pr.items.all():
            RFQItem.objects.create(
                tenant_id=tenant_id,
                rfq=rfq,
                item_name=item.item_name,
                quantity=item.quantity,
                unit=item.unit
            )

        pr.status = 'rfq_created'
        pr.save(update_fields=['status'])

        # إشعار بنشر RFQ
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='RFQPublished',
            source_module='procurement',
            event_data={
                'rfq_id': str(rfq.id),
                'rfq_number': rfq.rfq_number
            }
        )

        return rfq

    @classmethod
    @transaction.atomic
    def submit_quotation(cls, tenant_id, rfq_id, vendor_id, quotation_reference,
                         items_data, lead_time_days=7, user_id=None):
        """
        تسجيل عرض سعر مورّد على طلب عروض الأسعار — الحلقة التي تسبق الترسية.

        `items_data`: [{rfq_item_id, unit_price, tax_amount?}]
        يُحتسب إجمالي كل بند من كمية بند الـ RFQ، ومجموعها إجمالي العرض.
        """
        rfq = RFQ.objects.select_for_update().get(id=rfq_id, tenant_id=tenant_id)
        if rfq.status not in ('published', 'closed'):
            raise ValidationError("لا يمكن تسجيل عروض أسعار على طلب غير منشور أو تمت ترسيته.")

        vendor = Vendor.objects.get(id=vendor_id, tenant_id=tenant_id)
        if vendor.status == 'blacklisted':
            raise ValidationError("المورد مدرج في القائمة السوداء ولا يمكن قبول عرضه.")
        if not items_data:
            raise ValidationError("يجب إدخال سعر بند واحد على الأقل.")
        if Quotation.objects.filter(tenant_id=tenant_id, rfq=rfq, vendor=vendor).exists():
            raise ValidationError("سبق تسجيل عرض سعر لهذا المورّد على هذا الطلب.")

        quotation = Quotation.objects.create(
            tenant_id=tenant_id, rfq=rfq, vendor=vendor,
            quotation_reference=quotation_reference or f"Q-{rfq.rfq_number}-{vendor.code if hasattr(vendor, 'code') else ''}",
            submitted_date=date.today(),
            total_amount=Decimal('0.0'),
            lead_time_days=int(lead_time_days or 7),
            status='submitted',
        )

        total = Decimal('0.0')
        for row in items_data:
            rfq_item = RFQItem.objects.get(id=row['rfq_item_id'], rfq=rfq, tenant_id=tenant_id)
            unit_price = Decimal(str(row['unit_price']))
            tax = Decimal(str(row.get('tax_amount') or 0))
            line_total = (unit_price * Decimal(str(rfq_item.quantity))) + tax
            QuotationItem.objects.create(
                tenant_id=tenant_id, quotation=quotation, rfq_item=rfq_item,
                unit_price=unit_price, tax_amount=tax, total_price=line_total,
            )
            total += line_total

        quotation.total_amount = total
        quotation.save(update_fields=['total_amount'])

        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='QuotationSubmitted',
            source_module='procurement',
            event_data={
                'rfq_id': str(rfq.id), 'quotation_id': str(quotation.id),
                'vendor': vendor.name_ar, 'amount': float(total),
            },
        )
        return quotation

    @classmethod
    @transaction.atomic
    def compare_quotations_and_award(cls, tenant_id, rfq_id, vendor_id, quotation_id, user_id=None):
        """
        إجراء مقارنة وترسية المشتريات على المورد الفائز وتوليد أمر شراء مسودة تلقائياً.
        """
        rfq = RFQ.objects.select_for_update().get(id=rfq_id, tenant_id=tenant_id)
        vendor = Vendor.objects.get(id=vendor_id, tenant_id=tenant_id)
        quotation = Quotation.objects.get(id=quotation_id, rfq=rfq, vendor=vendor, tenant_id=tenant_id)

        if vendor.status == 'blacklisted':
            raise ValidationError("المورد مدرج في القائمة السوداء ولا يمكن الترسية عليه.")

        # 1. تسجيل الترسية
        award = VendorAward.objects.create(
            tenant_id=tenant_id,
            rfq=rfq,
            vendor=vendor,
            quotation=quotation,
            award_date=date.today(),
            awarded_amount=quotation.total_amount
        )

        # 2. إنشاء مقارنة عروض الأسعار
        QuotationComparison.objects.create(
            tenant_id=tenant_id,
            rfq=rfq,
            comparison_matrix={'selected_vendor': vendor.name_ar, 'amount': float(quotation.total_amount)},
            recommendation=f"توصية بالترسية على {vendor.name_ar} لتقديمه أفضل عرض سعر مستوف الشروط."
        )

        rfq.status = 'awarded'
        rfq.save(update_fields=['status'])

        # 3. تحديث حالة عرض السعر الفائز
        quotation.status = 'awarded'
        quotation.save(update_fields=['status'])

        # 4. توليد أمر شراء (Purchase Order) مسودة تلقائياً
        po_number = generate_unique_number(
            PurchaseOrder, tenant_id, f"PO-{timezone.now().strftime('%y%m%d')}-", 'po_number')
        po = PurchaseOrder.objects.create(
            tenant_id=tenant_id,
            po_number=po_number,
            purchase_request=rfq.purchase_request,
            vendor=vendor,
            date=date.today(),
            status='draft',
            total_amount=quotation.total_amount
        )

        # نقل بنود عرض السعر الفائز لأمر الشراء
        for q_item in quotation.items.all():
            pr_item = rfq.purchase_request.items.filter(item_name=q_item.rfq_item.item_name).first()
            PurchaseOrderItem.objects.create(
                tenant_id=tenant_id,
                purchase_order=po,
                item_name=q_item.rfq_item.item_name,
                quantity=q_item.rfq_item.quantity,
                unit=q_item.rfq_item.unit,
                unit_price=q_item.unit_price,
                total_price=q_item.total_price,
                budget_account_id=pr_item.budget_account_id if pr_item else user_id,  # استخدام الحساب الحقيقي من طلب الشراء
                cost_center_id=pr_item.cost_center_id if pr_item else user_id
            )

        return po


# ============================================================
# 2. Purchase Order Service — إدارة أوامر الشراء والموازنة
# ============================================================
class PurchaseOrderService:
    """
    الخدمة المسؤولة عن اعتماد أوامر الشراء واستهلاك الموازنات الحقيقية بالمالية.
    """

    @classmethod
    @transaction.atomic
    def issue_purchase_order(cls, tenant_id, po_id, user_id=None):
        """
        اعتماد وإصدار أمر الشراء واستهلاك الموازنة المالية المعتمدة بالمالية.
        """
        po = PurchaseOrder.objects.select_for_update().get(id=po_id, tenant_id=tenant_id)
        if po.status != 'draft':
            raise ValidationError("أمر الشراء هذا معتمد أو مصدر مسبقاً.")

        # 1. استهلاك وحجز الموازنة التقديرية الحقيقية لكل بند في موديول المالية (Finance Integration)
        for item in po.items.all():
            acc = ChartOfAccount.objects.get(id=item.budget_account_id, tenant_id=tenant_id)
            cc = CostCenter.objects.get(id=item.cost_center_id, tenant_id=tenant_id)
            
            # استهلاك الموازنة في موديول المالية
            # سيقوم برمي ValidationError تلقائياً في حال تجاوز الموازنة
            BudgetService.check_and_consume_budget(tenant_id, acc, cc, item.total_price)

        # 2. تحديث حالة أمر الشراء
        po.status = 'approved'
        po.save(update_fields=['status'])

        # 3. إرسال حدث للمنصة
        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='PurchaseOrderApproved',
            source_module='procurement',
            event_data={
                'po_id': str(po.id),
                'po_number': po.po_number,
                'total_amount': float(po.total_amount)
            }
        )

        return po

    @classmethod
    @transaction.atomic
    def post_vendor_invoice(cls, tenant_id, po_id, invoice_number, invoice_date=None, user_id=None):
        """
        تسجيل فاتورة المورّد وترحيل قيدها المحاسبي — آخر حلقة في دورة الشراء نحو المالية.

        يطابق نمط Odoo (Vendor Bill) و Dynamics 365 (Vendor invoice): أمر الشراء نفسه
        التزام (Encumbrance) ولا يُرحَّل، أما فاتورة المورّد فتُرحَّل في دفتر الأستاذ:
            من ح/ المصروف (حساب موازنة كل بند)      [مدين]
            إلى ح/ ذمم الموردين الدائنة              [دائن]
        """
        from apps.finance.domain.models import (
            JournalEntry, JournalEntryLine, Currency, FiscalYear,
        )
        from apps.finance.application.services import PostingService

        po = PurchaseOrder.objects.select_for_update().get(id=po_id, tenant_id=tenant_id)
        if po.status not in ('approved', 'issued'):
            raise ValidationError("يجب إصدار أمر الشراء واعتماده قبل تسجيل فاتورة المورّد.")
        if po.journal_entry_id:
            raise ValidationError("سبق ترحيل فاتورة هذا الأمر محاسبياً.")
        if not invoice_number:
            raise ValidationError("رقم فاتورة المورّد مطلوب.")

        settings = PurchaseSettings.objects.filter(tenant_id=tenant_id).first()
        payable_id = getattr(settings, 'payable_gl_account_id', None) if settings else None
        payable = None
        if payable_id:
            payable = ChartOfAccount.objects.filter(id=payable_id, tenant_id=tenant_id).first()
        if not payable:
            # الافتراضي المعقول: حساب ذمم الموردين الدائنة في شجرة الحسابات
            payable = ChartOfAccount.objects.filter(tenant_id=tenant_id, code='2101').first()
        if not payable:
            raise ValidationError(
                "لم يُحدَّد حساب ذمم الموردين الدائنة في إعدادات المشتريات ولا يوجد حساب برمز 2101."
            )

        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if not active_fy:
            raise ValidationError("لا توجد سنة مالية مفتوحة لترحيل الفاتورة.")
        period = active_fy.periods.filter(start_date__lte=date.today(), end_date__gte=date.today()).first()
        if not period:
            raise ValidationError("تاريخ اليوم لا يقع ضمن أي فترة محاسبية مفتوحة.")

        base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()

        journal = JournalEntry.objects.create(
            tenant_id=tenant_id,
            entry_number=f"JV-{po.po_number}",
            date=date.today(),
            accounting_period=period,
            description=f"إثبات فاتورة المورّد {po.vendor.name_ar} — أمر شراء {po.po_number}",
            source_type='automatic',
            status='draft',
            currency=base_currency,
            created_by=user_id,
        )

        total = Decimal('0.0')
        # سطور المصروف (مدين) — حساب الموازنة لكل بند مع مركز تكلفته
        for item in po.items.all():
            acc = ChartOfAccount.objects.get(id=item.budget_account_id, tenant_id=tenant_id)
            JournalEntryLine.objects.create(
                tenant_id=tenant_id,
                journal_entry=journal,
                account=acc,
                debit=item.total_price,
                credit=Decimal('0.0'),
                description=f"{item.item_name} — {po.po_number}",
            )
            total += Decimal(str(item.total_price))

        # سطر ذمم الموردين (دائن)
        JournalEntryLine.objects.create(
            tenant_id=tenant_id,
            journal_entry=journal,
            account=payable,
            debit=Decimal('0.0'),
            credit=total,
            description=f"ذمم المورّد {po.vendor.name_ar} — فاتورة {invoice_number}",
        )

        journal.status = 'approved'
        journal.save(update_fields=['status'])
        PostingService.post_journal_entry(tenant_id, journal.id, user_id)

        po.vendor_invoice_number = invoice_number
        po.vendor_invoice_date = invoice_date or date.today()
        po.journal_entry_id = journal.id
        po.status = 'completed'
        po.save(update_fields=['vendor_invoice_number', 'vendor_invoice_date', 'journal_entry_id', 'status'])

        EventBusConsumer.publish(
            tenant_id=tenant_id,
            event_type='VendorInvoicePosted',
            source_module='procurement',
            event_data={
                'po_id': str(po.id), 'po_number': po.po_number,
                'invoice_number': invoice_number, 'amount': float(total),
                'journal_entry_id': str(journal.id),
            },
        )
        return po
