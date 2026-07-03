from django.contrib import admin
from django.urls import path, include

urlpatterns = [
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
    path('api/v1/platform/', include('apps.platform.interfaces.urls')),
]
