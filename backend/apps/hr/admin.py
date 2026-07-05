from django.contrib import admin
from apps.hr.domain.models import Employee, EmployeeContract


class EmployeeContractInline(admin.TabularInline):
    model = EmployeeContract
    extra = 1


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('user', 'hire_date', 'salary', 'department_id', 'tenant_id')
    list_filter = ('hire_date',)
    inlines = [EmployeeContractInline]


@admin.register(EmployeeContract)
class EmployeeContractAdmin(admin.ModelAdmin):
    list_display = ('employee', 'start_date', 'end_date')
