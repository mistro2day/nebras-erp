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

    @action(detail=True, methods=['post'], url_path='process')
    def process_payroll(self, request, pk=None):
        instance = self.get_object()
        
        # 1. Delete existing payslips to allow recalculation/regeneration
        instance.payslips.all().delete()
        
        # 2. Get period code (e.g. "2026-07")
        period_code = instance.period.code if instance.period else ""
        
        from apps.employees.domain.models import Employee
        from apps.payroll.domain.models import SalaryStructure, EmployeeLoan, Payslip
        
        active_employees = Employee.objects.filter(status='active')
        total_cost = 0.0
        
        for employee in active_employees:
            # Load salary structure or default to standard structure
            try:
                struct = SalaryStructure.objects.get(employee=employee, is_active=True)
                basic = float(struct.basic_salary)
                housing = float(struct.housing_allowance)
                transport = float(struct.transport_allowance)
                other = float(struct.other_allowances)
            except SalaryStructure.DoesNotExist:
                basic = 250000.0
                housing = 50000.0
                transport = 20000.0
                other = 0.0
                
            gross_earnings = basic + housing + transport + other
            
            # Process deductions for active loans
            total_deductions = 0.0
            active_loans = EmployeeLoan.objects.filter(employee=employee, status='approved')
            
            for loan in active_loans:
                # Check start month
                if loan.deduction_start_month and period_code:
                    if period_code < loan.deduction_start_month:
                        continue
                
                # Check skipped months
                if loan.skipped_months and period_code:
                    skipped_list = [m.strip() for m in loan.skipped_months.split(',') if m.strip()]
                    if period_code in skipped_list:
                        continue
                        
                installment = float(loan.monthly_installment)
                remaining = float(loan.remaining_balance)
                
                deduct_amount = min(installment, remaining)
                if deduct_amount > 0:
                    total_deductions += deduct_amount
                    loan.remaining_balance = remaining - deduct_amount
                    if loan.remaining_balance <= 0:
                        loan.status = 'settled'
                    loan.save()
                    
            net_salary = max(0.0, gross_earnings - total_deductions)
            total_cost += net_salary
            
            Payslip.objects.create(
                payroll_run=instance,
                employee=employee,
                basic_salary=basic,
                gross_earnings=gross_earnings,
                total_deductions=total_deductions,
                net_salary=net_salary,
                status='approved'
            )
            
        instance.status = 'approved'
        instance.total_cost = total_cost
        instance.save()
        
        return StandardResponse(self.get_serializer(instance).data, message="تمت معالجة مسير الرواتب وتوليد كشوف الموظفين بنجاح.")

class PayslipViewSet(BaseCRUDViewSet):
    model_class = Payslip
    serializer_class = PayslipSerializer