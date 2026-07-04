from django.apps import AppConfig

class TenantsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tenants'
    label = 'tenants'
    verbose_name = 'إدارة المستأجرين والمؤسسات'

class IdentityConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.identity'
    label = 'identity'
    verbose_name = 'الحسابات وإدارة الهوية'

class AcademicsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.academics'
    label = 'academics'

class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.audit'
    label = 'audit'

class SettingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.settings'
    label = 'settings'

class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'
    label = 'notifications'

class StorageConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.storage'
    label = 'storage'

class AdmissionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.admissions'
    label = 'admissions'

class StudentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.students'
    label = 'students'

class TeachersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.teachers'
    label = 'teachers'

class HRConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.hr'
    label = 'hr'

class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.finance'
    label = 'finance'
    verbose_name = "إدارة الحسابات والمالية"

class StudentFinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.student_finance'
    label = 'student_finance'
    verbose_name = "إدارة فوترة الطلاب وحسابات القبض"

class ProcurementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.procurement'
    label = 'procurement'
    verbose_name = "إدارة المشتريات والتعاقدات"

class InventoryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.inventory'
    label = 'inventory'
    verbose_name = "إدارة المستودعات والتحكم في المخزون"

class AssetsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assets'
    label = 'assets'
    verbose_name = "إدارة الأصول الثابتة ودورة حياة الأصل"

class MaintenanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.maintenance'
    label = 'maintenance'
    verbose_name = "إدارة الصيانة وأوامر العمل (CMMS)"

class TransportConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.transport'
    label = 'transport'
    verbose_name = "إدارة النقل وأسطول الحافلات"

class LibraryConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.library'
    label = 'library'
    verbose_name = "إدارة المكتبات ومصادر التعلم"

class ClinicConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.clinic'
    label = 'clinic'
    verbose_name = "إدارة العيادة المدرسية والسجلات الصحية"

class CRMConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.crm'
    label = 'crm'

class AIConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ai'
    label = 'ai'

class ReportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.reports'
    label = 'reports'

class CMSConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cms'
    label = 'cms'


class OrganizationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.organization'
    label = 'organization'


class WorkflowConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.workflow'
    label = 'workflow'


class PlatformConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.platform'
    label = 'platform'


class CoreBusinessConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.core_business'
    label = 'core_business'


class MasterDataConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.master_data'
    label = 'master_data'


class FacultyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.faculty'
    label = 'faculty'


class EmployeesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.employees'
    label = 'employees'


class PayrollConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.payroll'
    label = 'payroll'


class AttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.attendance'
    label = 'attendance'


class SchedulingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.scheduling'
    label = 'scheduling'


class RulesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.rules'
    label = 'rules'


class TimetableConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.timetable'
    label = 'timetable'


class CommunicationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.communications'
    label = 'communications'
    verbose_name = 'الاتصالات والإشعارات الموحدة'


class ReportingConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.reporting'
    label = 'reporting'
    verbose_name = 'ذكاء الأعمال والتقارير والتحليلات'


class ExaminationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.examinations'
    label = 'examinations'
    verbose_name = 'الامتحانات والتقييمات الأكاديمية'











