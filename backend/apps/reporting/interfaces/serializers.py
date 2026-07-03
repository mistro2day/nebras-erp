from rest_framework import serializers
from apps.reporting.domain.models import (
    ReportCategory, DataSource, ReportDataset, Report,
    ReportTemplate, ReportVersion, ReportParameter, ReportFilter,
    ReportColumn, ReportLayout, ReportChart, ReportExecution,
    ReportHistory, ReportSchedule, ReportSubscription, ReportExport,
    ReportPermission, Dashboard, DashboardWidget, DashboardLayout,
    DashboardFavorite, KPI, Metric, AnalyticsView, MaterializedViewPlaceholder
)


class ReportCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportCategory
        fields = '__all__'


class DataSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataSource
        fields = '__all__'
        extra_kwargs = {
            'connection_config': {'write_only': True},
        }


class ReportDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportDataset
        fields = '__all__'


class ReportSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Report
        fields = '__all__'


class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = '__all__'


class ReportVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportVersion
        fields = '__all__'


class ReportParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportParameter
        fields = '__all__'


class ReportFilterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportFilter
        fields = '__all__'


class ReportColumnSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportColumn
        fields = '__all__'


class ReportLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportLayout
        fields = '__all__'


class ReportChartSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportChart
        fields = '__all__'


class ReportExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportExecution
        fields = '__all__'


class ReportHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportHistory
        fields = '__all__'


class ReportScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportSchedule
        fields = '__all__'


class ReportSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportSubscription
        fields = '__all__'


class ReportExportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportExport
        fields = '__all__'


class ReportPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportPermission
        fields = '__all__'


class DashboardSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Dashboard
        fields = '__all__'


class DashboardWidgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardWidget
        fields = '__all__'


class DashboardLayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardLayout
        fields = '__all__'


class DashboardFavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DashboardFavorite
        fields = '__all__'


class KPISerializer(serializers.ModelSerializer):
    class Meta:
        model = KPI
        fields = '__all__'


class MetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = Metric
        fields = '__all__'


class AnalyticsViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsView
        fields = '__all__'


class MaterializedViewPlaceholderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterializedViewPlaceholder
        fields = '__all__'


# ============================================================
# العمليات والتشغيل الاستعلامات
# ============================================================
class ExecuteReportSerializer(serializers.Serializer):
    parameters = serializers.DictField(required=False, default=dict)


class NLQQuerySerializer(serializers.Serializer):
    question = serializers.CharField(max_length=500)
