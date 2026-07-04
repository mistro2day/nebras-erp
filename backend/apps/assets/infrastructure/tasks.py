from celery import shared_task
from django.utils import timezone
from decimal import Decimal
from apps.assets.domain.models import Asset, AssetWarranty, AssetInsurance, AssetStatistics

@shared_task
def check_expiring_warranties_and_insurance():
    """
    مهمة خلفية لفحص وثائق التأمين والضمانات التي ستنتهي خلال الـ 30 يوماً القادمة.
    """
    limit_date = timezone.now().date() + timezone.timedelta(days=30)
    
    # 1. فحص الضمانات المنتهية
    expiring_warranties = AssetWarranty.objects.filter(end_date__lte=limit_date, end_date__gte=timezone.now().date())
    for warranty in expiring_warranties:
        print(f"[تنبيت الضمان] الضمان للأصل {warranty.asset.name_ar} (رقم {warranty.warranty_number}) سينتهي بتاريخ {warranty.end_date}")

    # 2. فحص التأمينات المنتهية
    expiring_insurances = AssetInsurance.objects.filter(end_date__lte=limit_date, end_date__gte=timezone.now().date())
    for insurance in expiring_insurances:
        print(f"[تنبيه التأمين] وثيقة التأمين للأصل {insurance.asset.name_ar} (رقم {insurance.policy_number}) ستنتهي بتاريخ {insurance.end_date}")

    return {
        'expiring_warranties_count': expiring_warranties.count(),
        'expiring_insurances_count': expiring_insurances.count()
    }

@shared_task
def update_assets_statistics(tenant_id):
    """
    تحديث الأرقام الإحصائية للأصول بجدول الإحصائيات لمدير النظام.
    """
    total_count = Asset.objects.filter(tenant_id=tenant_id).count()
    active_assets = Asset.objects.filter(tenant_id=tenant_id, status='capitalized')
    net_value = sum(asset.book_value for asset in active_assets)

    stats, created = AssetStatistics.objects.update_or_create(
        tenant_id=tenant_id,
        as_of_date=timezone.now().date(),
        defaults={
            'total_assets_count': total_count,
            'total_net_book_value': Decimal(str(net_value)),
            'total_depreciation_mtd': Decimal('0.00') # يتم تعبئتها عند احتساب قيد الإهلاك للشهر
        }
    )
    return {
        'total_assets': total_count,
        'net_book_value': float(net_value)
    }
