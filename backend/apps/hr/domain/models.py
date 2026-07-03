from django.db import models
from apps.common.models import CombinedBaseModel
from apps.identity.domain.models import User
import uuid

class Employee(CombinedBaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile')
    hire_date = models.DateField(db_index=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2)
    department_id = models.UUIDField(db_index=True)

    class Meta:
        db_table = 'hr_employees'


class EmployeeContract(CombinedBaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='contracts')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    terms = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'hr_contracts'