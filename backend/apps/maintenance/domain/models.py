from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel
from apps.assets.domain.models import Asset

# 1. MaintenanceCategory (تصنيفات الصيانة)
class MaintenanceCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم تصنيف الصيانة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم تصنيف الصيانة بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز التصنيف")

    class Meta:
        db_table = 'nebras_maint_categories'
        unique_together = ('tenant_id', 'code')
        verbose_name = "تصنيف صيانة"
        verbose_name_plural = "تصنيفات الصيانة"

    def __str__(self):
        return self.name_ar


# 2. MaintenancePriority (أولويات الصيانة)
class MaintenancePriority(CombinedSharedModel):
    name_ar = models.CharField(max_length=100, verbose_name="اسم الأولوية بالعربي")
    name_en = models.CharField(max_length=100, verbose_name="اسم الأولوية بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز الأولوية (Emergency, High, Low)")

    class Meta:
        db_table = 'nebras_maint_priorities'
        unique_together = ('tenant_id', 'code')
        verbose_name = "أولوية صيانة"
        verbose_name_plural = "أولويات الصيانة"

    def __str__(self):
        return self.name_ar


# 3. MaintenanceType (أنواع الصيانة)
class MaintenanceType(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="نوع الصيانة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="نوع الصيانة بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز النوع (Preventive, Corrective)")

    class Meta:
        db_table = 'nebras_maint_types'
        unique_together = ('tenant_id', 'code')
        verbose_name = "نوع صيانة"
        verbose_name_plural = "أنواع الصيانة"

    def __str__(self):
        return self.name_ar


# 4. MaintenanceRequest (طلبات الصيانة)
class MaintenanceRequest(CombinedSharedModel):
    STATUS_CHOICES = (
        ('submitted', 'مرفوع وقيد المراجعة'),
        ('approved', 'مقبول وقيد جدولة العمل'),
        ('in_progress', 'جاري العمل والإصلاح'),
        ('completed', 'منفذ وبانتظار معاينة الجودة'),
        ('closed', 'مغلق ومؤكد'),
        ('rejected', 'مرفوض'),
    )
    request_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم طلب الصيانة")
    asset = models.ForeignKey(Asset, on_delete=models.PROTECT, related_name='maintenance_requests', verbose_name="الأصل المتأثر بالخلل")
    
    category = models.ForeignKey(MaintenanceCategory, on_delete=models.PROTECT, verbose_name="تصنيف البلاغ")
    priority = models.ForeignKey(MaintenancePriority, on_delete=models.PROTECT, verbose_name="أولوية البلاغ")
    maint_type = models.ForeignKey(MaintenanceType, on_delete=models.PROTECT, verbose_name="نوع البلاغ")
    
    reported_by_user_id = models.UUIDField(db_index=True, verbose_name="المستخدم المبلغ عن الخلل")
    request_date = models.DateTimeField(default=timezone.now, verbose_name="تاريخ تقديم الطلب")
    
    title = models.CharField(max_length=255, verbose_name="عنوان البلاغ")
    description = models.TextField(verbose_name="وصف تفصيلي للخلل/المشكلة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted', verbose_name="حالة الطلب")

    class Meta:
        db_table = 'nebras_maint_requests'
        unique_together = ('tenant_id', 'request_number')
        verbose_name = "طلب صيانة"
        verbose_name_plural = "طلبات الصيانة المرفوعة"

    def __str__(self):
        return self.title


# 5. MaintenanceTeam (فرق الصيانة)
class MaintenanceTeam(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم فريق الصيانة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم فريق الصيانة بالإنجليزي")
    leader_user_id = models.UUIDField(verbose_name="قائد الفريق")

    class Meta:
        db_table = 'nebras_maint_teams'
        verbose_name = "فريق صيانة"
        verbose_name_plural = "فرق الصيانة والدعم الفني"

    def __str__(self):
        return self.name_ar


# 6. Technician (الفنيين ومنفذي الصيانة)
class Technician(CombinedSharedModel):
    user_id = models.UUIDField(unique=True, verbose_name="رابط حساب مستخدم الفني")
    team = models.ForeignKey(MaintenanceTeam, on_delete=models.SET_NULL, null=True, blank=True, related_name='technicians', verbose_name="فريق العمل")
    specialty = models.CharField(max_length=150, blank=True, null=True, verbose_name="التخصص الفني (كهرباء، تبريد، شبكات)")
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=0.00,
                                      verbose_name="سعر ساعة العمل — يُحتسب به أجر الفني على أوامر العمل")
    is_active = models.BooleanField(default=True, verbose_name="نشط وقابل لإسناد المهام")

    class Meta:
        db_table = 'nebras_maint_technicians'
        verbose_name = "فني صيانة"
        verbose_name_plural = "الفنيين ومنفذي الصيانة"


# 7. WorkOrder (أوامر العمل الفنية)
class WorkOrder(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('assigned', 'مسند للفريق/الفني'),
        ('in_progress', 'جاري العمل'),
        ('on_hold', 'معلق (انتظار قطع غيار/اعتماد)'),
        ('completed', 'مكتمل فنيّاً'),
        ('closed', 'مغلق ومقفل ماليّاً'),
        ('cancelled', 'ملغى'),
    )
    wo_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم أمر العمل")
    request = models.ForeignKey(MaintenanceRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='work_orders', verbose_name="رابط بطلب الصيانة")
    
    asset = models.ForeignKey(Asset, on_delete=models.PROTECT, related_name='work_orders', verbose_name="الأصل المعني بالصيانة")
    assigned_team = models.ForeignKey(MaintenanceTeam, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="الفريق المسند إليه")
    assigned_technician = models.ForeignKey(Technician, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="الفني المسؤول")
    
    scheduled_start = models.DateTimeField(blank=True, null=True, verbose_name="تاريخ البدء المجدول")
    scheduled_end = models.DateTimeField(blank=True, null=True, verbose_name="تاريخ الانتهاء المجدول")
    actual_start = models.DateTimeField(blank=True, null=True, verbose_name="تاريخ البدء الفعلي")
    actual_end = models.DateTimeField(blank=True, null=True, verbose_name="تاريخ الانتهاء الفعلي")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', verbose_name="حالة أمر العمل")
    estimated_labor_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, verbose_name="ساعات العمل المقدرة")
    actual_labor_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0.00, verbose_name="ساعات العمل الفعلية")

    class Meta:
        db_table = 'nebras_maint_work_orders'
        unique_together = ('tenant_id', 'wo_number')
        verbose_name = "أمر عمل صيانة"
        verbose_name_plural = "أوامر العمل الفنية (Work Orders)"

    def __str__(self):
        return self.wo_number


# 8. WorkOrderTask (المهام التفصيلية لأمر العمل)
class WorkOrderTask(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='tasks', verbose_name="أمر العمل")
    description = models.CharField(max_length=255, verbose_name="اسم ومحتوى المهمة الفنية")
    is_completed = models.BooleanField(default=False, verbose_name="تم الإنجاز")

    class Meta:
        db_table = 'nebras_maint_wo_tasks'
        verbose_name = "مهمة أمر عمل"
        verbose_name_plural = "مهام أوامر العمل التفصيلية"


# 9. MaintenancePlan (خطط الصيانة الوقائية العامة)
class MaintenancePlan(CombinedSharedModel):
    name_ar = models.CharField(max_length=200, verbose_name="اسم خطة الصيانة الوقائية بالعربي")
    name_en = models.CharField(max_length=200, verbose_name="اسم خطة الصيانة الوقائية بالإنجليزي")
    category = models.ForeignKey(MaintenanceCategory, on_delete=models.PROTECT, verbose_name="فئة الصيانة")
    frequency_days = models.IntegerField(default=30, verbose_name="التكرار الدوري باليوم (مثال: 30 للصيانة الشهرية)")

    class Meta:
        db_table = 'nebras_maint_plans'
        verbose_name = "خطة صيانة وقائية"
        verbose_name_plural = "خطط الصيانة الوقائية المعتمدة"

    def __str__(self):
        return self.name_ar


# 10. PreventiveSchedule (جداول الصيانة الوقائية للأصول)
class PreventiveSchedule(CombinedSharedModel):
    plan = models.ForeignKey(MaintenancePlan, on_delete=models.CASCADE, related_name='schedules', verbose_name="الخطة الوقائية")
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='preventive_schedules', verbose_name="الأصل الخاضع للوقائية")
    last_run_date = models.DateField(blank=True, null=True, verbose_name="تاريخ آخر صيانة تم تنفيذها")
    next_due_date = models.DateField(verbose_name="تاريخ الصيانة الوقائية القادم المستحق")
    is_active = models.BooleanField(default=True, verbose_name="نشط وجاري التوليد التلقائي لأوامر العمل")

    class Meta:
        db_table = 'nebras_maint_prev_schedules'
        verbose_name = "جدولة صيانة أصل"
        verbose_name_plural = "جداول الصيانة الوقائية للأصول"


# 11. Inspection (معاينات وفحوصات الجودة الفنية)
class Inspection(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'معلق بانتظار الفحص'),
        ('passed', 'ناجح ومطابق للمواصفات'),
        ('failed', 'راسب وتوجد ملاحظات/أعطال تابعة'),
    )
    inspection_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم الفحص الفني")
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_inspections', verbose_name="الأصل الخاضع للمعاينة")
    work_order = models.ForeignKey(WorkOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections', verbose_name="أمر العمل التابع له")
    
    inspection_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الفحص الفعلي")
    inspector_user_id = models.UUIDField(verbose_name="المفتش/الفني القائم بالفحص")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="نتيجة الفحص")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات وتوصيات الفحص")

    class Meta:
        db_table = 'nebras_maint_inspections'
        unique_together = ('tenant_id', 'inspection_number')
        verbose_name = "معاينة وفحص فني"
        verbose_name_plural = "معاينات وفحوصات الأصول الفنية"


# 12. InspectionChecklist (قوائم التحقق للفحوصات)
class InspectionChecklist(CombinedSharedModel):
    name = models.CharField(max_length=150, verbose_name="اسم قائمة التحقق (مثال: فحص التكييف)")

    class Meta:
        db_table = 'nebras_maint_inspection_checklists'
        verbose_name = "قائمة فحص"
        verbose_name_plural = "قوائم التحقق للفحوصات"


# 13. InspectionItem (بنود الفحص الفردية)
class InspectionItem(CombinedSharedModel):
    checklist = models.ForeignKey(InspectionChecklist, on_delete=models.CASCADE, related_name='items', verbose_name="قائمة الفحص")
    description = models.CharField(max_length=255, verbose_name="اسم البند المراد فحصه (مثال: قياس الفولت)")

    class Meta:
        db_table = 'nebras_maint_inspection_items'
        verbose_name = "بند فحص"
        verbose_name_plural = "بنود قوائم الفحص الفردية"


# 14. MaintenanceAssignment (سجل التكليفات والمهام التابعة)
class MaintenanceAssignment(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='assignments', verbose_name="أمر العمل")
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, verbose_name="الفني المكلف")
    assigned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'nebras_maint_assignments'
        verbose_name = "تكليف فني"
        verbose_name_plural = "تكليفات الفنيين الفردية"


# 15. MaintenanceVisit (زيارات الصيانة الميدانية)
class MaintenanceVisit(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='visits', verbose_name="أمر العمل")
    visit_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الزيارة الفعلي")
    start_time = models.TimeField(verbose_name="وقت الدخول")
    end_time = models.TimeField(verbose_name="وقت الخروج/المغادرة")

    class Meta:
        db_table = 'nebras_maint_visits'
        verbose_name = "زيارة صيانة"
        verbose_name_plural = "زيارات الصيانة الميدانية"


# 16. MaintenanceVendor (مقاولي الصيانة الخارجيين)
class MaintenanceVendor(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم المقاول بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم المقاول بالإنجليزي")
    contact_phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="هاتف الاتصال")

    class Meta:
        db_table = 'nebras_maint_vendors'
        verbose_name = "مقاول صيانة خارجي"
        verbose_name_plural = "مقاولين وشركات الصيانة الخارجية"

    def __str__(self):
        return self.name_ar


# 17. MaintenanceContract (عقود الصيانة المبرمة)
class MaintenanceContract(CombinedSharedModel):
    contract_number = models.CharField(max_length=100, verbose_name="رقم عقد الصيانة")
    vendor = models.ForeignKey(MaintenanceVendor, on_delete=models.PROTECT, related_name='contracts', verbose_name="مقاول الصيانة")
    start_date = models.DateField(verbose_name="تاريخ بدء العقد")
    end_date = models.DateField(verbose_name="تاريخ انتهاء العقد")
    value = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="قيمة العقد")

    class Meta:
        db_table = 'nebras_maint_contracts'
        verbose_name = "عقد صيانة"
        verbose_name_plural = "عقود الصيانة والضمانات الخارجية"


# 18. MaintenanceCost (تكاليف الصيانة الإجمالية لأمر العمل)
class MaintenanceCost(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='costs', verbose_name="أمر العمل")
    labor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="تكلفة العمالة/الفنيين")
    material_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="تكلفة المواد وقطع الغيار")
    vendor_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="تكلفة مقاولين وخدمات خارجية")
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="إجمالي تكاليف الصيانة الفعلي")
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="رابط قيد تكاليف الصيانة بالمالية")

    class Meta:
        db_table = 'nebras_maint_costs'
        verbose_name = "تكلفة صيانة أمر عمل"
        verbose_name_plural = "تفاصيل تكاليف صيانة أوامر العمل"


# 19. LaborCost (تكاليف الفنيين الفردية بالوقت)
class LaborCost(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='labor_costs', verbose_name="أمر العمل")
    technician = models.ForeignKey(Technician, on_delete=models.CASCADE, verbose_name="الفني")
    hours_worked = models.DecimalField(max_digits=6, decimal_places=2, verbose_name="ساعات العمل المنفذة")
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, verbose_name="سعر الساعة الفني")

    class Meta:
        db_table = 'nebras_maint_labor_costs'
        verbose_name = "تكلفة عمالة"
        verbose_name_plural = "تكاليف عمالة الفنيين التفصيلية"


# 20. MaterialConsumption (استهلاك قطع الغيار والمواد المخزنية)
class MaterialConsumption(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='material_consumptions', verbose_name="أمر العمل")
    inventory_item_id = models.UUIDField(verbose_name="معرف الصنف بموديول المخازن (InventoryItem UUID)")
    qty_consumed = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="الكمية المستهلكة")
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="سعر تكلفة الوحدة عند الصرف")
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="إجمالي تكلفة المادة")

    class Meta:
        db_table = 'nebras_maint_material_consumption'
        verbose_name = "قطع غيار مستهلكة"
        verbose_name_plural = "قطع الغيار والمواد المستهلكة في الصيانة"


# 21. DowntimeRecord (سجلات توقف وتشغيل الأصول)
class DowntimeRecord(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='downtime_records', verbose_name="الأصل المتوقف")
    work_order = models.ForeignKey(WorkOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='downtime_records', verbose_name="أمر العمل التابع له")
    start_time = models.DateTimeField(default=timezone.now, verbose_name="وقت بدء التوقف الفعلي")
    end_time = models.DateTimeField(blank=True, null=True, verbose_name="وقت انتهاء التوقف وعودة التشغيل")
    downtime_minutes = models.IntegerField(default=0, verbose_name="مدة التوقف بالدقيقة")

    class Meta:
        db_table = 'nebras_maint_downtimes'
        verbose_name = "سجل توقف أصول"
        verbose_name_plural = "سجلات توقف الأصول والأجهزة"


# 22. FailureReason (أسباب الأعطال)
class FailureReason(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="سبب العطل بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="سبب العطل بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True)

    class Meta:
        db_table = 'nebras_maint_failure_reasons'
        unique_together = ('tenant_id', 'code')
        verbose_name = "سبب العطل"
        verbose_name_plural = "أسباب أعطال الأصول"

    def __str__(self):
        return self.name_ar


# 23. RootCause (السبب الجذري للخلل الفني)
class RootCause(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='root_causes', verbose_name="أمر العمل")
    reason = models.ForeignKey(FailureReason, on_delete=models.PROTECT, verbose_name="تصنيف سبب العطل")
    description = models.TextField(verbose_name="وصف السبب الجذري للخلل الفني بالتفصيل")

    class Meta:
        db_table = 'nebras_maint_root_causes'
        verbose_name = "السبب الجذري للخلل"
        verbose_name_plural = "الأسباب الجذرية للأعطال"


# 24. CorrectiveAction (الإجراءات التصحيحية المنفذة)
class CorrectiveAction(CombinedSharedModel):
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, related_name='corrective_actions', verbose_name="أمر العمل")
    description = models.TextField(verbose_name="وصف الإجراء التصحيحي المتخذ لمنع تكرار العطل")

    class Meta:
        db_table = 'nebras_maint_corrective_actions'
        verbose_name = "إجراء تصحيحي"
        verbose_name_plural = "الإجراءات التصحيحية المنفذة"


# 25. MaintenanceHistory (سجل وتاريخ الصيانة الفعلي للأصل)
class MaintenanceHistory(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_history', verbose_name="الأصل")
    work_order = models.ForeignKey(WorkOrder, on_delete=models.CASCADE, verbose_name="أمر العمل المنفذ")
    completion_date = models.DateField(verbose_name="تاريخ الإنجاز والاعتماد")
    summary = models.TextField(verbose_name="ملخص الأعمال الفنية المنفذة")

    class Meta:
        db_table = 'nebras_maint_history'
        verbose_name = "سجل صيانة أصل تاريخي"
        verbose_name_plural = "تاريخ عمليات صيانة الأصول"


# 26. MaintenanceAttachment (مرفقات ومستندات بلاغات الصيانة)
class MaintenanceAttachment(CombinedSharedModel):
    request = models.ForeignKey(MaintenanceRequest, on_delete=models.CASCADE, related_name='attachments', verbose_name="طلب الصيانة")
    title = models.CharField(max_length=150, verbose_name="عنوان المرفق")
    file_path = models.CharField(max_length=255, verbose_name="رابط/مسار الملف المرفق")

    class Meta:
        db_table = 'nebras_maint_attachments'
        verbose_name = "مرفق بلاغ صيانة"
        verbose_name_plural = "مرفقات بلاغات الصيانة"


# 27. MaintenanceAudit (سجل تدقيق عمليات أوامر العمل)
class MaintenanceAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100, verbose_name="نوع العملية")
    performed_by = models.UUIDField(null=True, blank=True, verbose_name="المستخدم المنفذ")
    performed_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField(default=dict, verbose_name="تفاصيل العملية")

    class Meta:
        db_table = 'nebras_maint_audits'
        verbose_name = "سجل تدقيق صيانة"
        verbose_name_plural = "سجلات تدقيق عمليات الصيانة"


# 28. MaintenanceSettings (إعدادات الصيانة الفنية الفورية)
class MaintenanceSettings(CombinedSharedModel):
    auto_generate_wo_from_prev = models.BooleanField(default=True, verbose_name="توليد أوامر عمل الصيانة الوقائية تلقائياً")
    escalation_hours = models.IntegerField(default=24, verbose_name="عدد الساعات لتصعيد البلاغات الطارئة غير المسندة")

    class Meta:
        db_table = 'nebras_maint_settings'
        verbose_name = "إعدادات الصيانة"
        verbose_name_plural = "إعدادات الصيانة والتحكم"


# 29. MaintenanceStatistics (إحصائيات الصيانة العامة)
class MaintenanceStatistics(CombinedSharedModel):
    as_of_date = models.DateField(db_index=True)
    open_requests_count = models.IntegerField(default=0, verbose_name="البلاغات المفتوحة")
    active_work_orders_count = models.IntegerField(default=0, verbose_name="أوامر العمل الجارية")
    total_maintenance_costs = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="إجمالي تكاليف الصيانة المحتسبة")

    class Meta:
        db_table = 'nebras_maint_statistics'
        verbose_name = "إحصائية صيانة"
        verbose_name_plural = "إحصائيات الصيانة العامة"
