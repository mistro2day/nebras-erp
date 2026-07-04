import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from apps.transport.domain.models import (
    Vehicle, Driver, Route, RouteStop, Trip, Passenger, TripAttendance,
    FuelStation, FuelTransaction, VehicleInspection, VehicleCategory
)
from apps.transport.application.services import TripService, FuelService, VehicleInspectionService
from apps.assets.domain.models import Asset, AssetCategory, AssetLocation

# موديول الصيانة والمالية للتكامل
from apps.maintenance.domain.models import MaintenanceRequest, MaintenanceCategory, MaintenancePriority, MaintenanceType
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, Currency, AccountType, AccountCategory

class TransportTestCase(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()

        # 1. إعداد المالية لقيد الوقود
        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id,
            code="SAR",
            name_ar="ريال سعودي",
            name_en="Saudi Riyal",
            symbol="SR",
            is_base=True
        )
        self.fiscal_year = FiscalYear.objects.create(
            tenant_id=self.tenant_id,
            name="2026",
            start_date=timezone.datetime(2026, 1, 1).date(),
            end_date=timezone.datetime(2026, 12, 31).date(),
            status='open',
            is_current=True
        )
        self.period = AccountingPeriod.objects.create(
            tenant_id=self.tenant_id,
            fiscal_year=self.fiscal_year,
            name="Full Year 2026",
            start_date=timezone.datetime(2026, 1, 1).date(),
            end_date=timezone.datetime(2026, 12, 31).date(),
            status='open'
        )

        self.type_asset = AccountType.objects.create(
            tenant_id=self.tenant_id, code='asset', name_ar='أصول', name_en='Assets', normal_balance='debit'
        )
        self.type_expense = AccountType.objects.create(
            tenant_id=self.tenant_id, code='expense', name_ar='مصروفات', name_en='Expenses', normal_balance='debit'
        )
        self.cat_current = AccountCategory.objects.create(
            tenant_id=self.tenant_id, code='current_assets', name_ar='أصول متداولة', name_en='Current Assets', account_type=self.type_asset
        )

        self.fuel_expense_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="320404",
            name_ar="مصروفات وقود سيارات",
            name_en="Vehicle Fuel Expenses",
            account_type=self.type_expense,
            account_category=self.cat_current,
            normal_balance='debit',
            status='active'
        )
        self.offset_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="110101",
            name_ar="نقدية بالصندوق",
            name_en="Cash on Hand",
            account_type=self.type_asset,
            account_category=self.cat_current,
            normal_balance='debit',
            status='active'
        )

        # 2. إعداد أصل الحافلة
        self.asset_cat = AssetCategory.objects.create(
            tenant_id=self.tenant_id, code="BUS", name_ar="حافلات مدرسية", name_en="School Buses"
        )
        self.asset_loc = AssetLocation.objects.create(
            tenant_id=self.tenant_id, code="GARAGE", name_ar="المرآب الرئيسي", name_en="Main Garage"
        )
        self.asset = Asset.objects.create(
            tenant_id=self.tenant_id,
            asset_number="BUS-100",
            name_ar="حافلة مرسيدس 30 راكب",
            name_en="Mercedes 30-Seater Bus",
            category=self.asset_cat,
            location=self.asset_loc,
            acquisition_cost=Decimal('200000.00'),
            salvage_value=Decimal('20000.00'),
            book_value=Decimal('200000.00'),
            useful_life_months=120,
            status='capitalized'
        )

        # 3. إعداد المركبة بالأسطول
        self.vehicle = Vehicle.objects.create(
            tenant_id=self.tenant_id,
            asset=self.asset,
            vehicle_number="V-100",
            plate_number="أ ب ج 1234",
            capacity=30,
            fuel_type='diesel',
            odometer_value=Decimal('1000.00'),
            status='available'
        )

        # 4. السائق والمسار والرحلة
        self.driver = Driver.objects.create(
            tenant_id=self.tenant_id,
            employee_id=uuid.uuid4(),
            license_number="DL-9080",
            license_type="عمومي ثقيل"
        )
        self.route = Route.objects.create(
            tenant_id=self.tenant_id,
            code="R-NORTH",
            name_ar="مسار حافلات الشمال",
            name_en="North District Route"
        )
        self.trip = Trip.objects.create(
            tenant_id=self.tenant_id,
            route=self.route,
            vehicle=self.vehicle,
            driver=self.driver,
            status='scheduled'
        )

        # 5. محطة وقود
        self.station = FuelStation.objects.create(
            tenant_id=self.tenant_id,
            name_ar="محطة سهل التموينية",
            name_en="Sahel Fuel Station"
        )

        # 6. تصنيفات وأولويات الصيانة لبلاغات الأعطال
        self.maint_cat = MaintenanceCategory.objects.create(
            tenant_id=self.tenant_id, code="MECH", name_ar="ميكانيكية", name_en="Mechanical"
        )
        self.maint_prio = MaintenancePriority.objects.create(
            tenant_id=self.tenant_id, code="HIGH", name_ar="عالية", name_en="High"
        )
        self.maint_type = MaintenanceType.objects.create(
            tenant_id=self.tenant_id, code="CORR", name_ar="علاجية طارئة", name_en="Corrective"
        )

    def test_trip_lifecycle_and_attendance(self):
        # 1. بدء الرحلة
        running_trip = TripService.start_trip(self.tenant_id, self.trip.id)
        self.vehicle.refresh_from_db()
        self.assertEqual(running_trip.status, 'running')
        self.assertEqual(self.vehicle.status, 'on_trip')

        # 2. تسجيل حضور صعود الطالب
        student_passenger = Passenger.objects.create(
            tenant_id=self.tenant_id,
            user_id=uuid.uuid4()
        )
        att = TripService.record_attendance(
            tenant_id=self.tenant_id,
            trip_id=self.trip.id,
            passenger_id=student_passenger.id,
            status='boarded'
        )
        self.assertEqual(att.status, 'boarded')

        # 3. إكمال الرحلة وتفريغ الباص
        completed_trip = TripService.complete_trip(self.tenant_id, self.trip.id)
        self.vehicle.refresh_from_db()
        self.assertEqual(completed_trip.status, 'completed')
        self.assertEqual(self.vehicle.status, 'available')

    def test_fuel_transaction_and_financial_posting(self):
        # تموين وقود 50 لتر بتكلفة 150 ريال وتحديث العداد لـ 1080 كم
        tx = FuelService.record_fuel_transaction(
            tenant_id=self.tenant_id,
            vehicle_id=self.vehicle.id,
            station_id=self.station.id,
            liters=50,
            cost=150,
            odometer=1080,
            debit_gl_account_id=self.fuel_expense_account.id,
            credit_gl_account_id=self.offset_account.id
        )

        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.odometer_value, Decimal('1080.00'))
        self.assertIsNotNone(tx.journal_entry_id)

    def test_failed_inspection_triggers_cmms_request(self):
        # تسجيل فشل كشف الأمان والفرامل
        inspection = VehicleInspectionService.record_inspection(
            tenant_id=self.tenant_id,
            vehicle_id=self.vehicle.id,
            status='failed',
            notes="فشل فحص الفرامل الخلفية وزيت المحرك ناقص بشكل حرج."
        )

        self.assertEqual(inspection.status, 'failed')
        
        # التأكد من تكامل الصيانة التلقائي (توليد بلاغ صيانة للأصل)
        request = MaintenanceRequest.objects.filter(
            tenant_id=self.tenant_id,
            asset=self.asset
        ).first()

        self.assertIsNotNone(request)
        self.assertTrue("بلاغ صيانة تلقائي لفشل فحص الحافلة" in request.title)
