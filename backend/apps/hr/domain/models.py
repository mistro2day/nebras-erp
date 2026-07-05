from django.db import models
from apps.common.models import CombinedBaseModel
from apps.identity.domain.models import User
import uuid

class Employee(CombinedBaseModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employee_profile', verbose_name="المستخدم")
    hire_date = models.DateField(db_index=True, verbose_name="تاريخ التعيين")
    salary = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="الراتب")
    department_id = models.UUIDField(db_index=True, verbose_name="القسم")

    class Meta:
        db_table = 'hr_employees'
        verbose_name = "موظف"
        verbose_name_plural = "الموظفون"


class EmployeeContract(CombinedBaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='contracts', verbose_name="الموظف")
    start_date = models.DateField(verbose_name="تاريخ البدء")
    end_date = models.DateField(null=True, blank=True, verbose_name="تاريخ الانتهاء")
    terms = models.TextField(blank=True, null=True, verbose_name="بنود العقد")

    class Meta:
        db_table = 'hr_contracts'
        verbose_name = "عقد موظف"
        verbose_name_plural = "عقود الموظفين"