from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from apps.shared.interfaces.views import BaseCRUDViewSet
from apps.common.responses import StandardResponse

from apps.reporting.domain.models import (
    ReportCategory, DataSource, ReportDataset, Report,
    ReportTemplate, ReportVersion, ReportParameter, ReportFilter,
    ReportColumn, ReportLayout, ReportChart, ReportExecution,
    ReportHistory, ReportSchedule, ReportSubscription, ReportExport,
    ReportPermission, Dashboard, DashboardWidget, DashboardLayout,
    DashboardFavorite, KPI, Metric, AnalyticsView, MaterializedViewPlaceholder
)
from apps.reporting.interfaces.serializers import (
    ReportCategorySerializer, DataSourceSerializer, ReportDatasetSerializer,
    ReportSerializer, ReportTemplateSerializer, ReportVersionSerializer,
    ReportParameterSerializer, ReportFilterSerializer, ReportColumnSerializer,
    ReportLayoutSerializer, ReportChartSerializer, ReportExecutionSerializer,
    ReportHistorySerializer, ReportScheduleSerializer, ReportSubscriptionSerializer,
    ReportExportSerializer, ReportPermissionSerializer, DashboardSerializer,
    DashboardWidgetSerializer, DashboardLayoutSerializer, DashboardFavoriteSerializer,
    KPISerializer, MetricSerializer, AnalyticsViewSerializer,
    MaterializedViewPlaceholderSerializer, ExecuteReportSerializer, NLQQuerySerializer
)
from apps.reporting.application.services import ReportEngineService, ExportService, KPIService


# ============================================================
# ViewSets للتقارير
# ============================================================
class ReportCategoryViewSet(BaseCRUDViewSet):
    model_class = ReportCategory
    serializer_class = ReportCategorySerializer


class DataSourceViewSet(BaseCRUDViewSet):
    model_class = DataSource
    serializer_class = DataSourceSerializer


class ReportDatasetViewSet(BaseCRUDViewSet):
    model_class = ReportDataset
    serializer_class = ReportDatasetSerializer


class ReportViewSet(BaseCRUDViewSet):
    model_class = Report
    serializer_class = ReportSerializer

    @action(detail=True, methods=['post'], url_path='execute')
    def execute(self, request, pk=None):
        """تشغيل التقرير وجلب البيانات."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = ExecuteReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = ReportEngineService.execute_report(
            tenant_id=tenant_id,
            report_id=pk,
            parameters=serializer.validated_data.get('parameters', {}),
            user_id=request.user.id if request.user else None
        )
        return StandardResponse(data=result, message="تم تشغيل التقرير بنجاح.")

    @action(detail=True, methods=['post'], url_path='export-csv')
    def export_csv(self, request, pk=None):
        """تصدير التقرير كـ CSV."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        serializer = ExecuteReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        csv_data = ExportService.export_to_csv(
            tenant_id=tenant_id,
            report_id=pk,
            parameters=serializer.validated_data.get('parameters', {}),
            user_id=request.user.id if request.user else None
        )
        response = Response(csv_data, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="report_{pk}.csv"'
        return response


class ReportTemplateViewSet(BaseCRUDViewSet):
    model_class = ReportTemplate
    serializer_class = ReportTemplateSerializer


class ReportVersionViewSet(BaseCRUDViewSet):
    model_class = ReportVersion
    serializer_class = ReportVersionSerializer


class ReportParameterViewSet(BaseCRUDViewSet):
    model_class = ReportParameter
    serializer_class = ReportParameterSerializer


class ReportFilterViewSet(BaseCRUDViewSet):
    model_class = ReportFilter
    serializer_class = ReportFilterSerializer


class ReportColumnViewSet(BaseCRUDViewSet):
    model_class = ReportColumn
    serializer_class = ReportColumnSerializer


class ReportLayoutViewSet(BaseCRUDViewSet):
    model_class = ReportLayout
    serializer_class = ReportLayoutSerializer


class ReportChartViewSet(BaseCRUDViewSet):
    model_class = ReportChart
    serializer_class = ReportChartSerializer


class ReportExecutionViewSet(BaseCRUDViewSet):
    model_class = ReportExecution
    serializer_class = ReportExecutionSerializer


class ReportHistoryViewSet(BaseCRUDViewSet):
    model_class = ReportHistory
    serializer_class = ReportHistorySerializer


class ReportScheduleViewSet(BaseCRUDViewSet):
    model_class = ReportSchedule
    serializer_class = ReportScheduleSerializer


class ReportSubscriptionViewSet(BaseCRUDViewSet):
    model_class = ReportSubscription
    serializer_class = ReportSubscriptionSerializer


class ReportExportViewSet(BaseCRUDViewSet):
    model_class = ReportExport
    serializer_class = ReportExportSerializer


class ReportPermissionViewSet(BaseCRUDViewSet):
    model_class = ReportPermission
    serializer_class = ReportPermissionSerializer


# ============================================================
# ViewSets للوحات القيادة
# ============================================================
class DashboardViewSet(BaseCRUDViewSet):
    model_class = Dashboard
    serializer_class = DashboardSerializer


class DashboardWidgetViewSet(BaseCRUDViewSet):
    model_class = DashboardWidget
    serializer_class = DashboardWidgetSerializer


class DashboardLayoutViewSet(BaseCRUDViewSet):
    model_class = DashboardLayout
    serializer_class = DashboardLayoutSerializer


class DashboardFavoriteViewSet(BaseCRUDViewSet):
    model_class = DashboardFavorite
    serializer_class = DashboardFavoriteSerializer


# ============================================================
# ViewSets للمؤشرات والتحليلات
# ============================================================
class KPIViewSet(BaseCRUDViewSet):
    model_class = KPI
    serializer_class = KPISerializer

    @action(detail=True, methods=['post'], url_path='record-value')
    def record_value(self, request, pk=None):
        """تسجيل قيمة للمؤشر لتحديث الاتجاه والتاريخ."""
        tenant_id = request.tenant.id if hasattr(request, 'tenant') and request.tenant else None
        value = request.data.get('value')
        if value is None:
            return StandardResponse(data=None, message="يجب تحديد القيمة.", status=status.HTTP_400_BAD_REQUEST)
        
        kpi = KPI.objects.get(id=pk, tenant_id=tenant_id)
        updated_kpi = KPIService.record_metric(tenant_id, kpi.code, float(value))
        return StandardResponse(data=KPISerializer(updated_kpi).data, message="تم تحديث المؤشر.")


class MetricViewSet(BaseCRUDViewSet):
    model_class = Metric
    serializer_class = MetricSerializer


class AnalyticsViewViewSet(BaseCRUDViewSet):
    model_class = AnalyticsView
    serializer_class = AnalyticsViewSerializer

    @action(detail=False, methods=['post'], url_path='nlq-ask')
    def nlq_ask(self, request):
        """استقبال استعلام باللغة الطبيعية (AI NLQ Placeholder)."""
        serializer = NLQQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # تجاوب تجريبي لتثبيت واجهات الـ AI
        result = {
            'interpreted_query': 'SELECT * FROM student_attendance WHERE rate < 90',
            'suggested_filters': {'attendance_rate_less': 90},
            'summary': f"تحليل للاستعلام: {serializer.validated_data['question']}",
        }
        return StandardResponse(data=result, message="تم تحليل السؤال الذكي بنجاح.")


class MaterializedViewPlaceholderViewSet(BaseCRUDViewSet):
    model_class = MaterializedViewPlaceholder
    serializer_class = MaterializedViewPlaceholderSerializer
