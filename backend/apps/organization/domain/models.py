from django.db import models
from django.utils import timezone
from apps.common.models import CombinedBaseModel
import uuid

class Branch(CombinedBaseModel):
    """
    نموذج الفروع المدرسية التابعة للمستأجر (مدرسة بنين / مدرسة بنات / مشتركة)
    """
    SCHOOL_GENDER_CHOICES = [
        ('boys', 'مدرسة بنين'),
        ('girls', 'مدرسة بنات'),
        ('coed', 'مشتركة (بنين وبنات)'),
    ]

    name = models.CharField(max_length=255)
    name_ar = models.CharField(max_length=255, blank=True, null=True)
    name_en = models.CharField(max_length=255, blank=True, null=True)
    code = models.CharField(max_length=100, db_index=True)
    school_gender_type = models.CharField(max_length=20, choices=SCHOOL_GENDER_CHOICES, default='coed', db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    # Geographic & Address
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=150, blank=True, null=True)
    state = models.CharField(max_length=150, blank=True, null=True)
    country = models.CharField(max_length=150, default='السودان')
    postal_code = models.CharField(max_length=50, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        db_table = 'branches'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class Campus(CombinedBaseModel):
    """
    نموذج المجمعات التعليمية التابعة للفروع
    """
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='campuses')
    name = models.CharField(max_length=255)
    name_ar = models.CharField(max_length=255, blank=True, null=True)
    name_en = models.CharField(max_length=255, blank=True, null=True)
    code = models.CharField(max_length=100, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'campuses'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class Building(CombinedBaseModel):
    """
    نموذج المباني داخل المجمعات
    """
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name='buildings')
    name = models.CharField(max_length=255)
    name_ar = models.CharField(max_length=255, blank=True, null=True)
    name_en = models.CharField(max_length=255, blank=True, null=True)
    code = models.CharField(max_length=100, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'buildings'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class Floor(CombinedBaseModel):
    """
    نموذج الطوابق داخل المباني
    """
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='floors')
    name = models.CharField(max_length=100)
    number = models.IntegerField()

    class Meta:
        db_table = 'floors'
        unique_together = ('tenant_id', 'building', 'number')

    def __str__(self):
        return f"{self.building.name} - {self.name}"


class Room(CombinedBaseModel):
    """
    نموذج الغرف والصفوف داخل الطوابق
    """
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    number = models.CharField(max_length=50, db_index=True)
    name = models.CharField(max_length=150, blank=True, null=True)
    capacity = models.IntegerField(default=30) # السعة الاستيعابية للطلاب
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'rooms'
        unique_together = ('tenant_id', 'floor', 'number')

    def __str__(self):
        return f"Room {self.number} ({self.floor.building.name})"


class Department(CombinedBaseModel):
    """
    نموذج الأقسام الإدارية والأكاديمية
    """
    DEPARTMENT_TYPES = (
        ('academic', 'أكاديمي'),
        ('administrative', 'إداري'),
    )
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='departments')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    type = models.CharField(max_length=20, choices=DEPARTMENT_TYPES, default='administrative')
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='sub_departments')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'departments'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


class OrganizationDocument(CombinedBaseModel):
    """
    إدارة الوثائق والملفات والمستندات الخاصة بالمؤسسة التعليمية وتراخيصها
    """
    DOCUMENT_TYPES = (
        ('license', 'رخصة المدرسة'),
        ('commercial', 'السجل التجاري'),
        ('tax', 'الشهادة الضريبية'),
        ('education', 'رخصة التعليم'),
        ('insurance', 'وثائق التأمين'),
        ('building', 'مستندات المبنى'),
        ('safety', 'شهادات السلامة'),
        ('other', 'مرفقات أخرى'),
    )
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='organization/documents/')
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'organization_documents'

    def __str__(self):
        return self.name


class TenantBranding(CombinedBaseModel):
    """
    إعدادات البراندينغ والهوية البصرية المفصلة لكل مستأجر
    """
    logo = models.ImageField(upload_to='branding/logos/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#1e3a8a')
    secondary_color = models.CharField(max_length=7, default='#10b981')
    font_family = models.CharField(max_length=100, default='Inter')
    custom_css = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'tenant_brandings'


class OrganizationContact(CombinedBaseModel):
    """
    جهات الاتصال وحسابات شبكات التواصل الاجتماعي لكل مدرسة/فرع
    """
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, null=True, blank=True, related_name='contacts')
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    facebook = models.URLField(blank=True, null=True)
    twitter = models.URLField(blank=True, null=True)
    instagram = models.URLField(blank=True, null=True)
    linkedin = models.URLField(blank=True, null=True)
    youtube = models.URLField(blank=True, null=True)
    whatsapp = models.CharField(max_length=50, blank=True, null=True)
    telegram = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'organization_contacts'