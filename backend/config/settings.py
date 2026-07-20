import os
import sys

# Load environment variables from a local, git-ignored `.env` file (local dev).
# Real environment variables (e.g. on Render) take precedence because
# load_dotenv() does not override existing variables by default.
from dotenv import load_dotenv

load_dotenv()

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

# Database: Neon PostgreSQL only. SQLite support has been removed.
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL or not str(DATABASE_URL).strip():
    from django.core.exceptions import ImproperlyConfigured

    raise ImproperlyConfigured(
        "DATABASE_URL environment variable is required and must point to the "
        "Neon PostgreSQL database. SQLite is no longer supported."
    )
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        conn_max_age=600,
        ssl_require=True,
    )
}

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

# إعدادات JWT: عمر رمز الوصول الافتراضي 5 دقائق قصير جدًا ويسبب انتهاء الجلسة
# وظهور القوائم فارغة؛ نرفعه إلى ساعة مع رمز تجديد يدوم أسبوعًا. تجديد الرمز
# يتم تلقائيًا من الواجهة عند 401 (error.interceptor).
from datetime import timedelta  # noqa: E402
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
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

# تشغيل متزامن للمهام في الاختبارات/التطوير بدون وسيط (broker).
# إذا لم يُشغَّل Redis/Celery worker، تُنفَّذ المهام (مثل إرسال رسائل تفعيل
# حسابات الطلاب وأولياء الأمور) فوراً داخل نفس الطلب بدل وضعها في طابور معلّق.
# يُتحكَّم به عبر CELERY_TASK_ALWAYS_EAGER؛ الافتراضي: مُفعَّل عند DEBUG.
CELERY_TASK_ALWAYS_EAGER = os.environ.get(
    'CELERY_TASK_ALWAYS_EAGER', 'true' if DEBUG else 'false'
).lower() in ('1', 'true', 'yes')
# في الوضع المتزامن لا نرفع استثناءات المهمة إلى الطلب حتى لا يفشل التفعيل بأكمله
CELERY_TASK_EAGER_PROPAGATES = False
# لا نخزّن نتائج المهام المتزامنة في Redis (يتجنّب محاولات الاتصال بالوسيط)
CELERY_TASK_STORE_EAGER_RESULT = False

# فشل سريع عند تعذّر الاتصال بالوسيط بدل التعليق على 20 محاولة إعادة اتصال
CELERY_BROKER_TRANSPORT_OPTIONS = {
    'socket_connect_timeout': 2,
    'socket_timeout': 2,
    'max_retries': 1,
}
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_BROKER_CONNECTION_MAX_RETRIES = 1

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

# ==========================================================
# إعدادات البريد الإلكتروني (SMTP) — يدعم SendGrid / Mailgun / Amazon SES
# ==========================================================
# جميع القيم من متغيرات البيئة. عند ضبط EMAIL_HOST_USER + EMAIL_HOST_PASSWORD
# يُفعَّل الإرسال الفعلي عبر SMTP؛ خلاف ذلك تُطبع الرسائل في الكونسول (تطوير).
# أمثلة للمضيف:
#   SendGrid : smtp.sendgrid.net           (المستخدم الحرفي: "apikey")
#   Mailgun  : smtp.mailgun.org
#   SES      : email-smtp.<region>.amazonaws.com
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'true').lower() in ('1', 'true', 'yes')
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'false').lower() in ('1', 'true', 'yes')
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', '15'))
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'noreply@nebras.edu')

# الرابط العام للمنصة — يُستخدم لبناء روابط مطلقة (مثل شعار المدرسة في البريد).
# يجب أن يكون https ومتاحاً للعامة كي تظهر الصور في عملاء البريد (Gmail...).
PUBLIC_BASE_URL = os.environ.get('PUBLIC_BASE_URL', '').rstrip('/')

if EMAIL_HOST and EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_SMTP_CONFIGURED = True
else:
    # لا توجد بيانات SMTP: اطبع البريد في الكونسول بدل الفشل الصامت
    EMAIL_BACKEND = os.environ.get(
        'EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend'
    )
    EMAIL_SMTP_CONFIGURED = False

# ==========================================================
# تسجيل الأخطاء: طباعة تفاصيل أي استثناء (500) في الكونسول دائماً
# حتى مع DEBUG=False — لتشخيص أعطال الإنتاج/التطوير بسهولة.
# ==========================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '[{levelname}] {asctime} {name} — {message}', 'style': '{'},
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
    },
    'loggers': {
        'django.request': {'handlers': ['console'], 'level': 'ERROR', 'propagate': False},
        'apps': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
    },
    'root': {'handlers': ['console'], 'level': 'WARNING'},
}


# ---------------------------------------------------------------------------
# التحليل الذكي (NLQ) — الاستعلام باللغة الطبيعية في موديول التقارير
#
# نستخدم الواجهة المتوافقة مع OpenAI، فالتحويل بين المزوّدين يتم بتغيير
# NLQ_BASE_URL و NLQ_MODEL فقط دون تعديل أي شيفرة:
#   Gemini (الافتراضي، مجاني): https://generativelanguage.googleapis.com/v1beta/openai/
#   Groq:     https://api.groq.com/openai/v1            + NLQ_MODEL=llama-3.3-70b-versatile
#   Ollama:   http://localhost:11434/v1                 + NLQ_MODEL=llama3.1
#
# النموذج يستقبل نص السؤال وأسماء المقاييس فقط — لا تمرّ عليه أي بيانات طلاب
# أو مالية، فالنتائج تُحسب في الـ ORM بعد اختيار المقياس.
# ---------------------------------------------------------------------------
# يُختار المفتاح تلقائياً حسب المزوّد المضبوط في NLQ_BASE_URL، فيمكن إبقاء
# مفاتيح عدة مزوّدين في .env معاً والتبديل بينهم بتغيير NLQ_BASE_URL وحده.
_NLQ_BASE_URL_RAW = os.environ.get(
    'NLQ_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/openai/'
)
if 'groq.com' in _NLQ_BASE_URL_RAW:
    NLQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
elif 'cerebras' in _NLQ_BASE_URL_RAW:
    NLQ_API_KEY = os.environ.get('CEREBRAS_API_KEY', '')
elif 'localhost' in _NLQ_BASE_URL_RAW or '127.0.0.1' in _NLQ_BASE_URL_RAW:
    NLQ_API_KEY = os.environ.get('NLQ_API_KEY', 'ollama')  # Ollama لا يتطلّب مفتاحاً
else:
    NLQ_API_KEY = os.environ.get('GEMINI_API_KEY', '')
NLQ_API_KEY = NLQ_API_KEY or os.environ.get('NLQ_API_KEY', '')
NLQ_BASE_URL = _NLQ_BASE_URL_RAW
NLQ_MODEL = os.environ.get('NLQ_MODEL', 'gemini-1.5-flash')
