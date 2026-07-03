from django.test import TestCase
import uuid

from apps.reporting.domain.models import (
    ReportCategory, DataSource, ReportDataset, Report, KPI
)
from apps.reporting.application.services import ReportEngineService, ExportService, KPIService


class ReportEngineServiceTest(TestCase):
    """اختبارات محرك التقارير"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.cat = ReportCategory.objects.create(
            tenant_id=self.tenant_id, name='عام', code='general',
        )
        self.ds = DataSource.objects.create(
            tenant_id=self.tenant_id, name='مصدر', code='src',
        )
        self.dataset = ReportDataset.objects.create(
            tenant_id=self.tenant_id, data_source=self.ds,
            name='بيانات الطلاب', code='students_ds',
        )
        self.report = Report.objects.create(
            tenant_id=self.tenant_id,
            category=self.cat,
            dataset=self.dataset,
            name='تقرير الغياب الأسبوعي',
            code='weekly_abs',
            status='published',
        )

    def test_execute_report(self):
        result = ReportEngineService.execute_report(
            tenant_id=self.tenant_id,
            report_id=self.report.id,
            parameters={'grade': 'الصف الأول'},
        )
        self.assertIsNotNone(result)
        self.assertIn('data', result)
        self.assertIn('execution_id', result)
        self.assertEqual(len(result['data']), 3)

    def test_export_to_csv(self):
        csv_data = ExportService.export_to_csv(
            tenant_id=self.tenant_id,
            report_id=self.report.id,
        )
        self.assertIsNotNone(csv_data)
        self.assertIn('أحمد علي', csv_data)


class KPIServiceTest(TestCase):
    """اختبارات خدمة مؤشرات الأداء"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.cat = ReportCategory.objects.create(
            tenant_id=self.tenant_id, name='عام', code='general',
        )
        self.kpi = KPI.objects.create(
            tenant_id=self.tenant_id,
            category=self.cat,
            name='نسبة الحضور اليومي',
            code='daily_attendance_rate',
            formula='avg(attendance)',
            target_value=95.0,
            warning_threshold=90.0,
            critical_threshold=80.0,
        )

    def test_record_metric(self):
        updated_kpi = KPIService.record_metric(
            tenant_id=self.tenant_id,
            kpi_code='daily_attendance_rate',
            value=88.5,
        )
        self.assertEqual(updated_kpi.current_value, 88.5)
        self.assertEqual(updated_kpi.trend, 'up')  # صعود من 0.0 إلى 88.5

        # قيمة تالية للتحقق من الاتجاه
        next_kpi = KPIService.record_metric(
            tenant_id=self.tenant_id,
            kpi_code='daily_attendance_rate',
            value=85.0,
        )
        self.assertEqual(next_kpi.trend, 'down')  # هبوط من 88.5 إلى 85.0
