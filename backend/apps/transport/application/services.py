import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.transport.domain.models import (
    Vehicle, Trip, TripAttendance, Passenger, FuelTransaction, OdometerReading, VehicleInspection
)

# استدعاء خدمات المحاسبة بالمالية
from apps.finance.application.services import PostingService
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, JournalEntry, JournalEntryLine, Currency

# استدعاء الصيانة وأوامر العمل للتكامل
from apps.maintenance.domain.models import MaintenanceRequest, MaintenanceCategory, MaintenancePriority, MaintenanceType


class TripService:
    @staticmethod
    @transaction.atomic
    def start_trip(tenant_id, trip_id, user_id=None):
        """
        انطلاق رحلة نقل مدرسية/عامة وتحديث حالة الباص إلى 'on_trip'.
        """
        trip = Trip.objects.get(tenant_id=tenant_id, id=trip_id)
        if trip.status != 'scheduled':
            raise ValidationError("لا يمكن بدء الرحلة لأنها ليست في وضع الجدولة.")

        trip.status = 'running'
        trip.start_time = timezone.now()
        trip.save()

        # تحديث حالة الباص
        vehicle = trip.vehicle
        vehicle.status = 'on_trip'
        vehicle.save()

        return trip

    @staticmethod
    @transaction.atomic
    def complete_trip(tenant_id, trip_id, user_id=None):
        """
        وصول الرحلة لجميع محطاتها وتفريغ الباص وتغيير حالته إلى 'available'.
        """
        trip = Trip.objects.get(tenant_id=tenant_id, id=trip_id)
        if trip.status != 'running':
            raise ValidationError("الرحلة ليست نشطة أو جارية حالياً.")

        trip.status = 'completed'
        trip.end_time = timezone.now()
        trip.save()

        # تحديث حالة الباص
        vehicle = trip.vehicle
        vehicle.status = 'available'
        vehicle.save()

        return trip

    @staticmethod
    @transaction.atomic
    def record_attendance(tenant_id, trip_id, passenger_id, status='boarded', user_id=None):
        """
        تسجيل صعود/هبوط الراكب أو غيابه عن الباص بالمحطة وتوليد الإشعارات الفورية.
        """
        trip = Trip.objects.get(tenant_id=tenant_id, id=trip_id)
        passenger = Passenger.objects.get(tenant_id=tenant_id, id=passenger_id)

        attendance = TripAttendance.objects.create(
            tenant_id=tenant_id,
            trip=trip,
            passenger=passenger,
            status=status,
            timestamp=timezone.now(),
            created_by=user_id
        )

        return attendance


class FuelService:
    @staticmethod
    @transaction.atomic
    def record_fuel_transaction(tenant_id, vehicle_id, station_id, liters, cost, odometer, debit_gl_account_id, credit_gl_account_id, user_id=None):
        """
        تسجيل تموين وقود للمركبة، وتحديث العداد، وتوليد القيد المالي المقابل تلقائياً بالمالية.
        """
        vehicle = Vehicle.objects.get(tenant_id=tenant_id, id=vehicle_id)
        liters_dec = Decimal(str(liters))
        cost_dec = Decimal(str(cost))
        odometer_dec = Decimal(str(odometer))

        if odometer_dec < vehicle.odometer_value:
            raise ValidationError("قراءة العداد المدخلة أقل من القراءة الحالية المسجلة للمركبة.")

        # 1. إنشاء سجل التعبئة
        tx = FuelTransaction.objects.create(
            tenant_id=tenant_id,
            vehicle=vehicle,
            station_id=station_id,
            liters=liters_dec,
            cost=cost_dec,
            odometer_reading=odometer_dec,
            transaction_date=timezone.now().date(),
            created_by=user_id
        )

        # 2. تحديث قراءات العداد بالمركبة
        vehicle.odometer_value = odometer_dec
        vehicle.save()

        OdometerReading.objects.create(
            tenant_id=tenant_id,
            vehicle=vehicle,
            reading_date=timezone.now().date(),
            reading_value=odometer_dec,
            created_by=user_id
        )

        # 3. توليد القيد المحاسبي بالمالية لمصروفات الوقود
        # الجانب المدين (Debit): حساب مصروفات وقود المركبات
        # الجانب الدائن (Credit): حساب الصندوق/النقدية أو المورد المعتمد
        journal_lines = [
            {
                'account_id': debit_gl_account_id,
                'cost_center_id': None,
                'debit': cost_dec,
                'credit': Decimal('0.00'),
                'description': f"إثبات تكلفة تموين وقود للمركبة {vehicle.vehicle_number} - {liters_dec} لتر"
            },
            {
                'account_id': credit_gl_account_id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': cost_dec,
                'description': f"صرف قيمة وقود حافلة مدرسية من الصندوق/البنك"
            }
        ]

        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if active_fy:
            period = active_fy.periods.filter(start_date__lte=timezone.now().date(), end_date__gte=timezone.now().date()).first()
            if period:
                base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                journal = JournalEntry.objects.create(
                    tenant_id=tenant_id,
                    entry_number=f"TRN-FUEL-{tx.id}",
                    date=timezone.now().date(),
                    accounting_period=period,
                    description=f"قيد تموين استهلاك وقود أسطول حافلات",
                    source_type='automatic',
                    status='approved',
                    currency=base_currency,
                    created_by=user_id
                )

                for line in journal_lines:
                    JournalEntryLine.objects.create(
                        tenant_id=tenant_id,
                        journal_entry=journal,
                        account_id=line['account_id'],
                        cost_center_id=line['cost_center_id'],
                        debit=line['debit'],
                        credit=line['credit'],
                        description=line['description']
                    )

                PostingService.post_journal_entry(tenant_id, journal.id, user_id)
                tx.journal_entry_id = journal.id
                tx.save()

        return tx


class VehicleInspectionService:
    @staticmethod
    @transaction.atomic
    def record_inspection(tenant_id, vehicle_id, status='passed', notes=None, user_id=None):
        """
        تسجيل فحص الحافلة المدرسي. وإذا فشل الفحص الفني، توليد طلب صيانة (CMMS Request) تلقائياً للأصل المقابل.
        """
        vehicle = Vehicle.objects.get(tenant_id=tenant_id, id=vehicle_id)

        inspection = VehicleInspection.objects.create(
            tenant_id=tenant_id,
            vehicle=vehicle,
            inspection_date=timezone.now().date(),
            status=status,
            notes=notes,
            created_by=user_id
        )

        # إذا فشل الفحص الفني، نفتح بلاغ صيانة تلقائي (CMMS Integration)
        if status == 'failed':
            # جلب فئة وأولوية ونوع صيانة افتراضية
            cat = MaintenanceCategory.objects.filter(tenant_id=tenant_id).first()
            prio = MaintenancePriority.objects.filter(tenant_id=tenant_id).first()
            mtype = MaintenanceType.objects.filter(tenant_id=tenant_id).first()

            if cat and prio and mtype:
                MaintenanceRequest.objects.create(
                    tenant_id=tenant_id,
                    request_number=f"TRN-MNT-{inspection.id}",
                    asset=vehicle.asset,
                    category=cat,
                    priority=prio,
                    maint_type=mtype,
                    title=f"بلاغ صيانة تلقائي لفشل فحص الحافلة {vehicle.vehicle_number}",
                    description=notes or "فشلت المركبة في الفحص الفني اليومي التابع لقطاع النقل والمواصلات.",
                    status='submitted',
                    created_by=user_id
                )

        return inspection
