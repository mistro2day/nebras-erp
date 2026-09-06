import uuid
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.tenants.domain.models import Tenant
from apps.transport.domain.models import (
    VehicleCategory, VehicleType, Fleet, Vehicle, Driver, DriverLicense,
    DriverAssignment, Route, RouteStop, Trip, BusRentalAgreement,
    BusRentalPayment, VehicleGPSLocation, Passenger, TripAttendance
)

class Command(BaseCommand):
    help = 'بذر وتجهيز بيانات الأسطول والنقل المدرسي في السودان (حافلات مستأجرة ومملوكة، مسارات، وعقود إيجار)'

    def handle(self, *args, **options):
        self.stdout.write("بدء بذر بيانات النقل المدرسي والأسطول السوداني...")

        # جلب المستأجر النشط (مدارس المورد النموذجية)
        tenant = Tenant.objects.filter(is_active=True).first()
        if not tenant:
            self.stdout.write(self.style.ERROR("لا يوجد مستأجر نشط في النظام."))
            return

        tenant_id = tenant.id
        self.stdout.write(f"المستأجر المعتمد: {tenant.name_ar or tenant.name} ({tenant_id})")

        # 1. فئات وأنواع المركبات
        cat_bus, _ = VehicleCategory.objects.get_or_create(
            tenant_id=tenant_id,
            code='SCHOOL_BUS',
            defaults={'name_ar': 'حافلات النقل المدرسي', 'name_en': 'School Buses'}
        )
        cat_van, _ = VehicleCategory.objects.get_or_create(
            tenant_id=tenant_id,
            code='MINI_VAN',
            defaults={'name_ar': 'حافلات صغيرة (هايس)', 'name_en': 'Mini Vans'}
        )

        type_coaster, _ = VehicleType.objects.get_or_create(
            tenant_id=tenant_id,
            name_ar='تويوتا كوستر (30 راكب)',
            defaults={'name_en': 'Toyota Coaster (30 Seats)'}
        )
        type_rosa, _ = VehicleType.objects.get_or_create(
            tenant_id=tenant_id,
            name_ar='ميتسوبيشي روزا (28 راكب)',
            defaults={'name_en': 'Mitsubishi Rosa (28 Seats)'}
        )
        type_hiace, _ = VehicleType.objects.get_or_create(
            tenant_id=tenant_id,
            name_ar='تويوتا هايس سقف عالي (15 راكب)',
            defaults={'name_en': 'Toyota Hiace High Roof (15 Seats)'}
        )

        # 2. أساطيل النقل
        fleet_main, _ = Fleet.objects.get_or_create(
            tenant_id=tenant_id,
            name_ar='أسطول نقل الطلاب العام — ولاية الخرطوم',
            defaults={'name_en': 'Main Student Transport Fleet - Khartoum'}
        )

        # 3. الحافلات (مع التركيز على الحافلات المستأجرة بعقد اتفاق مع المالكين)
        v1, _ = Vehicle.objects.get_or_create(
            tenant_id=tenant_id,
            vehicle_number='BUS-101',
            defaults={
                'plate_number': 'خ 4 / 38921',
                'vin': 'JTE53B01928471625',
                'capacity': 30,
                'fuel_type': 'diesel',
                'odometer_value': Decimal('142500.00'),
                'status': 'on_trip',
                'ownership_type': 'contracted',
                'owner_name': 'حاج النور عبد الله دفع الله',
                'owner_phone': '0912384920',
                'owner_national_id': '1976-1029-48201',
                'owner_bank_name': 'بنك الخرطوم (تطبيق بنكك)',
                'owner_bank_account': '1839201',
                'monthly_rent_sdg': Decimal('750000.00'),
                'rent_payment_method': 'bankak'
            }
        )

        v2, _ = Vehicle.objects.get_or_create(
            tenant_id=tenant_id,
            vehicle_number='BUS-102',
            defaults={
                'plate_number': 'خ 7 / 51204',
                'vin': 'MMC78C91827463521',
                'capacity': 28,
                'fuel_type': 'diesel',
                'odometer_value': Decimal('98400.00'),
                'status': 'available',
                'ownership_type': 'contracted',
                'owner_name': 'عثمان الفاتح ميرغني',
                'owner_phone': '0923485719',
                'owner_national_id': '1982-2091-58392',
                'owner_bank_name': 'بنك الخرطوم (تطبيق بنكك)',
                'owner_bank_account': '2940182',
                'monthly_rent_sdg': Decimal('680000.00'),
                'rent_payment_method': 'bankak'
            }
        )

        v3, _ = Vehicle.objects.get_or_create(
            tenant_id=tenant_id,
            vehicle_number='BUS-103',
            defaults={
                'plate_number': 'خ 2 / 19482',
                'vin': 'JTE21A83920194827',
                'capacity': 15,
                'fuel_type': 'petrol',
                'odometer_value': Decimal('65200.00'),
                'status': 'available',
                'ownership_type': 'owned',
                'owner_name': 'مدارس المورد النموذجية الخاصة',
                'owner_phone': '0912345678',
                'monthly_rent_sdg': Decimal('0.00'),
                'rent_payment_method': 'cash'
            }
        )

        # 4. عقود إيجار الحافلات ودفعات الإيجار
        agr1, _ = BusRentalAgreement.objects.get_or_create(
            tenant_id=tenant_id,
            vehicle=v1,
            defaults={
                'owner_name': 'حاج النور عبد الله دفع الله',
                'owner_phone': '0912384920',
                'owner_national_id': '1976-1029-48201',
                'monthly_rent_sdg': Decimal('750000.00'),
                'payment_method': 'bankak',
                'bank_name': 'بنك الخرطوم (تطبيق بنكك)',
                'bank_account_number': '1839201',
                'start_date': timezone.localdate().replace(month=8, day=1),
                'status': 'active',
                'terms_notes': 'عقد سنوي يتضمن توفير الحافلة جاهزة للرحلات الصباحية والمسائية مع تكفل المالك بالصيانة الدورية'
            }
        )

        agr2, _ = BusRentalAgreement.objects.get_or_create(
            tenant_id=tenant_id,
            vehicle=v2,
            defaults={
                'owner_name': 'عثمان الفاتح ميرغني',
                'owner_phone': '0923485719',
                'owner_national_id': '1982-2091-58392',
                'monthly_rent_sdg': Decimal('680000.00'),
                'payment_method': 'bankak',
                'bank_name': 'بنك الخرطوم (تطبيق بنكك)',
                'bank_account_number': '2940182',
                'start_date': timezone.localdate().replace(month=8, day=1),
                'status': 'active',
                'terms_notes': 'عقد اتفاق خط أم درمان شاملاً الحافلة والسائق'
            }
        )

        # دفعات الإيجار
        BusRentalPayment.objects.get_or_create(
            tenant_id=tenant_id,
            agreement=agr1,
            vehicle=v1,
            period_label='إيجار شهر أغسطس 2026',
            defaults={
                'amount_sdg': Decimal('750000.00'),
                'payment_date': timezone.localdate().replace(month=8, day=31),
                'payment_method': 'bankak',
                'reference_number': 'BTO-20260831-94821',
                'status': 'paid',
                'notes': 'تم التحويل عبر تطبيق بنكك - بنك الخرطوم بحساب المالك'
            }
        )
        BusRentalPayment.objects.get_or_create(
            tenant_id=tenant_id,
            agreement=agr1,
            vehicle=v1,
            period_label='إيجار شهر سبتمبر 2026',
            defaults={
                'amount_sdg': Decimal('750000.00'),
                'payment_date': timezone.localdate(),
                'payment_method': 'bankak',
                'reference_number': '',
                'status': 'pending',
                'notes': 'مستحق الصرف في نهاية الشهر الحالي'
            }
        )

        # 5. السائقين
        d1, _ = Driver.objects.get_or_create(
            tenant_id=tenant_id,
            employee_id=uuid.uuid4(),
            defaults={
                'license_number': 'LIC-KHT-9482',
                'license_type': 'رخصة قيادة عامة (ثقيل)'
            }
        )
        d2, _ = Driver.objects.get_or_create(
            tenant_id=tenant_id,
            employee_id=uuid.uuid4(),
            defaults={
                'license_number': 'LIC-OMD-5821',
                'license_type': 'رخصة قيادة عامة'
            }
        )

        DriverAssignment.objects.get_or_create(
            tenant_id=tenant_id,
            driver=d1,
            vehicle=v1,
            defaults={'is_active': True}
        )
        DriverAssignment.objects.get_or_create(
            tenant_id=tenant_id,
            driver=d2,
            vehicle=v2,
            defaults={'is_active': True}
        )

        # 6. مسارات وخطوط النقل ومحطات التجمع
        r1, _ = Route.objects.get_or_create(
            tenant_id=tenant_id,
            code='RT-KHT-01',
            defaults={
                'name_ar': 'خط الخرطوم شرق — العمارات والرياض والستين',
                'name_en': 'East Khartoum Route - Al-Amarat & Al-Riyadh',
                'estimated_distance_km': Decimal('22.50')
            }
        )
        stops_r1 = [
            ('محطة لفة الجريف غرب', 'Al-Jiraif West Stop', 1, 15.5822000, 32.5695000),
            ('محطة شارع الستين تقاطع المشتل', 'Al-Mashtal & 60th St', 2, 15.5780000, 32.5590000),
            ('محطة شارع 15 العمارات', 'Street 15 Al-Amarat', 3, 15.5720000, 32.5450000),
            ('مجمع مدارس المورد النموذجية (المقر)', 'Al-Mawred School Campus', 4, 15.5680000, 32.5390000),
        ]
        for name_ar, name_en, seq, lat, lng in stops_r1:
            RouteStop.objects.get_or_create(
                tenant_id=tenant_id,
                route=r1,
                sequence_number=seq,
                defaults={
                    'stop_name_ar': name_ar,
                    'stop_name_en': name_en,
                    'latitude': Decimal(str(lat)),
                    'longitude': Decimal(str(lng)),
                    'geofence_radius_meters': 120
                }
            )

        r2, _ = Route.objects.get_or_create(
            tenant_id=tenant_id,
            code='RT-OMD-01',
            defaults={
                'name_ar': 'خط أم درمان الكبرى — المهندسين والفتيحاب والملازمين',
                'name_en': 'Greater Omdurman Route - Mohandessin & Fitehab',
                'estimated_distance_km': Decimal('28.00')
            }
        )
        stops_r2 = [
            ('محطة حي المهندسين - مربع 24', 'Al-Mohandessin Sq 24', 1, 15.6020000, 32.4750000),
            ('محطة الفتيحاب مربع 5', 'Al-Fitehab Sq 5', 2, 15.6120000, 32.4820000),
            ('محطة مدخل كبري النيل الأبيض', 'White Nile Bridge Entry', 3, 15.6180000, 32.4960000),
            ('مجمع مدارس المورد النموذجية (المقر)', 'Al-Mawred School Campus', 4, 15.5680000, 32.5390000),
        ]
        for name_ar, name_en, seq, lat, lng in stops_r2:
            RouteStop.objects.get_or_create(
                tenant_id=tenant_id,
                route=r2,
                sequence_number=seq,
                defaults={
                    'stop_name_ar': name_ar,
                    'stop_name_en': name_en,
                    'latitude': Decimal(str(lat)),
                    'longitude': Decimal(str(lng)),
                    'geofence_radius_meters': 120
                }
            )

        # 7. رحلة حية نشطة مع سجل تتبع GPS الميداني
        trip1, _ = Trip.objects.get_or_create(
            tenant_id=tenant_id,
            route=r1,
            vehicle=v1,
            driver=d1,
            defaults={
                'status': 'running',
                'start_time': timezone.now() - timezone.timedelta(minutes=25)
            }
        )

        # إحداثيات GPS حية للحافلة تتحرك في شارع الستين والعمارات بالخرطوم
        coords = [
            (15.5822000, 32.5695000, Decimal('32.0'), 220, 95),
            (15.5801000, 32.5642000, Decimal('38.5'), 225, 94),
            (15.5780000, 32.5590000, Decimal('25.0'), 230, 92),
            (15.5750000, 32.5520000, Decimal('42.0'), 235, 91),
            (15.5720000, 32.5450000, Decimal('35.0'), 240, 90),
            (15.5702000, 32.5415000, Decimal('28.0'), 245, 89),
        ]
        now = timezone.now()
        for i, (lat, lng, spd, hdg, bat) in enumerate(coords):
            VehicleGPSLocation.objects.create(
                tenant_id=tenant_id,
                trip=trip1,
                vehicle=v1,
                latitude=Decimal(str(lat)),
                longitude=Decimal(str(lng)),
                speed_kmh=spd,
                heading=Decimal(str(hdg)),
                battery_level=bat,
                recorded_at=now - timezone.timedelta(minutes=15 - (i * 2))
            )

        self.stdout.write(self.style.SUCCESS("تم بنجاح بذر بيانات الاسطول والحافلات المستأجرة والمملوكة ومسارات الخرطوم وام درمان وسجلات الـ GPS الحية!"))

