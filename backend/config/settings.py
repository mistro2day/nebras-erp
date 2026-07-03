import os
import sys

# Settings for Nebras ERP
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SECRET_KEY = 'django-insecure-nebras-super-secret-key-for-dev'

DEBUG = True

ALLOWED_HOSTS = ['*']

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
    'apps.apps.InventoryConfig',
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
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

CORS_ALLOW_ALL_ORIGINS = True
