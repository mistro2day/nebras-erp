from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from apps.common.responses import StandardResponse
from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.payroll.domain.models import SalaryStructure, EmployeeLoan, PayrollPeriod, PayrollRun, Payslip
from apps.payroll.interfaces.serializers import (
    SalaryStructureSerializer, EmployeeLoanSerializer, PayrollPeriodSerializer,
    PayrollRunSerializer, PayslipSerializer
)

class SalaryStructureViewSet(BaseCRUDViewSet):
    model_class = SalaryStructure
    serializer_class = SalaryStructureSerializer

class EmployeeLoanViewSet(BaseCRUDViewSet):
    model_class = EmployeeLoan
    serializer_class = EmployeeLoanSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_status = instance.status
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(updated_by=request.user.id if request.user else None)
        
        # Automatically generate Finance records when loan is approved
        if old_status != 'approved' and instance.status == 'approved':
            try:
                from django.utils import timezone
                from apps.finance.domain.models import (
                    Voucher, JournalEntry, JournalEntryLine, Currency, 
                    PaymentMethod, AccountingPeriod, ChartOfAccount
                )
                
                tenant_id = instance.tenant_id
                
                currency = Currency.objects.filter(tenant_id=tenant_id).first() or Currency.objects.first()
                pay_method = PaymentMethod.objects.filter(tenant_id=tenant_id).first() or PaymentMethod.objects.first()
                period = AccountingPeriod.objects.filter(tenant_id=tenant_id, status='open').first() or AccountingPeriod.objects.first()
                
                receivable_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='12').first()
                if not receivable_acc:
                    receivable_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id).first() or ChartOfAccount.objects.first()
                    
                cash_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='11').first()
                if not cash_acc:
                    cash_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id).first() or ChartOfAccount.objects.first()
                
                import random
                rand_suffix = str(random.randint(1000, 9999))
                v_num = f"PV-LOAN-{instance.id.hex[:6].upper()}-{rand_suffix}"
                je_num = f"JE-LOAN-{instance.id.hex[:6].upper()}-{rand_suffix}"
                
                if period and currency and receivable_acc and cash_acc:
                    # 1. Create Journal Entry
                    je = JournalEntry.objects.create(
                        tenant_id=tenant_id,
                        entry_number=je_num,
                        date=timezone.now().date(),
                        accounting_period=period,
                        description=f"قيد صرف سلفة للموظف: {instance.employee.full_name_ar}",
                        source_type='automatic',
                        status='posted',
                        currency=currency
                    )
                    
                    # Debit Line
                    JournalEntryLine.objects.create(
                        tenant_id=tenant_id,
                        journal_entry=je,
                        account=receivable_acc,
                        debit=instance.loan_amount,
                        debit_base=instance.loan_amount,
                        description=f"سلفة مستحقة على الموظف: {instance.employee.full_name_ar}"
                    )
                    
                    # Credit Line
                    JournalEntryLine.objects.create(
                        tenant_id=tenant_id,
                        journal_entry=je,
                        account=cash_acc,
                        credit=instance.loan_amount,
                        credit_base=instance.loan_amount,
                        description=f"صرف سلفة للموظف من الخزينة: {instance.employee.full_name_ar}"
                    )
                    
                    # 2. Create Payment Voucher (سند صرف)
                    Voucher.objects.create(
                        tenant_id=tenant_id,
                        voucher_number=v_num,
                        voucher_type='payment',
                        date=timezone.now().date(),
                        amount=instance.loan_amount,
                        currency=currency,
                        payment_method=pay_method,
                        gl_account=receivable_acc,
                        status='posted',
                        description=f"سند صرف سلفة للموظف: {instance.employee.full_name_ar}",
                        journal_entry=je
                    )
            except Exception:
                pass
                
        return StandardResponse(
            data=self.get_serializer(instance).data,
            message="تم اعتماد السلفة وتوليد القيود المالية بنجاح."
        )

class PayrollPeriodViewSet(BaseCRUDViewSet):
    model_class = PayrollPeriod
    serializer_class = PayrollPeriodSerializer

class PayrollRunViewSet(BaseCRUDViewSet):
    model_class = PayrollRun
    serializer_class = PayrollRunSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_status = instance.status
        
        # Block modifying the payroll run details or payslips if it's already sent for review/approval or closed
        # Allow transition status modifications (like submitting for approval or confirming payment)
        new_status = request.data.get('status', old_status)
        
        # If trying to update data (not just changing status) and current status is not draft, raise validation error
        if old_status in ('review', 'approved', 'paid') and request.data.get('payslips') is not None:
            raise ValidationError("لا يمكن تعديل البيانات المالية لمسير رواتب قيد المراجعة أو معتمد أو تم صرفه.")
            
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save(updated_by=request.user.id if request.user else None)
        
        # Check if transitioned to approved or paid
        if old_status not in ('approved', 'paid') and instance.status in ('approved', 'paid'):
            self._generate_payroll_finance_records(instance)
            
        return StandardResponse(self.get_serializer(instance).data)

    def _sync_approval_status(self, instance):
        if instance.status == 'review' and instance.approval_request_id:
            try:
                from apps.approval_center.domain.models import ApprovalRequest
                req = ApprovalRequest.objects.get(id=instance.approval_request_id)
                if req.status == 'approved':
                    next_step = instance.current_approval_step + 1
                    if next_step >= len(instance.approvers_chain):
                        # Final approval step completed!
                        instance.status = 'approved'
                        instance.save()
                        self._generate_payroll_finance_records(instance)
                    else:
                        # Advance step in chain
                        instance.current_approval_step = next_step
                        instance.save()
                        
                        # Reassign/sync request to the next user in the chain
                        from apps.approval_center.application.services import EnterpriseInboxService
                        EnterpriseInboxService.sync_inbox_item(instance.tenant_id, req, instance.approvers_chain[next_step])
                elif req.status == 'rejected':
                    instance.status = 'draft'
                    instance.save()
            except Exception:
                pass

    def _generate_payroll_finance_records(self, instance):
        try:
            from django.utils import timezone
            from apps.finance.domain.models import (
                Voucher, JournalEntry, JournalEntryLine, Currency, 
                PaymentMethod, AccountingPeriod, ChartOfAccount
            )
            
            tenant_id = instance.tenant_id
            period_code = instance.period.code if instance.period else ""
            
            # Prevent double posting
            if Voucher.objects.filter(tenant_id=tenant_id, voucher_number__startswith=f"PV-PAY-{instance.id.hex[:6].upper()}").exists():
                return
            
            currency = Currency.objects.filter(tenant_id=tenant_id).first() or Currency.objects.first()
            pay_method = PaymentMethod.objects.filter(tenant_id=tenant_id).first() or PaymentMethod.objects.first()
            period = AccountingPeriod.objects.filter(tenant_id=tenant_id, status='open').first() or AccountingPeriod.objects.first()
            
            expense_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='5').first()
            if not expense_acc:
                expense_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id).first() or ChartOfAccount.objects.first()
                
            cash_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='11').first()
            if not cash_acc:
                cash_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id).first() or ChartOfAccount.objects.first()
            
            import random
            rand_suffix = str(random.randint(1000, 9999))
            v_num = f"PV-PAY-{instance.id.hex[:6].upper()}-{rand_suffix}"
            je_num = f"JE-PAY-{instance.id.hex[:6].upper()}-{rand_suffix}"
            
            if period and currency and expense_acc and cash_acc:
                # 1. Create Journal Entry
                je = JournalEntry.objects.create(
                    tenant_id=tenant_id,
                    entry_number=je_num,
                    date=timezone.now().date(),
                    accounting_period=period,
                    description=f"قيد استحقاق وصرف رواتب الموظفين لشهر: {period_code}",
                    source_type='automatic',
                    status='posted',
                    currency=currency
                )
                
                JournalEntryLine.objects.create(
                    tenant_id=tenant_id,
                    journal_entry=je,
                    account=expense_acc,
                    debit=instance.total_cost,
                    debit_base=instance.total_cost,
                    description=f"مصروفات رواتب الموظفين لشهر: {period_code}"
                )
                
                JournalEntryLine.objects.create(
                    tenant_id=tenant_id,
                    journal_entry=je,
                    account=cash_acc,
                    credit=instance.total_cost,
                    credit_base=instance.total_cost,
                    description=f"صرف رواتب كشف شهر: {period_code}"
                )
                
                # 2. Create Payment Voucher (سند صرف)
                Voucher.objects.create(
                    tenant_id=tenant_id,
                    voucher_number=v_num,
                    voucher_type='payment',
                    date=timezone.now().date(),
                    amount=instance.total_cost,
                    currency=currency,
                    payment_method=pay_method,
                    gl_account=expense_acc,
                    status='posted',
                    description=f"سند صرف رواتب الموظفين لشهر: {period_code}",
                    journal_entry=je
                )
        except Exception:
            pass

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._sync_approval_status(instance)
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return StandardResponse(serializer.data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        for instance in queryset:
            self._sync_approval_status(instance)
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return StandardResponse(serializer.data)

    @action(detail=True, methods=['post'], url_path='submit-for-approval')
    def submit_for_approval(self, request, pk=None):
        instance = self.get_object()
        approvers = request.data.get('approvers', [])
        if not approvers:
            return Response({"detail": "يجب تحديد مسؤول واحد على الأقل للموافقة."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Calculate/process first to make sure values are correct
        self.process_payroll_logic(instance)
        
        instance.status = 'review'
        instance.approvers_chain = approvers
        instance.current_approval_step = 0
        
        # Resolve category
        from apps.approval_center.domain.models import ApprovalCategory
        category, _ = ApprovalCategory.objects.get_or_create(
            code='payroll_run',
            defaults={
                'name_ar': 'اعتماد مسير الرواتب',
                'name_en': 'Payroll Run Approval',
                'tenant_id': instance.tenant_id
            }
        )
        
        # Build payload
        line_items = []
        for slip in instance.payslips.all():
            line_items.append({
                "name": slip.employee.full_name_ar if slip.employee else "موظف نبراس",
                "qty": f"أساسي: {slip.basic_salary}",
                "unit_price": f"خصم سلفة: {slip.total_deductions}",
                "total": f"صافي: {slip.net_salary} ج.س"
            })
            
        period_code = instance.period.code if instance.period else "غير محدد"
        payload = {
            "شهر المسير": period_code,
            "التكلفة الإجمالية": f"{instance.total_cost} ج.س",
            "عدد الموظفين": f"{instance.payslips.count()} موظف",
            "line_items": line_items
        }
        
        from apps.approval_center.application.services import ApprovalRequestService
        req = ApprovalRequestService.create_request(
            tenant_id=instance.tenant_id,
            category_id=category.id,
            requester_id=request.user.id if request.user else instance.created_by,
            title_ar=f"اعتماد مسير الرواتب لشهر: {period_code}",
            title_en=f"Payroll Run Approval: {period_code}",
            payload=payload,
            priority_code='HIGH',
            assignee_id=approvers[0],
            user_id=request.user.id if request.user else None
        )
        
        instance.approval_request_id = req.id
        instance.save()
        return StandardResponse(self.get_serializer(instance).data, message="تم تقديم مسير الرواتب للموافقة بنجاح.")

    def process_payroll_logic(self, instance, preview_only=False):
        """
        احتساب كشوف الرواتب لجميع الموظفين النشطين.
        preview_only=True: يُنشئ الكشوف لعرضها فقط بدون خصم السلف من أرصدتها.
        """
        instance.payslips.all().delete()
        period_code = instance.period.code if instance.period else ""
        tenant_id = instance.tenant_id
        from apps.employees.domain.models import Employee
        from apps.payroll.domain.models import SalaryStructure, EmployeeLoan, Payslip
        
        # تصفية الموظفين حسب المستأجر والحالة النشطة
        emp_qs = Employee.objects.filter(status='active', deleted_at__isnull=True)
        if tenant_id:
            emp_qs = emp_qs.filter(tenant_id=tenant_id)
        
        total_cost = 0.0
        
        for employee in emp_qs:
            try:
                struct = SalaryStructure.objects.get(employee=employee, is_active=True)
                basic = float(struct.basic_salary)
                housing = float(struct.housing_allowance)
                transport = float(struct.transport_allowance)
                other = float(struct.other_allowances)
            except SalaryStructure.DoesNotExist:
                # إذا لم يكن هناك هيكل رواتب معرف — تخطي الموظف بدلاً من استخدام قيم افتراضية
                continue
                
            gross_earnings = basic + housing + transport + other
            total_deductions = 0.0
            
            # احتساب دقائق التأخير الفعلي لشهر المسير
            from apps.attendance.domain.models import AttendanceRecord
            late_deduction = 0.0
            late_minutes_total = 0
            if period_code:
                try:
                    # استخراج السنة والشهر من كود المسير مثل '2026-06'
                    year_part, month_part = map(int, period_code.split('-'))
                    records = AttendanceRecord.objects.filter(employee=employee, date__year=year_part, date__month=month_part)
                    late_minutes_total = sum(rec.late_minutes for rec in records if rec.late_minutes)
                    
                    if late_minutes_total > 0:
                        # احتساب خصم الدقيقة = (الراتب الأساسي / 30 يوم عمل / 8 ساعات عمل يومياً / 60 دقيقة)
                        minute_rate = (basic / 30.0 / 8.0 / 60.0)
                        late_deduction = round(late_minutes_total * minute_rate, 2)
                        total_deductions += late_deduction
                except Exception:
                    pass

            loan_qs = EmployeeLoan.objects.filter(employee=employee, status='approved')
            if tenant_id:
                loan_qs = loan_qs.filter(tenant_id=tenant_id)
            
            for loan in loan_qs:
                if loan.deduction_start_month and period_code:
                    if period_code < loan.deduction_start_month:
                        continue
                if loan.skipped_months and period_code:
                    skipped_list = [m.strip() for m in loan.skipped_months.split(',') if m.strip()]
                    if period_code in skipped_list:
                        continue
                        
                installment = float(loan.monthly_installment)
                remaining = float(loan.remaining_balance)
                deduct_amount = min(installment, remaining)
                if deduct_amount > 0:
                    total_deductions += deduct_amount
                    if not preview_only:
                        loan.remaining_balance = remaining - deduct_amount
                        if loan.remaining_balance <= 0:
                            loan.status = 'settled'
                        loan.save()
                    
            net_salary = max(0.0, gross_earnings - total_deductions)
            total_cost += net_salary
            
            Payslip.objects.create(
                tenant_id=tenant_id,
                payroll_run=instance,
                employee=employee,
                basic_salary=basic,
                gross_earnings=gross_earnings,
                total_deductions=total_deductions,
                late_minutes=late_minutes_total,
                late_deduction=late_deduction,
                net_salary=net_salary,
                status='draft' if preview_only else 'approved'
            )
            
        instance.total_cost = total_cost
        instance.save()

    @action(detail=True, methods=['post'], url_path='preview')
    def preview_payroll(self, request, pk=None):
        """
        معاينة كشوف الرواتب بدون خصم السلف فعلياً (للمسودات).
        """
        instance = self.get_object()
        if instance.payslips.count() == 0:
            self.process_payroll_logic(instance, preview_only=True)
        return StandardResponse(self.get_serializer(instance).data, message="تمت معاينة كشوف الرواتب بنجاح.")

    @action(detail=True, methods=['post'], url_path='process')
    def process_payroll(self, request, pk=None):
        instance = self.get_object()
        self.process_payroll_logic(instance, preview_only=False)
        instance.status = 'approved'
        instance.save()
        self._generate_payroll_finance_records(instance)
        return StandardResponse(self.get_serializer(instance).data, message="تمت معالجة مسير الرواتب وتوليد كشوف الموظفين بنجاح.")

class PayslipViewSet(BaseCRUDViewSet):
    model_class = Payslip
    serializer_class = PayslipSerializer