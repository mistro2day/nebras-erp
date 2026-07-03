from apps.shared.application.services import BaseService
from apps.payroll.domain.models import SalaryStructure, EmployeeLoan
from decimal import Decimal

class PayrollCalculationService(BaseService):
    """
    خدمة احتساب الرواتب والقروض والمستحقات تلقائياً
    """
    @staticmethod
    def calculate_net_salary(structure: SalaryStructure, loan_deduction: Decimal = Decimal('0.00')) -> Decimal:
        gross = structure.basic_salary + structure.housing_allowance + structure.transport_allowance + structure.other_allowances
        net = gross - loan_deduction
        return max(net, Decimal('0.00'))

    @staticmethod
    def deduct_loan_payment(loan: EmployeeLoan) -> Decimal:
        if loan.remaining_balance <= 0:
            return Decimal('0.00')
        deduction = min(loan.monthly_installment, loan.remaining_balance)
        return deduction