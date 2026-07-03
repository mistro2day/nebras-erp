from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.reporting.interfaces.views import (
    ReportCategoryViewSet, DataSourceViewSet, ReportDatasetViewSet,
    ReportViewSet, ReportTemplateViewSet, ReportVersionViewSet,
    ReportParameterViewSet, ReportFilterViewSet, ReportColumnViewSet,
    ReportLayoutViewSet, ReportChartViewSet, ReportExecutionViewSet,
    ReportHistoryViewSet, ReportScheduleViewSet, ReportSubscriptionViewSet,
    ReportExportViewSet, ReportPermissionViewSet, DashboardViewSet,
    DashboardWidgetViewSet, DashboardLayoutViewSet, DashboardFavoriteViewSet,
    KPIViewSet, MetricViewSet, AnalyticsViewViewSet, MaterializedViewPlaceholderViewSet
)

router = DefaultRouter()
router.register('categories', ReportCategoryViewSet, basename='category')
router.register('data-sources', DataSourceViewSet, basename='data-source')
router.register('datasets', ReportDatasetViewSet, basename='dataset')
router.register('reports', ReportViewSet, basename='report')
router.register('templates', ReportTemplateViewSet, basename='template')
router.register('versions', ReportVersionViewSet, basename='version')
router.register('parameters', ReportParameterViewSet, basename='parameter')
router.register('filters', ReportFilterViewSet, basename='filter')
router.register('columns', ReportColumnViewSet, basename='column')
router.register('layouts', ReportLayoutViewSet, basename='layout')
router.register('charts', ReportChartViewSet, basename='chart')
router.register('executions', ReportExecutionViewSet, basename='execution')
router.register('history', ReportHistoryViewSet, basename='history')
router.register('schedules', ReportScheduleViewSet, basename='schedule')
router.register('subscriptions', ReportSubscriptionViewSet, basename='subscription')
router.register('exports', ReportExportViewSet, basename='export')
router.register('permissions', ReportPermissionViewSet, basename='permission')
router.register('dashboards', DashboardViewSet, basename='dashboard')
router.register('widgets', DashboardWidgetViewSet, basename='widget')
router.register('dashboard-layouts', DashboardLayoutViewSet, basename='dashboard-layout')
router.register('dashboard-favorites', DashboardFavoriteViewSet, basename='dashboard-favorite')
router.register('kpis', KPIViewSet, basename='kpi')
router.register('metrics', MetricViewSet, basename='metric')
router.register('analytics', AnalyticsViewViewSet, basename='analytics')
router.register('materialized-views', MaterializedViewPlaceholderViewSet, basename='materialized-view')

urlpatterns = [
    path('', include(router.urls)),
]
