from django.test import TestCase
import uuid

from apps.reporting.domain.models import (
    ReportCategory, DataSource, ReportDataset, Report,
    ReportTemplate, ReportVersion, KPI, Dashboard
)


class ReportCategoryModelTest(TestCase):
    """اختبارات نموذج فئات التقارير"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_category(self):
        cat = ReportCategory.objects.create(
            tenant_id=self.tenant_id,
            name='أكاديمي',
            code='academic',
            category_type='academic',
        )
        self.assertEqual(cat.name, 'أكاديمي')
        self.assertEqual(cat.code, 'academic')


class DataSourceModelTest(TestCase):
    """اختبارات نموذج مصادر البيانات"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_create_data_source(self):
        ds = DataSource.objects.create(
            tenant_id=self.tenant_id,
            name='مشهد الطلاب النشطين',
            code='active_students_view',
            source_type='db_view',
            query_template='SELECT * FROM active_students',
        )
        self.assertEqual(ds.code, 'active_students_view')
        self.assertTrue(ds.is_active)


class ReportModelTest(TestCase):
    """اختبارات نموذج التقارير"""

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

    def test_create_report(self):
        report = Report.objects.create(
            tenant_id=self.tenant_id,
            category=self.cat,
            dataset=self.dataset,
            name='تقرير الغياب الأسبوعي',
            code='weekly_abs',
            status='draft',
        )
        self.assertEqual(report.status, 'draft')
        self.assertEqual(report.view_count, 0)


class KPIModelTest(TestCase):
    """اختبارات نموذج مؤشرات الأداء"""

    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.cat = ReportCategory.objects.create(
            tenant_id=self.tenant_id, name='عام', code='general',
        )

    def test_create_kpi(self):
        kpi = KPI.objects.create(
            tenant_id=self.tenant_id,
            category=self.cat,
            name='نسبة النجاح العامة',
            code='overall_success_rate',
            formula='(passed / total) * 100',
            target_value=90.0,
            warning_threshold=85.0,
            critical_threshold=75.0,
        )
        self.assertEqual(kpi.target_value, 90.0)
        self.assertEqual(kpi.current_value, 0.0)
