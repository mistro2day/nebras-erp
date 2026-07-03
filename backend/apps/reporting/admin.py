from django.contrib import admin
from apps.reporting.domain.models import (
    ReportCategory, DataSource, ReportDataset, Report,
    ReportTemplate, ReportVersion, ReportParameter, ReportFilter,
    ReportColumn, ReportLayout, ReportChart, ReportExecution,
    ReportHistory, ReportSchedule, ReportSubscription, ReportExport,
    ReportPermission, Dashboard, DashboardWidget, DashboardLayout,
    DashboardFavorite, KPI, Metric, AnalyticsView, MaterializedViewPlaceholder
)

translations = {
    ReportCategory: ('تصنيف تقارير', '1. تصنيفات التقارير واللوحات'),
    DataSource: ('مصدر بيانات', '2. مصادر البيانات المتصلة'),
    ReportDataset: ('مجموعة بيانات التقرير', '3. مجموعات البيانات (Datasets)'),
    Report: ('تقرير', '4. التقارير المتاحة'),
    ReportTemplate: ('قالب تصميم تقرير', '5. قوالب وتصميم التقارير'),
    ReportVersion: ('إصدار التقرير', '6. سجل إصدارات التقارير'),
    ReportParameter: ('معامل التقرير', '7. المعاملات والمدخلات'),
    ReportFilter: ('فلتر تصفية تقرير', '8. فلاتر التقارير والبحث'),
    ReportColumn: ('عمود تقرير', '9. أعمدة التقرير والعمليات الحسابية'),
    ReportLayout: ('تنسيق وتخطيط تقرير', '10. تنسيقات التقارير'),
    ReportChart: ('رسم بياني مدمج', '11. الرسوم البيانية المدمجة'),
    ReportExecution: ('عملية تشغيل تقرير', '12. تتبع عمليات التشغيل الجارية'),
    ReportHistory: ('أرشيف تقرير منفذ', '13. محفوظات التقارير المخرجة'),
    ReportSchedule: ('جدولة تشغيل تقرير', '14. جدولة التقارير التلقائية'),
    ReportSubscription: ('اشتراك تقرير مجدول', '15. اشتراكات التقارير للمستخدمين'),
    ReportExport: ('سجل تصدير ملف تقرير', '16. سجل وتدقيق عمليات التصدير'),
    ReportPermission: ('صلاحية تقرير وأمن صفوف', '17. صلاحيات الوصول والحماية (RLS)'),
    Dashboard: ('لوحة قيادة تفاعلية', '18. لوحات القيادة (Dashboards)'),
    DashboardWidget: ('عنصر لوحة قيادة', '19. عناصر لوحات القيادة (Widgets)'),
    DashboardLayout: ('تنسيق لوحة قيادة', '20. تنسيقات لوحات القيادة'),
    DashboardFavorite: ('لوحة مفضلة لمستخدم', '21. اللوحات المفضلة للمستخدمين'),
    KPI: ('مؤشر أداء رئيسي', '22. مؤشرات الأداء الرئيسية (KPIs)'),
    Metric: ('قيمة مقياس تاريخية', '23. سجل قيم المقاييس التاريخية'),
    AnalyticsView: ('منظر تحليلي مخصص', '24. المشاهد التحليلية الذكية'),
    MaterializedViewPlaceholder: ('مشهد مجمع بقاعدة البيانات', '25. المشاهد المجمعة (Materialized Views)'),
}

for model, (verbose_name, verbose_name_plural) in translations.items():
    model._meta.verbose_name = verbose_name
    model._meta.verbose_name_plural = verbose_name_plural

admin.site.register(ReportCategory)
admin.site.register(DataSource)
admin.site.register(ReportDataset)
admin.site.register(Report)
admin.site.register(ReportTemplate)
admin.site.register(ReportVersion)
admin.site.register(ReportParameter)
admin.site.register(ReportFilter)
admin.site.register(ReportColumn)
admin.site.register(ReportLayout)
admin.site.register(ReportChart)
admin.site.register(ReportExecution)
admin.site.register(ReportHistory)
admin.site.register(ReportSchedule)
admin.site.register(ReportSubscription)
admin.site.register(ReportExport)
admin.site.register(ReportPermission)
admin.site.register(Dashboard)
admin.site.register(DashboardWidget)
admin.site.register(DashboardLayout)
admin.site.register(DashboardFavorite)
admin.site.register(KPI)
admin.site.register(Metric)
admin.site.register(AnalyticsView)
admin.site.register(MaterializedViewPlaceholder)
