import os
import sys

# Settings for Nebras ERP
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-nebras-super-secret-key-for-dev')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

_raw_hosts = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _raw_hosts.split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',

    # Core platform apps
    'apps.apps.TenantsConfig',
    'apps.apps.IdentityConfig',
    'apps.apps.AuditConfig',
    'apps.apps.SettingsConfig',
    'apps.apps.NotificationsConfig',
    'apps.apps.StorageConfig',
    'apps.apps.AcademicsConfig',
    'apps.apps.AdmissionsConfig',
    'apps.apps.WorkflowConfig',
    'apps.apps.StudentsConfig',
    'apps.apps.PlatformConfig',
    'apps.apps.CoreBusinessConfig',
    'apps.apps.MasterDataConfig',
    'apps.apps.EmployeesConfig',
    'apps.apps.FacultyConfig',
    'apps.apps.TeachersConfig',
    'apps.apps.HRConfig',
    'apps.apps.FinanceConfig',
    'apps.apps.StudentFinanceConfig',
    'apps.apps.ProcurementConfig',
    'apps.apps.InventoryConfig',
    'apps.apps.AssetsConfig',
    'apps.apps.MaintenanceConfig',
    'apps.apps.TransportConfig',
    'apps.apps.LibraryConfig',
    'apps.apps.ClinicConfig',
    'apps.apps.CRMConfig',
    'apps.apps.AIConfig',
    'apps.apps.ReportsConfig',
    'apps.apps.CMSConfig',
    'apps.apps.OrganizationConfig',
    'apps.apps.PayrollConfig',
    'apps.apps.AttendanceConfig',
    'apps.apps.SchedulingConfig',
    'apps.apps.RulesConfig',
    'apps.apps.TimetableConfig',
    'apps.apps.CommunicationsConfig',
    'apps.apps.ReportingConfig',
    'apps.apps.ExaminationsConfig',
    'apps.apps.PortalConfig',
    'apps.apps.IntegrationConfig',
    'apps.apps.DocumentManagementConfig',
    'apps.apps.FormsConfig',
    'apps.apps.CommandCenterConfig',
    'apps.apps.PersonalizationConfig',
    'apps.apps.ConfigurationConfig',
    'apps.apps.ApprovalCenterConfig',
    'apps.apps.AutomationPlatformConfig',
    'apps.common',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
    # Custom Middleware
    'apps.tenants.middleware.TenantMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

database_url = os.environ.get('DATABASE_URL')
if database_url and str(database_url).strip():
    import dj_database_url
    DATABASES['default'] = dj_database_url.config(
        conn_max_age=600,
        ssl_require=True
    )

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 8,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom User Model
AUTH_USER_MODEL = 'identity.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'apps.common.responses.StandardPagination',
    'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
}

LANGUAGE_CODE = 'ar'
TIME_ZONE = 'Africa/Khartoum'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
# R19: STATIC_ROOT مطلوب لأمر collectstatic في بيئة الإنتاج (لا يؤثر على التطوير)
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

_cors_origins_raw = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins_raw.split(',') if o.strip()] if _cors_origins_raw else ["http://localhost:4200"]
CORS_ALLOW_ALL_ORIGINS = len(CORS_ALLOWED_ORIGINS) == 0

# السماح برأس المستأجر المخصص في طلبات الواجهة عبر المصادر (CORS preflight)
from corsheaders.defaults import default_headers  # noqa: E402
CORS_ALLOW_HEADERS = list(default_headers) + ['x-tenant-id']

if not DEBUG:
    INSTALLED_APPS.insert(INSTALLED_APPS.index('django.contrib.staticfiles'), 'whitenoise.runserver_nostatic')
    MIDDLEWARE.insert(MIDDLEWARE.index('django.middleware.security.SecurityMiddleware') + 1, 'whitenoise.middleware.WhiteNoiseMiddleware')
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ---------------------------------------------------------------------------
# R19: Celery configuration (production integration for the Automation Platform)
# ---------------------------------------------------------------------------
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = int(os.environ.get('CELERY_TASK_TIME_LIMIT', '600'))
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# تشغيل متزامن للمهام في الاختبارات/التطوير بدون وسيط (broker) عبر متغير بيئة
CELERY_TASK_ALWAYS_EAGER = os.environ.get('CELERY_TASK_ALWAYS_EAGER', 'False') == 'True'
CELERY_TASK_EAGER_PROPAGATES = True

# طوابير المهام + طابور الرسائل الميتة (Dead Letter Queue placeholder)
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_QUEUES = {
    'default': {},
    'automation': {},
    'scheduled': {},
    'dead_letter': {},  # placeholder — تُوجَّه إليه المهام الفاشلة نهائياً
}
CELERY_TASK_ROUTES = {
    'apps.automation_platform.application.tasks.execute_automation_flow': {'queue': 'automation'},
    'apps.automation_platform.application.tasks.execute_scheduled_job': {'queue': 'scheduled'},
}

# django-celery-beat اختياري: يُفعَّل جدول قاعدة البيانات الديناميكي فقط إذا كان مثبّتاً
# ومتوافقاً مع إصدار Django الحالي (5.2). خلاف ذلك نعتمد الجدولة الثابتة الافتراضية.
try:
    import django_celery_beat  # noqa: F401
    if 'django_celery_beat' not in INSTALLED_APPS:
        INSTALLED_APPS.append('django_celery_beat')
    CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'
    DJANGO_CELERY_BEAT_AVAILABLE = True
except Exception:  # noqa: BLE001
    CELERY_BEAT_SCHEDULER = 'celery.beat:PersistentScheduler'
    DJANGO_CELERY_BEAT_AVAILABLE = False
