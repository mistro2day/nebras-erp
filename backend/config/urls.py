from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include


def health_check(request):
    """نقطة نهاية بسيطة للتحقق من حياة الخدمة دون الحاجة لمستأجر."""
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('api/v1/health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/v1/tenants/', include('apps.tenants.interfaces.urls')),
    path('api/v1/identity/', include('apps.identity.interfaces.urls')),
    path('api/v1/organization/', include('apps.organization.interfaces.urls')),
    path('api/v1/academics/', include('apps.academics.interfaces.urls')),
    path('api/v1/admissions/', include('apps.admissions.interfaces.urls')),
    path('api/v1/students/', include('apps.students.interfaces.urls')),
    path('api/v1/core-business/', include('apps.core_business.interfaces.urls')),
    path('api/v1/master-data/', include('apps.master_data.interfaces.urls')),
    path('api/v1/faculty/', include('apps.faculty.interfaces.urls')),
    path('api/v1/employees/', include('apps.employees.interfaces.urls')),
    path('api/v1/payroll/', include('apps.payroll.interfaces.urls')),
    path('api/v1/attendance/', include('apps.attendance.interfaces.urls')),
    path('api/v1/scheduling/', include('apps.scheduling.interfaces.urls')),
    path('api/v1/rules/', include('apps.rules.interfaces.urls')),
    path('api/v1/timetable/', include('apps.timetable.interfaces.urls')),
    path('api/v1/communications/', include('apps.communications.interfaces.urls')),
    path('api/v1/reporting/', include('apps.reporting.interfaces.urls')),
    path('api/v1/examinations/', include('apps.examinations.interfaces.urls')),
    path('api/v1/finance/', include('apps.finance.interfaces.urls')),
    path('api/v1/student-finance/', include('apps.student_finance.interfaces.urls')),
    path('api/v1/procurement/', include('apps.procurement.interfaces.urls')),
    path('api/v1/inventory/', include('apps.inventory.interfaces.urls')),
    path('api/v1/assets/', include('apps.assets.interfaces.urls')),
    path('api/v1/maintenance/', include('apps.maintenance.interfaces.urls')),
    path('api/v1/library/', include('apps.library.interfaces.urls')),
    path('api/v1/clinic/', include('apps.clinic.interfaces.urls')),
    path('api/v1/transport/', include('apps.transport.interfaces.urls')),
    path('api/v1/platform/', include('apps.platform.interfaces.urls')),
    path('api/v1/portal/', include('apps.portal.interfaces.urls')),
    path('api/v1/integration/', include('apps.integration.interfaces.urls')),
    path('api/v1/crm/', include('apps.crm.interfaces.urls')),
    path('api/v1/documents/', include('apps.document_management.interfaces.urls')),
    path('api/v1/forms/', include('apps.forms.interfaces.urls')),
    path('api/v1/commands/', include('apps.command_center.interfaces.urls')),
    path('api/v1/personalization/', include('apps.personalization.interfaces.urls')),
    path('api/v1/config/', include('apps.configuration.interfaces.urls')),
    path('api/v1/approvals/', include('apps.approval_center.interfaces.urls')),
    path('api/v1/automation/', include('apps.automation_platform.interfaces.urls')),
]
