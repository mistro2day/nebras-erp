from django.test import TestCase
from apps.employees.domain.models import Employee
from apps.payroll.domain.models import SalaryStructure, EmployeeLoan
from apps.payroll.application.services import PayrollCalculationService
from decimal import Decimal
import uuid

class PayrollBusinessRulesTest(TestCase):
    """
    اختبارات قواعد وحالات عمل موديول الرواتب والتعويضات (Payroll Business Verification)
    """
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.employee = Employee.objects.create(
            tenant_id=self.tenant_id,
            employee_number='EMP-2026-PAY',
            national_id='4445556667',
            full_name_ar='محمد بن سعيد المحاسب',
            gender='male',
            nationality='Saudi',
            date_of_birth='1992-01-01',
            department='Finance',
            position='Accountant',
            employment_type='Full-time'
        )
        self.structure = SalaryStructure.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            basic_salary=Decimal('5000.00'),
            housing_allowance=Decimal('1250.00'),
            transport_allowance=Decimal('500.00'),
            other_allowances=Decimal('250.00')
        )
        self.loan = EmployeeLoan.objects.create(
            tenant_id=self.tenant_id,
            employee=self.employee,
            loan_amount=Decimal('10000.00'),
            monthly_installment=Decimal('1000.00'),
            remaining_balance=Decimal('5000.00'),
            status='approved'
        )

    def test_net_salary_calculation_with_loan(self):
        # احتساب القسط المستقطع
        deduction = PayrollCalculationService.deduct_loan_payment(self.loan)
        self.assertEqual(deduction, Decimal('1000.00'))

        # احتساب صافي الراتب بعد خصم القرض
        net_salary = PayrollCalculationService.calculate_net_salary(self.structure, deduction)
        # الراتب الإجمالي: 5000 + 1250 + 500 + 250 = 7000. صافي: 7000 - 1000 = 6000
        self.assertEqual(net_salary, Decimal('6000.00'))