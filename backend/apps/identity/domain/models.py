from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
import uuid

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('يجب توفير البريد الإلكتروني للمستخدم.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    نموذج مستخدم مرن للغاية يدعم UUID كمفتاح أساسي، مع دعم الملف الشخصي المتقدم وسياسات الأمان وقفل الحساب
    """
    STATUS_CHOICES = (
        ('active', 'نشط'),
        ('inactive', 'غير نشط'),
        ('suspended', 'موقوف'),
        ('locked', 'مغلق تلقائياً'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    username = models.CharField(max_length=150, unique=True, db_index=True, null=True, blank=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    
    # الملف الشخصي والتفضيلات
    phone = models.CharField(max_length=30, blank=True, null=True)
    national_id = models.CharField(max_length=50, blank=True, null=True)
    avatar = models.ImageField(upload_to='users/avatars/', null=True, blank=True)
    language = models.CharField(max_length=10, default='ar')
    user_timezone = models.CharField(max_length=100, default='Africa/Khartoum')
    emergency_contact = models.JSONField(default=dict, blank=True)
    preferences = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # حالة الحساب والتحكم
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_staff = models.BooleanField(default=False)
    
    # سياسة الأمان والتحقق وقفل الحساب
    failed_login_attempts = models.IntegerField(default=0)
    lockout_until = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(default=timezone.now)
    password_expires_at = models.DateTimeField(null=True, blank=True)
    
    # تواريخ الحذف والتواريخ العامة
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.is_active = False
        self.save(update_fields=['deleted_at', 'is_active'])

    def restore(self):
        self.deleted_at = None
        self.is_active = True
        self.save(update_fields=['deleted_at', 'is_active'])


class PasswordHistory(models.Model):
    """
    تخزين سجل هاشات كلمات المرور القديمة لمنع إعادة استخدامها
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_histories')
    password_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_password_history'
        ordering = ['-created_at']
