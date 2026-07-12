from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel
from apps.employees.domain.models import Employee

# 1. Salary Structure
class SalaryStructure(CombinedSharedModel):
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='salary_structure')
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    housing_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    other_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_payroll_salary_structures'


# 2. Employee Loan
class EmployeeLoan(CombinedSharedModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='loans')
    loan_amount = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_installment = models.DecimalField(max_digits=12, decimal_places=2)
    remaining_balance = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=30, default='pending') # pending, approved, paid, settled
    deduction_start_month = models.CharField(max_length=20, default='', blank=True) # e.g. "2026-08"
    skipped_months = models.TextField(default='', blank=True) # e.g. "2026-10,2026-12"

    class Meta:
        db_table = 'nebras_payroll_loans'


# 3. Payroll Period & Run
class PayrollPeriod(CombinedSharedModel):
    code = models.CharField(max_length=50) # e.g. '2026-07'
    start_date = models.DateField()
    end_date = models.DateField()
    is_processed = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_payroll_periods'

class PayrollRun(CombinedSharedModel):
    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name='runs')
    run_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=30, default='draft') # draft, approved, paid
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'nebras_payroll_runs'


# 4. Payslip
class Payslip(CombinedSharedModel):
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name='payslips')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payslips')
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    gross_earnings = models.DecimalField(max_digits=12, decimal_places=2)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=30, default='draft') # draft, approved, paid

    class Meta:
        db_table = 'nebras_payroll_payslips'