from django.db import models
from django.conf import settings
from apps.shared.domain.models import CombinedSharedModel

class PortalUser(CombinedSharedModel):
    """
    مستخدم البوابة الإلكترونية
    """
    USER_TYPES = (
        ('parent', 'ولي أمر'),
        ('student', 'طالب'),
        ('applicant', 'متقدم جديد'),
        ('employee', 'موظف self-service'),
    )
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='portal_user')
    user_type = models.CharField(max_length=20, choices=USER_TYPES, db_index=True)
    is_active = models.BooleanField(default=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_portal_users'
        verbose_name = 'مستخدم البوابة'
        verbose_name_plural = 'مستخدمو البوابات'


class PortalProfile(CombinedSharedModel):
    """
    الملف الشخصي العام لمستخدم البوابة
    """
    portal_user = models.OneToOneField(PortalUser, on_delete=models.CASCADE, related_name='profile')
    display_name_ar = models.CharField(max_length=255)
    display_name_en = models.CharField(max_length=255, blank=True, null=True)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_portal_profiles'
        verbose_name = 'الملف الشخصي للبوابة'
        verbose_name_plural = 'ملفات البوابات الشخصية'


class ParentProfile(CombinedSharedModel):
    """
    الملف الشخصي لولي الأمر
    """
    portal_profile = models.OneToOneField(PortalProfile, on_delete=models.CASCADE, related_name='parent_profile')
    national_id = models.CharField(max_length=50, db_index=True)
    occupation = models.CharField(max_length=150, blank=True, null=True)
    employer = models.CharField(max_length=150, blank=True, null=True)
    emergency_contact = models.CharField(max_length=100, blank=True, null=True)
    linked_students = models.JSONField(default=list, blank=True) # قائمة بـ IDs الطلاب المرتبطين (UUIDs)

    class Meta:
        db_table = 'nebras_portal_parent_profiles'
        verbose_name = 'ملف ولي الأمر'
        verbose_name_plural = 'ملفات أولياء الأمور'


class StudentProfile(CombinedSharedModel):
    """
    الملف الشخصي للطالب في البوابة
    """
    portal_profile = models.OneToOneField(PortalProfile, on_delete=models.CASCADE, related_name='student_profile')
    student_id = models.UUIDField(db_index=True) # ربط بمعرف الطالب في موديول الطلاب
    student_number = models.CharField(max_length=50, db_index=True)
    academic_year = models.CharField(max_length=50)
    grade_level = models.CharField(max_length=50)
    section = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'nebras_portal_student_profiles'
        verbose_name = 'ملف طالب البوابة'
        verbose_name_plural = 'ملفات طلاب البوابات'


class ApplicantProfile(CombinedSharedModel):
    """
    الملف الشخصي للمتقدم الجديد
    """
    portal_profile = models.OneToOneField(PortalProfile, on_delete=models.CASCADE, related_name='applicant_profile')
    application_id = models.UUIDField(db_index=True, null=True, blank=True) # ربط بمعرف التقديم في موديول Admissions
    admission_status = models.CharField(max_length=50, default='submitted')
    submitted_date = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_portal_applicant_profiles'
        verbose_name = 'ملف المتقدم'
        verbose_name_plural = 'ملفات المتقدمين'


class PortalNotification(CombinedSharedModel):
    """
    إشعارات البوابة
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        db_table = 'nebras_portal_notifications'
        verbose_name = 'إشعار البوابة'
        verbose_name_plural = 'إشعارات البوابات'


class PortalAnnouncement(CombinedSharedModel):
    """
    إعلانات البوابة
    """
    TARGET_CHOICES = (
        ('all', 'الجميع'),
        ('parents', 'أولياء الأمور'),
        ('students', 'الطلاب'),
        ('applicants', 'المتقدمين'),
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    target_audience = models.CharField(max_length=20, choices=TARGET_CHOICES, default='all')
    is_published = models.BooleanField(default=True)
    publish_date = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_portal_announcements'
        verbose_name = 'إعلان البوابة'
        verbose_name_plural = 'إعلانات البوابات'


class PortalMessage(CombinedSharedModel):
    """
    الرسائل والاتصالات الداخلية عبر البوابة
    """
    sender = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=255)
    content = models.TextField()
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_portal_messages'
        verbose_name = 'رسالة البوابة'
        verbose_name_plural = 'رسائل البوابات'


class PortalTask(CombinedSharedModel):
    """
    المهام والطلبات التي تتطلب إجراءً من المستخدم
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField()
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, default='pending') # pending, in_progress, completed, overdue
    priority = models.CharField(max_length=20, default='medium') # low, medium, high

    class Meta:
        db_table = 'nebras_portal_tasks'
        verbose_name = 'مهمة البوابة'
        verbose_name_plural = 'مهام البوابات'


class PortalQuickLink(CombinedSharedModel):
    """
    الروابط السريعة المخصصة للمستخدم
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='quick_links')
    title = models.CharField(max_length=100)
    url = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default='link')
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_portal_quick_links'
        verbose_name = 'رابط سريع للبوابة'
        verbose_name_plural = 'روابط البوابات السريعة'


class PortalPreference(CombinedSharedModel):
    """
    تفضيلات واجهة المستخدم للبوابة
    """
    portal_user = models.OneToOneField(PortalUser, on_delete=models.CASCADE, related_name='preferences')
    language = models.CharField(max_length=10, default='ar')
    receive_notifications = models.BooleanField(default=True)
    receive_emails = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_portal_preferences'
        verbose_name = 'تفضيل البوابة'
        verbose_name_plural = 'تفضيلات البوابات'


class PortalFavorite(CombinedSharedModel):
    """
    المفضلة للمستخدم (صفحات أو عناصر يكثر زيارتها)
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='favorites')
    title = models.CharField(max_length=100)
    url = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default='star')

    class Meta:
        db_table = 'nebras_portal_favorites'
        verbose_name = 'مفضلة البوابة'
        verbose_name_plural = 'مفضلات البوابات'


class PortalWidget(CombinedSharedModel):
    """
    عناصر ويدجت لوحة التحكم
    """
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, db_index=True)
    is_default = models.BooleanField(default=True)
    is_configurable = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_portal_widgets'
        verbose_name = 'ويدجت البوابة'
        verbose_name_plural = 'عناصر ويدجت البوابات'


class PortalShortcut(CombinedSharedModel):
    """
    اختصارات المستخدم للوصول السريع للمهام
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='shortcuts')
    widget = models.ForeignKey(PortalWidget, on_delete=models.CASCADE)
    is_visible = models.BooleanField(default=True)
    position = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_portal_shortcuts'
        verbose_name = 'اختصار البوابة'
        verbose_name_plural = 'اختصارات البوابات'


class PortalTheme(CombinedSharedModel):
    """
    سمات ومظهر البوابة المخصصة
    """
    portal_user = models.OneToOneField(PortalUser, on_delete=models.CASCADE, related_name='theme')
    theme_mode = models.CharField(max_length=20, default='light') # light, dark, system
    primary_color = models.CharField(max_length=7, default='#1e88e5') # HEX code
    font_size = models.CharField(max_length=20, default='medium') # small, medium, large

    class Meta:
        db_table = 'nebras_portal_themes'
        verbose_name = 'سمة مظهر البوابة'
        verbose_name_plural = 'سمات مظاهر البوابات'


class PortalSession(CombinedSharedModel):
    """
    سجلات جلسات الدخول للبوابات
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.CASCADE, related_name='sessions')
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=255)
    logged_in_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = 'nebras_portal_sessions'
        verbose_name = 'جلسة البوابة'
        verbose_name_plural = 'جلسات البوابات'


class PortalStatistics(CombinedSharedModel):
    """
    إحصائيات استخدام البوابات
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=150)
    page_url = models.CharField(max_length=255)
    duration_seconds = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_portal_statistics'
        verbose_name = 'إحصائية استخدام البوابة'
        verbose_name_plural = 'إحصائيات استخدام البوابات'


class PortalAudit(CombinedSharedModel):
    """
    سجلات التدقيق الأمني لعمليات البوابة
    """
    portal_user = models.ForeignKey(PortalUser, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=50) # LOGIN, LOGOUT, UPDATE_PROFILE, SUBMIT_REQUEST
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'nebras_portal_audits'
        verbose_name = 'تدقيق أمني للبوابة'
        verbose_name_plural = 'سجلات تدقيق البوابات'


class PortalSettings(CombinedSharedModel):
    """
    إعدادات تكوين البوابة الإدارية
    """
    key = models.CharField(max_length=100, db_index=True)
    value = models.JSONField(default=dict)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_portal_settings'
        verbose_name = 'إعدادات البوابة العامة'
        verbose_name_plural = 'قائمة إعدادات البوابات'
