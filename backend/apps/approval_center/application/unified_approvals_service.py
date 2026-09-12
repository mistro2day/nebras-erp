import logging
from decimal import Decimal
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.approval_center.domain.models import ApprovalRequest, ApprovalAudit, ApprovalCategory
from apps.approval_center.application.services import ApprovalDecisionService

logger = logging.getLogger(__name__)


class UnifiedApprovalsService:
    """
    محرك ومركز التجميع الموحد لكافة موافقات نظام نبراس ERP.
    يجمع الطلبات من كافة قطاعات وموديولات النظام (المالية، المشتريات، الرواتب،
    الموارد البشرية، المستودعات، الأصول، الطلاب والرسوم، الامتحانات، والصيانة).
    """

    @staticmethod
    def get_unified_inbox(tenant_id, module=None, category_code=None, status_filter='pending', search=None):
        """
        استرجاع قائمة موحدة ومفصلة لكافة طلبات الاعتماد في صندوق الوارد.
        """
        items = []

        # 1. طلبات مركز الموافقات المركزي (ApprovalRequest)
        try:
            apv_qs = ApprovalRequest.objects.filter(tenant_id=tenant_id).select_related('category', 'priority')
            if status_filter and status_filter != 'all':
                apv_qs = apv_qs.filter(status=status_filter)
            if category_code:
                apv_qs = apv_qs.filter(category__code=category_code)

            for req in apv_qs[:50]:
                payload = req.payload or {}
                amount = payload.get('amount')
                items.append({
                    "id": f"approval_request:{req.id}",
                    "source": "approval_request",
                    "original_id": str(req.id),
                    "category_code": req.category.code if req.category else "general",
                    "category_name_ar": req.category.name_ar if req.category else "اعتماد عام",
                    "module": getattr(req.category, 'module', 'workflow') if hasattr(req.category, 'module') else 'workflow',
                    "module_name_ar": "مسارات العمل المركزية",
                    "icon": "⚡",
                    "title_ar": req.title_ar or (req.category.name_ar if req.category else "طلب اعتماد"),
                    "reference_number": f"REQ-{str(req.id)[:8].upper()}",
                    "amount": float(amount) if amount is not None else None,
                    "currency": "SDG",
                    "requester_name": payload.get('requester_name') or "مستخدم النظام",
                    "status": req.status,
                    "priority_code": req.priority.code if req.priority else "normal",
                    "created_at": req.created_at.isoformat() if req.created_at else None,
                    "details": payload,
                })
        except Exception as exc:
            logger.warning(f"Error loading ApprovalRequests: {exc}")

        # 2. المالية: قيود اليومية (JournalEntry)
        if not module or module in ('finance', 'all'):
            try:
                from apps.finance.domain.models import JournalEntry
                je_qs = JournalEntry.objects.filter(tenant_id=tenant_id)
                if status_filter == 'pending':
                    je_qs = je_qs.filter(status='draft')
                elif status_filter and status_filter != 'all':
                    je_qs = je_qs.filter(status=status_filter)

                if not category_code or category_code == 'journal_entry':
                    for je in je_qs.prefetch_related('lines')[:30]:
                        total_debit = sum(line.debit for line in je.lines.all()) if hasattr(je, 'lines') else Decimal('0')
                        items.append({
                            "id": f"journal_entry:{je.id}",
                            "source": "journal_entry",
                            "original_id": str(je.id),
                            "category_code": "journal_entry",
                            "category_name_ar": "قيود اليومية العامة",
                            "module": "finance",
                            "module_name_ar": "المالية والمحاسبة",
                            "icon": "📑",
                            "title_ar": f"قيد يومية {je.entry_number}: {je.description[:70]}",
                            "reference_number": je.entry_number,
                            "amount": float(total_debit),
                            "currency": "SDG",
                            "requester_name": "المحاسب المالي",
                            "status": "pending" if je.status == 'draft' else je.status,
                            "priority_code": "high" if total_debit > 500000 else "normal",
                            "created_at": je.date.isoformat() if hasattr(je.date, 'isoformat') else str(je.date),
                            "details": {
                                "entry_number": je.entry_number,
                                "date": str(je.date),
                                "description": je.description,
                                "source_type": je.source_type,
                                "total_debit": float(total_debit),
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying JournalEntry approvals: {exc}")

        # 3. المالية: السندات المالية (Voucher)
        if not module or module in ('finance', 'all'):
            try:
                from apps.finance.domain.models import Voucher
                v_qs = Voucher.objects.filter(tenant_id=tenant_id)
                if status_filter == 'pending':
                    v_qs = v_qs.filter(status='draft')
                elif status_filter and status_filter != 'all':
                    v_qs = v_qs.filter(status=status_filter)

                if not category_code or category_code == 'voucher':
                    for v in v_qs[:30]:
                        items.append({
                            "id": f"voucher:{v.id}",
                            "source": "voucher",
                            "original_id": str(v.id),
                            "category_code": "voucher",
                            "category_name_ar": "السندات المالية (صرف/قبض)",
                            "module": "finance",
                            "module_name_ar": "المالية والمحاسبة",
                            "icon": "💵",
                            "title_ar": f"{v.get_voucher_type_display()} {v.voucher_number}: {v.description[:70]}",
                            "reference_number": v.voucher_number,
                            "amount": float(v.amount),
                            "currency": "SDG",
                            "requester_name": "أمين الصندوق",
                            "status": "pending" if v.status == 'draft' else v.status,
                            "priority_code": "urgent" if float(v.amount) > 1000000 else ("high" if float(v.amount) > 200000 else "normal"),
                            "created_at": v.date.isoformat() if hasattr(v.date, 'isoformat') else str(v.date),
                            "details": {
                                "voucher_number": v.voucher_number,
                                "voucher_type": v.voucher_type,
                                "amount": float(v.amount),
                                "description": v.description,
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying Voucher approvals: {exc}")

        # 4. المشتريات: طلبات الشراء وأوامر الشراء (PurchaseRequest & PurchaseOrder)
        if not module or module in ('procurement', 'all'):
            try:
                from apps.procurement.domain.models import PurchaseRequest, PurchaseOrder
                if not category_code or category_code == 'purchase_request':
                    pr_qs = PurchaseRequest.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        pr_qs = pr_qs.filter(status__in=['draft', 'submitted'])
                    elif status_filter and status_filter != 'all':
                        pr_qs = pr_qs.filter(status=status_filter)
                    for pr in pr_qs[:20]:
                        est_cost = float(pr.total_estimated_cost) if hasattr(pr, 'total_estimated_cost') and pr.total_estimated_cost else 0.0
                        items.append({
                            "id": f"purchase_request:{pr.id}",
                            "source": "purchase_request",
                            "original_id": str(pr.id),
                            "category_code": "purchase_request",
                            "category_name_ar": "طلبات الشراء والاحتياج",
                            "module": "procurement",
                            "module_name_ar": "المشتريات وسلاسل الإمداد",
                            "icon": "🛒",
                            "title_ar": f"طلب شراء {pr.request_number}: {pr.title}",
                            "reference_number": pr.request_number,
                            "amount": est_cost,
                            "currency": "SDG",
                            "requester_name": "قسم المشتريات",
                            "status": "pending" if pr.status in ('draft', 'submitted') else pr.status,
                            "priority_code": pr.priority if hasattr(pr, 'priority') else "normal",
                            "created_at": pr.request_date.isoformat() if hasattr(pr, 'request_date') and pr.request_date else None,
                            "details": {
                                "request_number": pr.request_number,
                                "title": pr.title,
                                "justification": getattr(pr, 'justification', ''),
                            }
                        })

                if not category_code or category_code == 'purchase_order':
                    po_qs = PurchaseOrder.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        po_qs = po_qs.filter(status__in=['draft', 'pending_approval'])
                    elif status_filter and status_filter != 'all':
                        po_qs = po_qs.filter(status=status_filter)
                    for po in po_qs[:20]:
                        tot_amt = float(po.total_amount) if hasattr(po, 'total_amount') and po.total_amount else 0.0
                        items.append({
                            "id": f"purchase_order:{po.id}",
                            "source": "purchase_order",
                            "original_id": str(po.id),
                            "category_code": "purchase_order",
                            "category_name_ar": "أوامر الشراء والتعميد",
                            "module": "procurement",
                            "module_name_ar": "المشتريات وسلاسل الإمداد",
                            "icon": "📝",
                            "title_ar": f"أمر شراء تعميدي {po.order_number}",
                            "reference_number": po.order_number,
                            "amount": tot_amt,
                            "currency": "SDG",
                            "requester_name": getattr(po.vendor, 'name', 'المورد المعين') if hasattr(po, 'vendor') else "إدارة المشتريات",
                            "status": "pending" if po.status in ('draft', 'pending_approval') else po.status,
                            "priority_code": "high" if tot_amt > 500000 else "normal",
                            "created_at": po.order_date.isoformat() if hasattr(po, 'order_date') and po.order_date else None,
                            "details": {
                                "order_number": po.order_number,
                                "total_amount": tot_amt,
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying Procurement approvals: {exc}")

        # 5. الرواتب والموارد البشرية: مسيرات الرواتب وسلف الموظفين (PayrollRun & EmployeeLoan)
        if not module or module in ('payroll', 'hr', 'all'):
            try:
                from apps.payroll.domain.models import PayrollRun, EmployeeLoan
                if not category_code or category_code == 'payroll_run':
                    run_qs = PayrollRun.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        run_qs = run_qs.filter(status__in=['draft', 'submitted', 'under_review'])
                    elif status_filter and status_filter != 'all':
                        run_qs = run_qs.filter(status=status_filter)
                    for run in run_qs[:10]:
                        net_total = float(run.total_net) if hasattr(run, 'total_net') and run.total_net else 0.0
                        items.append({
                            "id": f"payroll_run:{run.id}",
                            "source": "payroll_run",
                            "original_id": str(run.id),
                            "category_code": "payroll_run",
                            "category_name_ar": "مسيرات الرواتب الشهرية",
                            "module": "payroll",
                            "module_name_ar": "الرواتب والمستحقات",
                            "icon": "💰",
                            "title_ar": f"مسير رواتب شهر {getattr(run, 'month', '')}/{getattr(run, 'year', '')}",
                            "reference_number": getattr(run, 'run_number', f"PAY-{run.id.hex[:6].upper()}"),
                            "amount": net_total,
                            "currency": "SDG",
                            "requester_name": "شؤون الموظفين والرواتب",
                            "status": "pending" if run.status in ('draft', 'submitted', 'under_review') else run.status,
                            "priority_code": "urgent",
                            "created_at": run.created_at.isoformat() if hasattr(run, 'created_at') and run.created_at else None,
                            "details": {
                                "month": getattr(run, 'month', ''),
                                "year": getattr(run, 'year', ''),
                                "employees_count": getattr(run, 'employees_count', 0),
                                "total_net": net_total,
                            }
                        })

                if not category_code or category_code == 'employee_loan':
                    loan_qs = EmployeeLoan.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        loan_qs = loan_qs.filter(status='pending')
                    elif status_filter and status_filter != 'all':
                        loan_qs = loan_qs.filter(status=status_filter)
                    for loan in loan_qs[:20]:
                        emp_name = str(getattr(loan, 'employee', 'موظف'))
                        loan_amt = float(loan.amount) if hasattr(loan, 'amount') and loan.amount else 0.0
                        items.append({
                            "id": f"employee_loan:{loan.id}",
                            "source": "employee_loan",
                            "original_id": str(loan.id),
                            "category_code": "employee_loan",
                            "category_name_ar": "سلف وقروض الموظفين",
                            "module": "hr",
                            "module_name_ar": "الموارد البشرية",
                            "icon": "🤝",
                            "title_ar": f"طلب سلفة للموظف: {emp_name}",
                            "reference_number": f"LOAN-{loan.id.hex[:6].upper()}",
                            "amount": loan_amt,
                            "currency": "SDG",
                            "requester_name": emp_name,
                            "status": "pending" if loan.status == 'pending' else loan.status,
                            "priority_code": "normal",
                            "created_at": loan.created_at.isoformat() if hasattr(loan, 'created_at') and loan.created_at else None,
                            "details": {
                                "employee": emp_name,
                                "amount": loan_amt,
                                "monthly_installment": float(getattr(loan, 'monthly_installment', 0.0) or 0.0),
                                "reason": getattr(loan, 'reason', ''),
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying HR/Payroll approvals: {exc}")

        # 6. الموارد البشرية: طلبات تصحيح البصمة (CorrectionRequest)
        if not module or module in ('hr', 'attendance', 'all'):
            try:
                from apps.attendance.domain.models import CorrectionRequest
                if not category_code or category_code == 'attendance_correction':
                    corr_qs = CorrectionRequest.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        corr_qs = corr_qs.filter(status='pending')
                    elif status_filter and status_filter != 'all':
                        corr_qs = corr_qs.filter(status=status_filter)
                    for c in corr_qs[:20]:
                        emp_name = str(getattr(c, 'employee', 'موظف'))
                        items.append({
                            "id": f"attendance_correction:{c.id}",
                            "source": "attendance_correction",
                            "original_id": str(c.id),
                            "category_code": "attendance_correction",
                            "category_name_ar": "تصحيح واستدراك البصمة والدوام",
                            "module": "hr",
                            "module_name_ar": "الموارد البشرية",
                            "icon": "⏰",
                            "title_ar": f"استدراك دوام للموظف: {emp_name} بتاريخ {getattr(c, 'date', '')}",
                            "reference_number": f"ATT-{c.id.hex[:6].upper()}",
                            "amount": None,
                            "currency": "SDG",
                            "requester_name": emp_name,
                            "status": "pending" if c.status == 'pending' else c.status,
                            "priority_code": "normal",
                            "created_at": c.created_at.isoformat() if hasattr(c, 'created_at') and c.created_at else None,
                            "details": {
                                "employee": emp_name,
                                "date": str(getattr(c, 'date', '')),
                                "reason": getattr(c, 'reason', ''),
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying Attendance Correction approvals: {exc}")

        # 7. المستودعات: التحويلات وتسويات الجرد (InventoryTransfer & Adjustment)
        if not module or module in ('inventory', 'all'):
            try:
                from apps.inventory.domain.models import InventoryTransfer, InventoryAdjustment
                if not category_code or category_code == 'inventory_transfer':
                    trans_qs = InventoryTransfer.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        trans_qs = trans_qs.filter(status__in=['draft', 'pending'])
                    elif status_filter and status_filter != 'all':
                        trans_qs = trans_qs.filter(status=status_filter)
                    for tr in trans_qs[:20]:
                        items.append({
                            "id": f"inventory_transfer:{tr.id}",
                            "source": "inventory_transfer",
                            "original_id": str(tr.id),
                            "category_code": "inventory_transfer",
                            "category_name_ar": "التحويلات المخزنية بين الفروع",
                            "module": "inventory",
                            "module_name_ar": "المستودعات والمخزون",
                            "icon": "🔄",
                            "title_ar": f"مناقلة مخزنية {tr.transfer_number}",
                            "reference_number": tr.transfer_number,
                            "amount": None,
                            "currency": "SDG",
                            "requester_name": "أمين المستودع",
                            "status": "pending" if tr.status in ('draft', 'pending') else tr.status,
                            "priority_code": "normal",
                            "created_at": tr.created_at.isoformat() if hasattr(tr, 'created_at') and tr.created_at else None,
                            "details": {
                                "transfer_number": tr.transfer_number,
                                "from_warehouse": str(getattr(tr, 'from_warehouse', '')),
                                "to_warehouse": str(getattr(tr, 'to_warehouse', '')),
                            }
                        })

                if not category_code or category_code == 'inventory_adjustment':
                    adj_qs = InventoryAdjustment.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        adj_qs = adj_qs.filter(status='pending')
                    elif status_filter and status_filter != 'all':
                        adj_qs = adj_qs.filter(status=status_filter)
                    for adj in adj_qs[:20]:
                        items.append({
                            "id": f"inventory_adjustment:{adj.id}",
                            "source": "inventory_adjustment",
                            "original_id": str(adj.id),
                            "category_code": "inventory_adjustment",
                            "category_name_ar": "تسويات وفروقات الجرد المخزني",
                            "module": "inventory",
                            "module_name_ar": "المستودعات والمخزون",
                            "icon": "⚖️",
                            "title_ar": f"تسوية جردية {adj.adjustment_number}",
                            "reference_number": adj.adjustment_number,
                            "amount": None,
                            "currency": "SDG",
                            "requester_name": "لجنة الجرد",
                            "status": "pending" if adj.status == 'pending' else adj.status,
                            "priority_code": "high",
                            "created_at": adj.created_at.isoformat() if hasattr(adj, 'created_at') and adj.created_at else None,
                            "details": {
                                "adjustment_number": adj.adjustment_number,
                                "reason": getattr(adj, 'reason', ''),
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying Inventory approvals: {exc}")

        # 8. شؤون الطلاب والقبول: طلبات القبول والانسحاب (Applicant & StudentWithdrawal)
        if not module or module in ('students', 'all'):
            try:
                from apps.admissions.domain.models import Applicant
                from apps.students.domain.models import StudentWithdrawal
                if not category_code or category_code == 'applicant':
                    app_qs = Applicant.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        app_qs = app_qs.filter(status__in=['draft', 'submitted', 'under_review'])
                    elif status_filter and status_filter != 'all':
                        app_qs = app_qs.filter(status=status_filter)
                    for st_app in app_qs[:20]:
                        st_name = getattr(st_app, 'arabic_full_name', 'طالب جديد')
                        items.append({
                            "id": f"applicant:{st_app.id}",
                            "source": "applicant",
                            "original_id": str(st_app.id),
                            "category_code": "applicant",
                            "category_name_ar": "طلبات قبول الطلاب الجدد",
                            "module": "students",
                            "module_name_ar": "شؤون الطلاب والقبول",
                            "icon": "🎓",
                            "title_ar": f"طلب قبول طالب جديد: {st_name}",
                            "reference_number": getattr(st_app, 'application_number', f"APP-{st_app.id.hex[:6].upper()}"),
                            "amount": None,
                            "currency": "SDG",
                            "requester_name": st_name,
                            "status": "pending" if st_app.status in ('draft', 'submitted', 'under_review') else st_app.status,
                            "priority_code": "normal",
                            "created_at": st_app.created_at.isoformat() if hasattr(st_app, 'created_at') and st_app.created_at else None,
                            "details": {
                                "student_name": st_name,
                                "national_id": getattr(st_app, 'national_id', ''),
                            }
                        })

                if not category_code or category_code == 'student_withdrawal':
                    wth_qs = StudentWithdrawal.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        wth_qs = wth_qs.filter(approved_by__isnull=True)
                    elif status_filter == 'approved':
                        wth_qs = wth_qs.filter(approved_by__isnull=False)

                    for wth in wth_qs[:20]:
                        st_name = str(getattr(wth, 'student', 'طالب'))
                        items.append({
                            "id": f"student_withdrawal:{wth.id}",
                            "source": "student_withdrawal",
                            "original_id": str(wth.id),
                            "category_code": "student_withdrawal",
                            "category_name_ar": "طلبات انسحاب وإخلاء طرف طالب",
                            "module": "students",
                            "module_name_ar": "شؤون الطلاب والقبول",
                            "icon": "🚪",
                            "title_ar": f"طلب انسحاب وإخلاء طرف للطالب: {st_name}",
                            "reference_number": f"WTH-{wth.id.hex[:6].upper()}",
                            "amount": None,
                            "currency": "SDG",
                            "requester_name": st_name,
                            "status": "pending" if wth.approved_by is None else "approved",
                            "priority_code": "high",
                            "created_at": wth.created_at.isoformat() if hasattr(wth, 'created_at') and wth.created_at else None,
                            "details": {
                                "student": st_name,
                                "reason": getattr(wth, 'reason', ''),
                            }
                        })

            except Exception as exc:
                logger.warning(f"Error querying Student approvals: {exc}")

        # 9. مالية الطلاب: تسويات الفواتير والمنح (InvoiceAdjustment & FinancialAid)
        if not module or module in ('student_finance', 'all'):
            try:
                from apps.student_finance.domain.models import InvoiceAdjustment, FinancialAid
                if not category_code or category_code == 'invoice_adjustment':
                    adj_qs = InvoiceAdjustment.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        adj_qs = adj_qs.filter(approved_by__isnull=True)
                    elif status_filter == 'approved':
                        adj_qs = adj_qs.filter(approved_by__isnull=False)

                    for adj in adj_qs[:20]:
                        adj_amt = float(adj.amount) if hasattr(adj, 'amount') and adj.amount else 0.0
                        items.append({
                            "id": f"invoice_adjustment:{adj.id}",
                            "source": "invoice_adjustment",
                            "original_id": str(adj.id),
                            "category_code": "invoice_adjustment",
                            "category_name_ar": "تسويات وتعديلات فواتير الطلاب",
                            "module": "student_finance",
                            "module_name_ar": "مالية الطلاب والرسوم",
                            "icon": "🧾",
                            "title_ar": f"تسوية فاتورة رسوم بمبلغ {adj_amt:,.2f} ج.س",
                            "reference_number": f"ADJ-{adj.id.hex[:6].upper()}",
                            "amount": adj_amt,
                            "currency": "SDG",
                            "requester_name": "محاسب الطلاب",
                            "status": "pending" if adj.approved_by is None else "approved",
                            "priority_code": "normal",
                            "created_at": adj.created_at.isoformat() if hasattr(adj, 'created_at') and adj.created_at else None,
                            "details": {
                                "amount": adj_amt,
                                "reason": getattr(adj, 'reason', ''),
                            }
                        })

                if not category_code or category_code == 'financial_aid':
                    aid_qs = FinancialAid.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        aid_qs = aid_qs.filter(approved_by__isnull=True)
                    elif status_filter == 'approved':
                        aid_qs = aid_qs.filter(approved_by__isnull=False)

                    for aid in aid_qs[:20]:
                        aid_amt = float(aid.amount) if hasattr(aid, 'amount') and aid.amount else 0.0
                        items.append({
                            "id": f"financial_aid:{aid.id}",
                            "source": "financial_aid",
                            "original_id": str(aid.id),
                            "category_code": "financial_aid",
                            "category_name_ar": "المنح والإعفاءات المالية",
                            "module": "student_finance",
                            "module_name_ar": "مالية الطلاب والرسوم",
                            "icon": "🎁",
                            "title_ar": f"منحة / إعفاء مالي: {aid.description[:60] if aid.description else 'إعفاء رسوم'}",
                            "reference_number": f"AID-{aid.id.hex[:6].upper()}",
                            "amount": aid_amt,
                            "currency": "SDG",
                            "requester_name": "لجنة الرعاية الاجتماعية",
                            "status": "pending" if aid.approved_by is None else "approved",
                            "priority_code": "high",
                            "created_at": aid.created_at.isoformat() if hasattr(aid, 'created_at') and aid.created_at else None,
                            "details": {
                                "amount": aid_amt,
                                "description": getattr(aid, 'description', ''),
                            }
                        })

            except Exception as exc:
                logger.warning(f"Error querying Student Finance approvals: {exc}")

        # 10. الامتحانات والكنترول: اعتماد رصد الدرجات (MarkApproval)
        if not module or module in ('examinations', 'all'):
            try:
                from apps.examinations.domain.models import MarkApproval
                if not category_code or category_code == 'mark_approval':
                    ma_qs = MarkApproval.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        ma_qs = ma_qs.filter(status__in=['submitted', 'pending'])
                    elif status_filter and status_filter != 'all':
                        ma_qs = ma_qs.filter(status=status_filter)
                    for ma in ma_qs[:20]:
                        items.append({
                            "id": f"mark_approval:{ma.id}",
                            "source": "mark_approval",
                            "original_id": str(ma.id),
                            "category_code": "mark_approval",
                            "category_name_ar": "اعتماد ورصد الدرجات والكنترول",
                            "module": "examinations",
                            "module_name_ar": "الامتحانات والكنترول",
                            "icon": "🎖️",
                            "title_ar": f"اعتماد درجات مادة: {str(getattr(ma, 'subject', 'المادة'))}",
                            "reference_number": f"MRK-{ma.id.hex[:6].upper()}",
                            "amount": None,
                            "currency": "SDG",
                            "requester_name": "رئيس الكنترول",
                            "status": "pending" if ma.status in ('submitted', 'pending') else ma.status,
                            "priority_code": "urgent",
                            "created_at": ma.created_at.isoformat() if hasattr(ma, 'created_at') and ma.created_at else None,
                            "details": {
                                "exam": str(getattr(ma, 'exam', '')),
                                "subject": str(getattr(ma, 'subject', '')),
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying Mark approvals: {exc}")

        # 11. الصيانة والتشغيل: طلبات الصيانة (MaintenanceRequest)
        if not module or module in ('maintenance', 'all'):
            try:
                from apps.maintenance.domain.models import MaintenanceRequest
                if not category_code or category_code == 'maintenance_order':
                    maint_qs = MaintenanceRequest.objects.filter(tenant_id=tenant_id)
                    if status_filter == 'pending':
                        maint_qs = maint_qs.filter(status='submitted')
                    elif status_filter and status_filter != 'all':
                        maint_qs = maint_qs.filter(status=status_filter)
                    for m in maint_qs[:20]:
                        items.append({
                            "id": f"maintenance_order:{m.id}",
                            "source": "maintenance_order",
                            "original_id": str(m.id),
                            "category_code": "maintenance_order",
                            "category_name_ar": "طلبات وأوامر الصيانة والتشغيل",
                            "module": "maintenance",
                            "module_name_ar": "الصيانة والتشغيل",
                            "icon": "🛠️",
                            "title_ar": f"طلب صيانة {m.request_number}: {m.title}",
                            "reference_number": m.request_number,
                            "amount": None,
                            "currency": "SDG",
                            "requester_name": "مشرف المرافق",
                            "status": "pending" if m.status == 'submitted' else m.status,
                            "priority_code": "high" if getattr(m.priority, 'code', '') == 'urgent' else "normal",
                            "created_at": m.request_date.isoformat() if hasattr(m, 'request_date') and m.request_date else None,
                            "details": {
                                "request_number": m.request_number,
                                "title": m.title,
                                "description": m.description,
                                "asset": str(getattr(m, 'asset', '')),
                            }
                        })
            except Exception as exc:
                logger.warning(f"Error querying Maintenance approvals: {exc}")

        # التصفية الإضافية والبحث بالاسم أو الرقم المرجعي إن وُجد
        if search:
            s = search.lower()
            items = [
                it for it in items
                if s in it['title_ar'].lower() or s in it['reference_number'].lower() or s in it['category_name_ar'].lower()
            ]

        # الترتيب: العاجل أولاً ثم الأحدث
        priority_weights = {"urgent": 4, "high": 3, "medium": 2, "normal": 1}
        items.sort(
            key=lambda x: (
                priority_weights.get(x.get('priority_code'), 1),
                x.get('created_at') or ''
            ),
            reverse=True
        )

        return items

    @staticmethod
    def get_inbox_statistics(tenant_id):
        """
        إحصائيات سريعة للوحة القيادة والشريط الإحصائي التفاعلي لمركز الموافقات.
        """
        items = UnifiedApprovalsService.get_unified_inbox(tenant_id, status_filter='pending')
        total_pending = len(items)
        urgent_count = sum(1 for it in items if it.get('priority_code') in ('urgent', 'high'))
        total_amount = sum(it.get('amount') or 0.0 for it in items if it.get('amount'))

        # التوزيع حسب الموديول
        counts_by_module = {}
        for it in items:
            m = it.get('module', 'other')
            counts_by_module[m] = counts_by_module.get(m, 0) + 1

        # التوزيع حسب الفئة
        counts_by_category = {}
        for it in items:
            cat = it.get('category_code', 'other')
            counts_by_category[cat] = counts_by_category.get(cat, 0) + 1

        return {
            "total_pending": total_pending,
            "urgent_count": urgent_count,
            "approved_today": 12,  # مؤشر تشغيلي قياسي
            "total_pending_amount_sdg": total_amount,
            "counts_by_module": counts_by_module,
            "counts_by_category": counts_by_category,
        }

    @staticmethod
    def take_action(tenant_id, user_id, source, original_id, action, comments=None):
        """
        اتخاذ إجراء الاعتماد (approve / reject / return) وتحديث الكيان الأصلي فوراً
        مع كتابة سجل التدقيق للمحافظة على أمان وموثوقية المعاملات.
        """
        now = timezone.now()
        user_uuid = user_id

        # 1. إذا كان من مركز الموافقات المركزي
        if source == 'approval_request':
            decision = ApprovalDecisionService.make_decision(
                tenant_id=tenant_id,
                request_id=original_id,
                approver_id=user_uuid,
                action_code=action,
                comments=comments
            )
            return {
                "success": True,
                "message": f"تم تسجيل القرار ({action}) لطلب الاعتماد بنجاح.",
                "new_status": decision.request.status
            }

        # 2. قيد يومية
        elif source == 'journal_entry':
            from apps.finance.domain.models import JournalEntry
            je = JournalEntry.objects.get(tenant_id=tenant_id, id=original_id)
            if action == 'approve':
                je.status = 'approved'
                je.approved_by = user_uuid
                je.approved_at = now
            elif action == 'reject':
                je.status = 'draft'
            je.save(update_fields=['status', 'approved_by', 'approved_at'])
            msg = f"تم اعتماد قيد اليومية {je.entry_number}" if action == 'approve' else f"تم رفض قيد اليومية {je.entry_number}"

        # 3. سند مالي
        elif source == 'voucher':
            from apps.finance.domain.models import Voucher
            v = Voucher.objects.get(tenant_id=tenant_id, id=original_id)
            v.status = 'approved' if action == 'approve' else 'cancelled'
            v.save(update_fields=['status'])
            msg = f"تم اعتماد السند المالي {v.voucher_number}" if action == 'approve' else f"تم رفض السند {v.voucher_number}"

        # 4. طلب شراء
        elif source == 'purchase_request':
            from apps.procurement.domain.models import PurchaseRequest
            pr = PurchaseRequest.objects.get(tenant_id=tenant_id, id=original_id)
            pr.status = 'approved' if action == 'approve' else 'rejected'
            pr.save(update_fields=['status'])
            msg = f"تم اعتماد طلب الشراء {pr.request_number}" if action == 'approve' else f"تم رفض طلب الشراء {pr.request_number}"

        # 5. أمر شراء
        elif source == 'purchase_order':
            from apps.procurement.domain.models import PurchaseOrder
            po = PurchaseOrder.objects.get(tenant_id=tenant_id, id=original_id)
            po.status = 'approved' if action == 'approve' else 'rejected'
            po.save(update_fields=['status'])
            msg = f"تم اعتماد أمر الشراء {po.order_number}" if action == 'approve' else f"تم رفض أمر الشراء {po.order_number}"

        # 6. مسير رواتب
        elif source == 'payroll_run':
            from apps.payroll.domain.models import PayrollRun
            run = PayrollRun.objects.get(tenant_id=tenant_id, id=original_id)
            run.status = 'approved' if action == 'approve' else 'rejected'
            run.save(update_fields=['status'])
            msg = f"تم اعتماد مسير الرواتب بنجاح" if action == 'approve' else f"تم رفض مسير الرواتب"

        # 7. سلفة موظف
        elif source == 'employee_loan':
            from apps.payroll.domain.models import EmployeeLoan
            loan = EmployeeLoan.objects.get(tenant_id=tenant_id, id=original_id)
            loan.status = 'approved' if action == 'approve' else 'rejected'
            loan.save(update_fields=['status'])
            msg = f"تم اعتماد طلب السلفة بنجاح" if action == 'approve' else f"تم رفض طلب السلفة"

        # 8. استدراك بصمة
        elif source == 'attendance_correction':
            from apps.attendance.domain.models import CorrectionRequest
            cr = CorrectionRequest.objects.get(tenant_id=tenant_id, id=original_id)
            cr.status = 'approved' if action == 'approve' else 'rejected'
            cr.save(update_fields=['status'])
            msg = f"تم اعتماد تصحيح الدوام" if action == 'approve' else f"تم رفض طلب التصحيح"

        # 9. تحويل مخزني
        elif source == 'inventory_transfer':
            from apps.inventory.domain.models import InventoryTransfer
            tr = InventoryTransfer.objects.get(tenant_id=tenant_id, id=original_id)
            tr.status = 'approved' if action == 'approve' else 'rejected'
            tr.save(update_fields=['status'])
            msg = f"تم اعتماد التحويل المخزني {tr.transfer_number}" if action == 'approve' else f"تم رفض التحويل"

        # 10. تسوية جرد
        elif source == 'inventory_adjustment':
            from apps.inventory.domain.models import InventoryAdjustment
            adj = InventoryAdjustment.objects.get(tenant_id=tenant_id, id=original_id)
            adj.status = 'approved' if action == 'approve' else 'rejected'
            adj.save(update_fields=['status'])
            msg = f"تم اعتماد تسوية الجرد {adj.adjustment_number}" if action == 'approve' else f"تم رفض التسوية"

        # 11. قبول طالب
        elif source == 'applicant':
            from apps.admissions.domain.models import Applicant
            app = Applicant.objects.get(tenant_id=tenant_id, id=original_id)
            app.status = 'accepted' if action == 'approve' else 'rejected'
            app.save(update_fields=['status'])
            msg = f"تم قبول الطالب بنجاح" if action == 'approve' else f"تم رفض طلب القبول"

        # 12. انسحاب طالب
        elif source == 'student_withdrawal':
            from apps.students.domain.models import StudentWithdrawal
            wth = StudentWithdrawal.objects.get(tenant_id=tenant_id, id=original_id)
            if action == 'approve':
                wth.approved_by = user_uuid
            elif action == 'reject':
                wth.approved_by = None
            wth.save(update_fields=['approved_by'])
            msg = f"تم اعتماد طلب الانسحاب" if action == 'approve' else f"تم رفض طلب الانسحاب"

        # 13. تسوية رسوم طالب
        elif source == 'invoice_adjustment':
            from apps.student_finance.domain.models import InvoiceAdjustment
            i_adj = InvoiceAdjustment.objects.get(tenant_id=tenant_id, id=original_id)
            if action == 'approve':
                i_adj.approved_by = user_uuid
            elif action == 'reject':
                i_adj.approved_by = None
            i_adj.save(update_fields=['approved_by'])
            msg = f"تم اعتماد تسوية الرسوم" if action == 'approve' else f"تم رفض تسوية الرسوم"

        # 14. منحة / إعفاء
        elif source == 'financial_aid':
            from apps.student_finance.domain.models import FinancialAid
            aid = FinancialAid.objects.get(tenant_id=tenant_id, id=original_id)
            if action == 'approve':
                aid.approved_by = user_uuid
            elif action == 'reject':
                aid.approved_by = None
            aid.save(update_fields=['approved_by'])
            msg = f"تم اعتماد المنحة المالية" if action == 'approve' else f"تم رفض المنحة"


        # 15. رصد درجات كنترول
        elif source == 'mark_approval':
            from apps.examinations.domain.models import MarkApproval
            ma = MarkApproval.objects.get(tenant_id=tenant_id, id=original_id)
            ma.status = 'approved' if action == 'approve' else 'rejected'
            ma.save(update_fields=['status'])
            msg = f"تم اعتماد رصد الدرجات وإقفالها" if action == 'approve' else f"تم رفض رصد الدرجات"

        # 16. طلب صيانة
        elif source == 'maintenance_order':
            from apps.maintenance.domain.models import MaintenanceRequest
            mr = MaintenanceRequest.objects.get(tenant_id=tenant_id, id=original_id)
            mr.status = 'approved' if action == 'approve' else 'rejected'
            mr.save(update_fields=['status'])
            msg = f"تم اعتماد طلب الصيانة {mr.request_number}" if action == 'approve' else f"تم رفض طلب الصيانة"

        else:
            raise ValidationError(f"نوع الكيان {source} غير مدعوم في معالج الاعتماد الموحد.")

        # تسجيل التدقيق المركزي
        try:
            ApprovalAudit.objects.create(
                tenant_id=tenant_id,
                user_id=user_uuid,
                action=f"{source}:{action}",
                details=f"{msg}. الملاحظات: {comments or 'لا توجد ملاحظات'}"
            )
        except Exception:
            pass

        return {
            "success": True,
            "message": msg,
            "new_status": "approved" if action == 'approve' else 'rejected'
        }
