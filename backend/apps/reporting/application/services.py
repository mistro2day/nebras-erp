import logging
import csv
import json
import io
from datetime import datetime
from django.utils import timezone
from django.db import transaction, connection
from django.core.cache import cache

from apps.reporting.domain.models import (
    ReportCategory, DataSource, ReportDataset, Report,
    ReportTemplate, ReportVersion, ReportParameter, ReportFilter,
    ReportColumn, ReportLayout, ReportChart, ReportExecution,
    ReportHistory, ReportSchedule, ReportSubscription, ReportExport,
    ReportPermission, Dashboard, DashboardWidget, DashboardLayout,
    DashboardFavorite, KPI, Metric, AnalyticsView, MaterializedViewPlaceholder
)

logger = logging.getLogger('nebras.reporting')


# ============================================================
# 1. Report Engine Service — محرك التقارير المركزي
# ============================================================
class ReportEngineService:
    """
    الخدمة المركزية لتشغيل التقارير وتجميع البيانات ديناميكياً.
    """

    @classmethod
    def execute_report(cls, tenant_id, report_id, parameters=None, user_id=None):
        """
        تشغيل تقرير وجلب بياناته مع تطبيق الصلاحيات والـ RLS.
        """
        start_time = timezone.now()
        report = Report.objects.select_related('dataset', 'dataset__data_source').get(
            id=report_id, tenant_id=tenant_id
        )

        # 1. تسجيل بدء التنفيذ
        execution = ReportExecution.objects.create(
            tenant_id=tenant_id,
            report=report,
            parameters_used=parameters or {},
            status='processing',
            triggered_by=user_id,
        )

        try:
            # 2. بناء الاستعلام مع البارامترات
            data = cls._fetch_data(report, parameters or {}, tenant_id)

            # 3. إكمال التنفيذ بنجاح
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            execution.status = 'completed'
            execution.completed_at = end_time
            execution.execution_time_seconds = duration
            execution.save()

            report.last_executed_at = end_time
            report.view_count += 1
            report.save(update_fields=['last_executed_at', 'view_count'])

            return {
                'execution_id': execution.id,
                'data': data,
                'duration_seconds': duration,
            }

        except Exception as e:
            logger.error(f"خطأ في تشغيل التقرير {report_id}: {e}")
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.save()
            raise e

    # أنواع المصادر التي تُنفَّذ كـ SQL على قاعدة البيانات
    _SQL_SOURCE_TYPES = ('db_view', 'materialized_view', 'stored_procedure')

    @classmethod
    def _fetch_data(cls, report, parameters, tenant_id):
        """
        جلب البيانات الفعلية بتشغيل استعلام مصدر البيانات على قاعدة البيانات.

        الأمان:
        - عزل المستأجر: tenant_id يُمرَّر كمعامل مربوط %(tenant_id)s، والاستعلامات
          يجب أن تُصفّي به. (كتّاب التقارير إداريون، والاستعلام شبه موثوق.)
        - معاملات المستخدم تُربَط كـ %(key)s عبر cursor (لا إقحام نصّي — لا حقن SQL).
        - للقراءة فقط: يُرفض أي استعلام ليس SELECT/WITH لمنع الكتابة عبر تقرير.
        """
        dataset = report.dataset
        ds = dataset.data_source

        # الاستعلام الفعّال: تجاوز مجموعة البيانات ثم قالب المصدر
        sql = (dataset.query_override or ds.query_template or '').strip()
        if not sql:
            raise ValueError("مصدر البيانات لا يحتوي استعلاماً قابلاً للتشغيل.")

        if ds.source_type not in cls._SQL_SOURCE_TYPES:
            raise ValueError(
                f"نوع المصدر '{ds.source_type}' غير مدعوم للتشغيل المباشر بعد "
                f"(المدعوم: {', '.join(cls._SQL_SOURCE_TYPES)})."
            )

        # حارس القراءة فقط: يُسمح بـ SELECT أو WITH ... SELECT حصراً، وعبارة واحدة
        cls._assert_read_only(sql)

        # كاش لتفادي الاستعلامات المتكررة
        cache_key = f"nebras:rep:data:{tenant_id}:{report.id}:{hash(frozenset((parameters or {}).items()))}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return json.loads(cached_data)

        # معاملات مربوطة: المستأجر دائماً + معاملات التقرير (كلها آمنة عبر الـcursor)
        bound = {'tenant_id': str(tenant_id)}
        bound.update({k: v for k, v in (parameters or {}).items()})

        with connection.cursor() as cursor:
            cursor.execute(sql, bound)
            columns = [col[0] for col in cursor.description] if cursor.description else []
            rows = cursor.fetchall()

        results = [dict(zip(columns, cls._jsonify_row(row))) for row in rows]

        # حفظ في الكاش لمدة 5 دقائق
        cache.set(cache_key, json.dumps(results, default=str), 300)
        return results

    @staticmethod
    def _assert_read_only(sql):
        """يرفض أي استعلام غير قراءة أو متعدّد العبارات (حماية من الكتابة/الحقن)."""
        lowered = sql.lstrip().lower()
        if not (lowered.startswith('select') or lowered.startswith('with')):
            raise ValueError("يُسمح باستعلامات القراءة (SELECT/WITH) فقط في التقارير.")
        # منع تعدد العبارات (فاصلة منقوطة في غير آخر السطر)
        stripped = sql.strip().rstrip(';')
        if ';' in stripped:
            raise ValueError("لا يُسمح بأكثر من عبارة SQL واحدة في التقرير.")

    @staticmethod
    def _jsonify_row(row):
        """تحويل القيم غير القابلة للتسلسل (تواريخ، Decimal، UUID) إلى نصوص/أرقام."""
        from decimal import Decimal
        out = []
        for v in row:
            if isinstance(v, Decimal):
                out.append(float(v))
            elif hasattr(v, 'isoformat'):  # date/datetime
                out.append(v.isoformat())
            elif v is not None and not isinstance(v, (str, int, float, bool)):
                out.append(str(v))
            else:
                out.append(v)
        return out


# ============================================================
# 2. Export Service — تصدير التقارير
# ============================================================
class ExportService:
    """
    تصدير التقارير إلى صيغ مختلفة (PDF, Excel, CSV).
    """

    @classmethod
    def export_to_csv(cls, tenant_id, report_id, parameters=None, user_id=None):
        """تصدير تقرير إلى صيغة CSV."""
        res = ReportEngineService.execute_report(tenant_id, report_id, parameters, user_id)
        data = res['data']

        output = io.StringIO()
        writer = csv.writer(output)

        if data:
            # كتابة العناوين
            headers = data[0].keys()
            writer.writerow(headers)
            # كتابة الصفوف
            for row in data:
                writer.writerow(row.values())

        csv_data = output.getvalue()
        
        cls._log_export(tenant_id, report_id, user_id, 'csv', 'csv')
        return csv_data

    @classmethod
    def export_to_pdf(cls, tenant_id, report_id, parameters=None, user_id=None):
        """تصدير تقرير إلى PDF عربي منسّق (RTL + تشكيل)."""
        from apps.reporting.application.exporters import PdfExporter
        report, data, tenant_name = cls._prepare(tenant_id, report_id, parameters, user_id)
        pdf = PdfExporter.build(
            report_name=report.name,
            rows=data,
            tenant_name=tenant_name,
            subtitle=report.description or '',
            generated_at=timezone.now().strftime('%Y-%m-%d %H:%M'),
        )
        cls._log_export(tenant_id, report_id, user_id, 'pdf', 'pdf')
        return pdf

    @classmethod
    def export_to_excel(cls, tenant_id, report_id, parameters=None, user_id=None):
        """تصدير تقرير إلى Excel بورقة RTL منسّقة."""
        from apps.reporting.application.exporters import ExcelExporter
        report, data, tenant_name = cls._prepare(tenant_id, report_id, parameters, user_id)
        xlsx = ExcelExporter.build(
            report_name=report.name,
            rows=data,
            tenant_name=tenant_name,
            generated_at=timezone.now().strftime('%Y-%m-%d %H:%M'),
        )
        cls._log_export(tenant_id, report_id, user_id, 'excel', 'xlsx')
        return xlsx

    @staticmethod
    def _prepare(tenant_id, report_id, parameters, user_id):
        """يشغّل التقرير ويجلب اسم المستأجر — نواة مشتركة لكل المُصدِّرات."""
        from apps.reporting.domain.models import Report
        res = ReportEngineService.execute_report(tenant_id, report_id, parameters, user_id)
        report = Report.objects.get(id=report_id, tenant_id=tenant_id)
        tenant_name = ''
        try:
            from apps.tenants.domain.models import Tenant
            t = Tenant.objects.filter(id=tenant_id).first()
            if t:
                # الاسم العربي أولاً للترويسة الرسمية
                tenant_name = getattr(t, 'name_ar', None) or getattr(t, 'name', '')
        except Exception:
            pass
        return report, res['data'], tenant_name

    @staticmethod
    def _log_export(tenant_id, report_id, user_id, fmt, ext):
        ReportExport.objects.create(
            tenant_id=tenant_id,
            report_id=report_id,
            exported_by=user_id,
            format=fmt,
            file_name=f"report_{report_id}_{timezone.now().strftime('%Y%m%d%H%M')}.{ext}",
        )


# ============================================================
# 3. KPI Service — إدارة مؤشرات الأداء
# ============================================================
class KPIService:
    """
    حساب وتحديث مؤشرات الأداء الرئيسية (KPIs).
    """

    @classmethod
    def record_metric(cls, tenant_id, kpi_code, value):
        """تسجيل قيمة جديدة لمؤشر أداء وحساب الاتجاه."""
        kpi = KPI.objects.get(code=kpi_code, tenant_id=tenant_id)
        
        with transaction.atomic():
            # حفظ المستهدف السابق للمقارنة
            prev_value = kpi.current_value
            
            # تسجيل القيمة في السجل التاريخي للمقاييس
            Metric.objects.create(
                tenant_id=tenant_id,
                kpi=kpi,
                value=value,
                target_snapshot=kpi.target_value,
            )

            # تحديد الاتجاه
            if value > prev_value:
                trend = 'up'
            elif value < prev_value:
                trend = 'down'
            else:
                trend = 'stable'

            # تحديث بطاقة مؤشر الأداء
            kpi.current_value = value
            kpi.trend = trend
            kpi.save()

            return kpi
