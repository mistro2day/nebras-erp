from django.db import models
from apps.shared.domain.models import CombinedSharedModel


# ============================================================
# 1. Report Category — تصنيفات التقارير
# ============================================================
class ReportCategory(CombinedSharedModel):
    """
    تصنيف التقارير ولوحات القيادة (أكاديمي، مالي، إداري، إلخ).
    """
    CATEGORY_CHOICES = (
        ('academic', 'أكاديمي'),
        ('admission', 'قبول وتسجيل'),
        ('students', 'شؤون طلاب'),
        ('faculty', 'هيئة التدريس'),
        ('hr', 'موارد بشرية'),
        ('payroll', 'رواتب وأجور'),
        ('attendance', 'حضور وانصراف'),
        ('finance', 'مالية ومحاسبة'),
        ('inventory', 'مخازن ومستودعات'),
        ('library', 'مكتبة'),
        ('transport', 'نقل ومواصلات'),
        ('clinic', 'عيادة وصحة'),
        ('crm', 'علاقات العملاء'),
        ('system', 'صيانة وأداء النظام'),
        ('executive', 'تقارير تنفيذية'),
        ('ai', 'تحليلات ذكية'),
        ('custom', 'مخصص'),
    )

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    category_type = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='custom', db_index=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=20, blank=True, null=True)
    priority = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_rep_categories'
        ordering = ['priority', 'name']

    def __str__(self):
        return self.name


# ============================================================
# 2. Data Source — مصادر البيانات
# ============================================================
class DataSource(CombinedSharedModel):
    """
    مصادر البيانات المختلفة لتوليد التقارير.
    """
    SOURCE_TYPES = (
        ('db_view', 'مشهد قاعدة بيانات (View)'),
        ('materialized_view', 'مشهد مجمع (Materialized View)'),
        ('rest_api', 'واجهة REST API'),
        ('stored_procedure', 'إجراء مخزن (Stored Procedure)'),
        ('external_api', 'واجهة خارجية API'),
        ('data_warehouse', 'مستودع بيانات (DWH)'),
        ('data_lake', 'بحيرة بيانات'),
    )

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    source_type = models.CharField(max_length=30, choices=SOURCE_TYPES, default='db_view', db_index=True)
    description = models.TextField(blank=True, null=True)
    
    # الإعدادات وقنوات الربط
    connection_config = models.JSONField(default=dict, blank=True)
    query_template = models.TextField(blank=True, null=True, help_text="الاستعلام الأساسي أو الرابط")
    schema_definition = models.JSONField(default=dict, blank=True, help_text="تعريف الحقول والأنواع المرجعة")
    
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'nebras_rep_data_sources'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return f"{self.name} ({self.get_source_type_display()})"


# ============================================================
# 3. Report Dataset — مجموعات بيانات التقارير
# ============================================================
class ReportDataset(CombinedSharedModel):
    """
    مجموعة البيانات الفعلية المستخدمة للتقرير.
    يربط الأعمدة والمعاملات بمصدر البيانات الفعلي.
    """
    data_source = models.ForeignKey(DataSource, on_delete=models.PROTECT, related_name='datasets')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    query_override = models.TextField(blank=True, null=True)
    config = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_rep_datasets'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 4. Report — التقرير الأساسي
# ============================================================
class Report(CombinedSharedModel):
    """
    التقرير الأساسي في النظام.
    """
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('published', 'منشور'),
        ('archived', 'مؤرشف'),
    )

    category = models.ForeignKey(ReportCategory, on_delete=models.PROTECT, related_name='reports')
    dataset = models.ForeignKey(ReportDataset, on_delete=models.PROTECT, related_name='reports')
    
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    is_system = models.BooleanField(default=False)
    
    current_version = models.IntegerField(default=1)
    view_count = models.IntegerField(default=0)
    last_executed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_rep_reports'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 5. Report Template — قوالب التقارير
# ============================================================
class ReportTemplate(CombinedSharedModel):
    """
    قالب تنسيق وتصميم التقرير (Header, Footer, Logo, Styles).
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    html_content = models.TextField(help_text="هيكل القالب بلغة HTML")
    css_content = models.TextField(blank=True, null=True, help_text="الأنماط المخصصة")
    config = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_rep_templates'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 6. Report Version — إصدارات التقارير
# ============================================================
class ReportVersion(CombinedSharedModel):
    """
    إصدار محدد من التقرير يدعم التراجع.
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    definition = models.JSONField(default=dict, help_text="تعريف التقرير الكامل في هذا الإصدار")
    
    change_log = models.TextField(blank=True, null=True)
    published_at = models.DateTimeField(null=True, blank=True)
    published_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_rep_versions'
        unique_together = ('report', 'version_number')

    def __str__(self):
        return f"{self.report.name} v{self.version_number}"


# ============================================================
# 7. Report Parameter — معاملات التقارير
# ============================================================
class ReportParameter(CombinedSharedModel):
    """
    المعاملات التي يقبلها الاستعلام (مثال: المعلم، الموظف، الصف الدراسي).
    """
    PARAM_TYPES = (
        ('string', 'نص'),
        ('number', 'رقم'),
        ('date', 'تاريخ'),
        ('boolean', 'منطقي'),
        ('dropdown', 'قائمة منسدلة'),
        ('multi_select', 'اختيار متعدد'),
    )

    dataset = models.ForeignKey(ReportDataset, on_delete=models.CASCADE, related_name='parameters')
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=50, db_index=True)
    parameter_type = models.CharField(max_length=20, choices=PARAM_TYPES, default='string')
    
    default_value = models.CharField(max_length=255, blank=True, null=True)
    is_required = models.BooleanField(default=False)
    lookup_query = models.TextField(blank=True, null=True, help_text="استعلام لجلب القائمة المنسدلة")

    class Meta:
        db_table = 'nebras_rep_parameters'
        unique_together = ('dataset', 'key')

    def __str__(self):
        return self.name


# ============================================================
# 8. Report Filter — الفلاتر المستخدمة
# ============================================================
class ReportFilter(CombinedSharedModel):
    """
    الفلاتر المطبقة على التقرير (مثل نطاق التاريخ، الفرع، القسم).
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='filters')
    parameter = models.ForeignKey(ReportParameter, on_delete=models.CASCADE, related_name='filters')
    operator = models.CharField(max_length=20, default='equals')
    is_visible = models.BooleanField(default=True)
    priority = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_rep_filters'
        ordering = ['priority']


# ============================================================
# 9. Report Column — أعمدة التقارير
# ============================================================
class ReportColumn(CombinedSharedModel):
    """
    أعمدة التقرير وتفاصيلها بما في ذلك الأعمدة المحسوبة والتجميعات.
    """
    AGG_FUNCS = (
        ('none', 'بدون تجميع'),
        ('sum', 'مجموع (SUM)'),
        ('avg', 'متوسط (AVG)'),
        ('min', 'الحد الأدنى (MIN)'),
        ('max', 'الحد الأقصى (MAX)'),
        ('count', 'العدد (COUNT)'),
    )

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=150)
    field_name = models.CharField(max_length=100)
    data_type = models.CharField(max_length=50, default='string')
    
    # تنسيق وتجميع
    aggregation = models.CharField(max_length=20, choices=AGG_FUNCS, default='none')
    is_calculated = models.BooleanField(default=False)
    formula = models.TextField(blank=True, null=True, help_text="الصيغة الحسابية للعمود")
    conditional_formatting = models.JSONField(default=dict, blank=True)
    
    is_visible = models.BooleanField(default=True)
    priority = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_rep_columns'
        ordering = ['priority']

    def __str__(self):
        return self.name


# ============================================================
# 10. Report Layout — تنسيق وتوزيع المكونات
# ============================================================
class ReportLayout(CombinedSharedModel):
    """
    تنسيق تخطيط التقرير والمكونات المعروضة فيه.
    """
    report = models.OneToOneField(Report, on_delete=models.CASCADE, related_name='layout')
    grid_config = models.JSONField(default=dict)
    header_config = models.JSONField(default=dict, blank=True)
    footer_config = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_rep_layouts'


# ============================================================
# 11. Report Chart — الرسوم البيانية للتقرير
# ============================================================
class ReportChart(CombinedSharedModel):
    """
    الرسوم البيانية المدمجة بالتقرير (أعمدة، خطوط، دائرية، إلخ).
    """
    CHART_TYPES = (
        ('line', 'خطي'),
        ('bar', 'أعمدة أفقي'),
        ('column', 'أعمدة رأسي'),
        ('pie', 'دائري'),
        ('donut', 'دائري مجوف'),
        ('area', 'مساحي'),
        ('scatter', 'مبعثر'),
        ('heatmap', 'خريطة حرارية'),
        ('gauge', 'مقياس'),
        ('radar', 'رادار'),
        ('kpi_card', 'بطاقة مؤشر أداء'),
    )

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='charts')
    title = models.CharField(max_length=255)
    chart_type = models.CharField(max_length=30, choices=CHART_TYPES, default='column')
    
    # المحاور والبيانات
    x_axis_column = models.CharField(max_length=100)
    y_axis_columns = models.JSONField(default=list)
    config = models.JSONField(default=dict, blank=True)
    
    priority = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_rep_charts'
        ordering = ['priority']

    def __str__(self):
        return self.title


# ============================================================
# 12. Report Execution — سجل عمليات التشغيل الجارية والمكتملة
# ============================================================
class ReportExecution(CombinedSharedModel):
    """
    تتبع العمليات الجارية لتشغيل وتوليد التقارير.
    """
    EXEC_STATUS = (
        ('pending', 'انتظار المعالجة'),
        ('processing', 'قيد التوليد'),
        ('completed', 'اكتمل'),
        ('failed', 'فشل'),
        ('cancelled', 'ملغي'),
    )

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='executions')
    status = models.CharField(max_length=20, choices=EXEC_STATUS, default='pending')
    
    parameters_used = models.JSONField(default=dict, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    execution_time_seconds = models.FloatField(default=0.0)
    
    triggered_by = models.UUIDField(null=True, blank=True)
    error_message = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_rep_executions'
        ordering = ['-started_at']


# ============================================================
# 13. Report History — المحفوظات والنتائج
# ============================================================
class ReportHistory(CombinedSharedModel):
    """
    التقارير التي تم تشغيلها مسبقاً وتخزين مخرجاتها كملفات أو بيانات مؤقتة.
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='history')
    executed_at = models.DateTimeField(auto_now_add=True)
    executed_by = models.UUIDField(null=True, blank=True)
    
    parameters_used = models.JSONField(default=dict, blank=True)
    file_path = models.CharField(max_length=500, blank=True, null=True)
    file_size = models.BigIntegerField(default=0)
    format = models.CharField(max_length=20, default='pdf')

    class Meta:
        db_table = 'nebras_rep_history'
        ordering = ['-executed_at']


# ============================================================
# 14. Report Schedule — جدولة التقارير
# ============================================================
class ReportSchedule(CombinedSharedModel):
    """
    إعدادات جدولة التشغيل التلقائي للتقرير (يومي، أسبوعي، شهري...).
    """
    FREQ_CHOICES = (
        ('daily', 'يومي'),
        ('weekly', 'أسبوعي'),
        ('monthly', 'شهري'),
        ('quarterly', 'ربع سنوي'),
        ('yearly', 'سنوي'),
        ('cron', 'تعبير Cron'),
    )

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='schedules')
    name = models.CharField(max_length=255)
    frequency = models.CharField(max_length=20, choices=FREQ_CHOICES, default='daily')
    cron_expression = models.CharField(max_length=100, blank=True, null=True)
    
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        db_table = 'nebras_rep_schedules'
        ordering = ['-next_run_at']

    def __str__(self):
        return self.name


# ============================================================
# 15. Report Subscription — اشتراكات المستخدمين
# ============================================================
class ReportSubscription(CombinedSharedModel):
    """
    اشتراكات المستخدمين لاستقبال التقارير المجدولة عبر القنوات.
    """
    CHANNEL_CHOICES = (
        ('email', 'بريد إلكتروني'),
        ('whatsapp', 'واتساب'),
        ('push', 'إشعار فوري'),
        ('sms', 'رسالة نصية قصيرة'),
        ('in_app', 'إشعار داخلي'),
    )

    schedule = models.ForeignKey(ReportSchedule, on_delete=models.CASCADE, related_name='subscriptions')
    user_id = models.UUIDField(db_index=True)
    recipient_address = models.CharField(max_length=255, help_text="العنوان أو الرقم المراد الإرسال إليه")
    delivery_channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='email')
    
    export_format = models.CharField(max_length=20, default='pdf')
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_rep_subscriptions'
        unique_together = ('schedule', 'user_id', 'delivery_channel')


# ============================================================
# 16. Report Export — سجل تصدير التقارير
# ============================================================
class ReportExport(CombinedSharedModel):
    """
    سجل وتدقيق لجميع عمليات تصدير التقارير.
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='exports')
    exported_at = models.DateTimeField(auto_now_add=True)
    exported_by = models.UUIDField(null=True, blank=True)
    format = models.CharField(max_length=20, db_index=True)
    
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500, blank=True, null=True)
    
    is_password_protected = models.BooleanField(default=False)
    has_digital_signature = models.BooleanField(default=False)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_rep_exports'
        ordering = ['-exported_at']


# ============================================================
# 17. Report Permission — الصلاحيات وأمن البيانات
# ============================================================
class ReportPermission(CombinedSharedModel):
    """
    أمن وصلاحيات الوصول على مستوى الصف والعمود.
    """
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='permissions')
    role_id = models.UUIDField(db_index=True)
    
    can_view = models.BooleanField(default=True)
    can_export = models.BooleanField(default=False)
    can_schedule = models.BooleanField(default=False)
    
    # أمن البيانات المتقدمة
    row_level_filters = models.JSONField(default=dict, blank=True, help_text="فلاتر RLS مثل branch_id, department_id")
    restricted_columns = models.JSONField(default=list, blank=True, help_text="الأعمدة المخفية عن هذا الدور")
    masked_columns = models.JSONField(default=list, blank=True, help_text="الأعمدة المقنعة (المشفرة)")

    class Meta:
        db_table = 'nebras_rep_permissions'
        unique_together = ('report', 'role_id')


# ============================================================
# 18. Dashboard — لوحات القيادة
# ============================================================
class Dashboard(CombinedSharedModel):
    """
    لوحة القيادة الرئيسية (تجمع عدة عناصر ورسوم بيانية).
    """
    category = models.ForeignKey(ReportCategory, on_delete=models.PROTECT, related_name='dashboards')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True, db_index=True)
    is_system = models.BooleanField(default=False)
    view_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'nebras_rep_dashboards'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 19. Dashboard Widget — عناصر لوحات القيادة
# ============================================================
class DashboardWidget(CombinedSharedModel):
    """
    عناصر لوحة القيادة (رسم بياني محدد، بطاقة KPI، تغذية الأنشطة، إلخ).
    """
    WIDGET_TYPES = (
        ('chart', 'رسم بياني'),
        ('kpi', 'مؤشر أداء رئيسي'),
        ('table', 'جدول بيانات'),
        ('activity_feed', 'موجز الأنشطة'),
        ('recent_reports', 'أحدث التقارير'),
        ('quick_filters', 'فلاتر سريعة'),
        ('stats_card', 'بطاقة إحصائية'),
        ('alert_list', 'قائمة التنبيهات'),
    )

    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets')
    report = models.ForeignKey(Report, on_delete=models.SET_NULL, null=True, blank=True)
    
    title = models.CharField(max_length=255)
    widget_type = models.CharField(max_length=30, choices=WIDGET_TYPES, default='chart')
    
    config = models.JSONField(default=dict, blank=True)
    refresh_interval_seconds = models.IntegerField(default=300)

    class Meta:
        db_table = 'nebras_rep_dashboard_widgets'

    def __str__(self):
        return self.title


# ============================================================
# 20. Dashboard Layout — تنسيق لوحات القيادة
# ============================================================
class DashboardLayout(CombinedSharedModel):
    """
    توزيع إحداثيات عناصر لوحات القيادة.
    """
    dashboard = models.OneToOneField(Dashboard, on_delete=models.CASCADE, related_name='layout')
    positions = models.JSONField(default=dict, help_text="أماكن وأحجام الوجات {widget_id: {x, y, w, h}}")

    class Meta:
        db_table = 'nebras_rep_dashboard_layouts'


# ============================================================
# 21. Dashboard Favorite — اللوحات المفضلة
# ============================================================
class DashboardFavorite(CombinedSharedModel):
    """
    تفضيلات المستخدمين للوحات القيادة.
    """
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='favorites')
    user_id = models.UUIDField(db_index=True)

    class Meta:
        db_table = 'nebras_rep_dashboard_favorites'
        unique_together = ('dashboard', 'user_id')


# ============================================================
# 22. KPI — مؤشرات الأداء الرئيسية
# ============================================================
class KPI(CombinedSharedModel):
    """
    مؤشرات الأداء الرئيسية في النظام.
    """
    category = models.ForeignKey(ReportCategory, on_delete=models.PROTECT, related_name='kpis')
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    # المؤشرات والأهداف
    formula = models.TextField(help_text="صيغة احتساب مؤشر الأداء")
    target_value = models.FloatField()
    warning_threshold = models.FloatField()
    critical_threshold = models.FloatField()
    
    current_value = models.FloatField(default=0.0)
    trend = models.CharField(max_length=20, default='stable', choices=(('up', 'صعود'), ('down', 'هبوط'), ('stable', 'مستقر')))
    
    alert_enabled = models.BooleanField(default=False)
    color_rules = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'nebras_rep_kpis'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 23. Metric — المقاييس الرقمية
# ============================================================
class Metric(CombinedSharedModel):
    """
    مقاييس إحصائية يتم تحديثها بشكل مستمر.
    """
    kpi = models.ForeignKey(KPI, on_delete=models.CASCADE, related_name='metrics')
    recorded_at = models.DateTimeField(auto_now_add=True)
    value = models.FloatField()
    target_snapshot = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_rep_metrics'
        ordering = ['-recorded_at']


# ============================================================
# 24. Analytics View — المشاهد التحليلية
# ============================================================
class AnalyticsView(CombinedSharedModel):
    """
    المشاهد التحليلية والتحليلات المقارنة والتاريخية.
    """
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, db_index=True)
    description = models.TextField(blank=True, null=True)
    
    view_definition = models.JSONField(default=dict, help_text="إعدادات التحليل والمدخلات")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_rep_analytics_views'
        unique_together = ('tenant_id', 'code')

    def __str__(self):
        return self.name


# ============================================================
# 25. Materialized View Placeholder — المشاهد المجمعة دورياً
# ============================================================
class MaterializedViewPlaceholder(CombinedSharedModel):
    """
    سجل لتنظيم وتحديث المشاهد المجمعة دورياً (Materialized Views) في PostgreSQL.
    """
    view_name = models.CharField(max_length=150, unique=True, db_index=True)
    sql_definition = models.TextField()
    
    last_refreshed_at = models.DateTimeField(null=True, blank=True)
    refresh_interval_minutes = models.IntegerField(default=60)
    refresh_time_seconds = models.FloatField(default=0.0)

    class Meta:
        db_table = 'nebras_rep_materialized_views'

    def __str__(self):
        return self.view_name
