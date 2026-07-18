"""بذر بيانات تجريبية لسلسلة الإمداد: المخزون والأصول الثابتة.

يُشغَّل بأمان أكثر من مرة (idempotent) — يستخدم get_or_create على المفاتيح المميّزة.
    python seed_supply_chain.py
"""
import os
from datetime import date, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402

django.setup()

from apps.tenants.domain.models import Tenant  # noqa: E402
from apps.inventory.domain.models import (  # noqa: E402
    Warehouse, WarehouseZone, WarehouseAisle, BinLocation,
    InventoryCategory, InventoryUnit, InventoryItem, InventoryBalance,
    ReorderRule, InventoryStatistics, StockMovement, InventoryTransaction,
)
from apps.assets.domain.models import (  # noqa: E402
    AssetCategory, AssetLocation, Asset, AssetStatistics,
)


def seed(tenant_id):
    # ---------- وحدات القياس ----------
    units = {}
    for code, ar, en in [('PCS', 'قطعة', 'Piece'), ('BOX', 'صندوق', 'Box'),
                         ('RM', 'رزمة', 'Ream'), ('LTR', 'لتر', 'Litre')]:
        units[code], _ = InventoryUnit.objects.get_or_create(
            tenant_id=tenant_id, code=code,
            defaults={'name_ar': ar, 'name_en': en, 'conversion_factor': Decimal('1')})

    # ---------- فئات المخزون ----------
    cats = {}
    for code, ar, en in [('STAT', 'قرطاسية ولوازم مكتبية', 'Stationery'),
                         ('CLEAN', 'مواد نظافة وتعقيم', 'Cleaning Supplies'),
                         ('LAB', 'مستهلكات المختبرات', 'Lab Consumables'),
                         ('IT', 'مستهلكات تقنية', 'IT Consumables')]:
        cats[code], _ = InventoryCategory.objects.get_or_create(
            tenant_id=tenant_id, code=code, defaults={'name_ar': ar, 'name_en': en})

    # ---------- المستودعات وهيكلها ----------
    wh_main, _ = Warehouse.objects.get_or_create(
        tenant_id=tenant_id, code='WH-MAIN',
        defaults={'name_ar': 'المستودع الرئيسي', 'name_en': 'Main Warehouse',
                  'location': 'المبنى الإداري — الدور الأرضي', 'is_default': True,
                  'capacity_volume': Decimal('1200')})
    wh_lab, _ = Warehouse.objects.get_or_create(
        tenant_id=tenant_id, code='WH-LAB',
        defaults={'name_ar': 'مستودع المختبرات', 'name_en': 'Laboratory Store',
                  'location': 'مبنى العلوم — الدور الأول', 'capacity_volume': Decimal('300')})
    Warehouse.objects.get_or_create(
        tenant_id=tenant_id, code='WH-TRANSIT',
        defaults={'name_ar': 'مستودع العبور', 'name_en': 'Transit', 'is_virtual': True,
                  'is_transit': True, 'capacity_volume': Decimal('0')})

    bins = {}
    for wh, zcode, zar in [(wh_main, 'A', 'منطقة القرطاسية'), (wh_main, 'B', 'منطقة النظافة'),
                           (wh_lab, 'L', 'منطقة الكيمياء')]:
        zone, _ = WarehouseZone.objects.get_or_create(
            tenant_id=tenant_id, warehouse=wh, code=zcode,
            defaults={'name_ar': zar, 'name_en': zcode})
        aisle, _ = WarehouseAisle.objects.get_or_create(
            tenant_id=tenant_id, zone=zone, code=f'{zcode}-01')
        b, _ = BinLocation.objects.get_or_create(
            tenant_id=tenant_id, aisle=aisle, code=f'{zcode}-01-01',
            defaults={'max_weight': Decimal('500')})
        bins[zcode] = b

    # ---------- الأصناف + الأرصدة + قواعد إعادة الطلب ----------
    # (sku, اسم, فئة, وحدة, مستودع, رف, رصيد, محجوز, حد أدنى, حد أقصى, تكلفة)
    items_spec = [
        ('SKU-1001', 'ورق تصوير A4 80 جم', 'STAT', 'RM', wh_main, 'A', 45, 5, 60, 400, 22.00),
        ('SKU-1002', 'أقلام سبورة — عبوة 12', 'STAT', 'BOX', wh_main, 'A', 130, 0, 40, 300, 18.50),
        ('SKU-1003', 'دفاتر 60 ورقة', 'STAT', 'PCS', wh_main, 'A', 820, 40, 200, 1500, 4.75),
        ('SKU-2001', 'معقّم أيدٍ 5 لتر', 'CLEAN', 'LTR', wh_main, 'B', 12, 0, 30, 150, 46.00),
        ('SKU-2002', 'مناديل ورقية — كرتون', 'CLEAN', 'BOX', wh_main, 'B', 64, 4, 25, 200, 55.00),
        ('SKU-3001', 'قفازات مختبر — عبوة 100', 'LAB', 'BOX', wh_lab, 'L', 0, 0, 20, 120, 38.00),
        ('SKU-3002', 'أنابيب اختبار زجاجية', 'LAB', 'PCS', wh_lab, 'L', 240, 0, 100, 600, 6.25),
        ('SKU-4001', 'حبر طابعة ليزر أسود', 'IT', 'PCS', wh_main, 'A', 7, 2, 10, 60, 210.00),
    ]
    total_value = Decimal('0')
    low = out = 0
    for sku, ar, cat, uom, wh, zc, qty, res, mn, mx, cost in items_spec:
        item, _ = InventoryItem.objects.get_or_create(
            tenant_id=tenant_id, sku=sku,
            defaults={'name_ar': ar, 'name_en': sku, 'category': cats[cat], 'uom': units[uom],
                      'item_type': 'stock', 'barcode': f'628{sku[-4:]}00000'})
        bal, _ = InventoryBalance.objects.get_or_create(
            tenant_id=tenant_id, item=item, warehouse=wh, bin_location=bins[zc],
            defaults={'qty_on_hand': Decimal(qty), 'qty_reserved': Decimal(res)})
        ReorderRule.objects.get_or_create(
            tenant_id=tenant_id, item=item, warehouse=wh,
            defaults={'min_stock': Decimal(mn), 'max_stock': Decimal(mx),
                      'safety_stock': Decimal(mn) / 2, 'lead_time_days': 7})
        total_value += Decimal(qty) * Decimal(str(cost))
        if qty == 0:
            out += 1
        elif qty < mn:
            low += 1

        # حركة افتتاحية لكارت الصنف
        StockMovement.objects.get_or_create(
            tenant_id=tenant_id, item=item, warehouse=wh, reference_document='OPENING',
            defaults={'bin_location': bins[zc], 'quantity_delta': Decimal(qty),
                      'new_balance': Decimal(qty)})
        InventoryTransaction.objects.get_or_create(
            tenant_id=tenant_id, transaction_number=f'TRX-OPEN-{sku[-4:]}',
            defaults={'item': item, 'warehouse': wh, 'bin_location': bins[zc],
                      'transaction_type': 'receipt', 'quantity': Decimal(qty),
                      'unit_cost': Decimal(str(cost)),
                      'total_value': Decimal(qty) * Decimal(str(cost))})

    st, _ = InventoryStatistics.objects.get_or_create(
        tenant_id=tenant_id, as_of_date=date.today())
    st.total_items_count = len(items_spec)
    st.total_stock_value = total_value
    st.low_stock_items = low
    st.out_of_stock_items = out
    st.save()

    # ---------- الأصول الثابتة ----------
    acat = {}
    for code, ar, en in [('VEH', 'مركبات ونقل', 'Vehicles'), ('IT', 'أجهزة وتقنية', 'IT Equipment'),
                         ('FURN', 'أثاث وتجهيزات', 'Furniture'), ('HVAC', 'تكييف وتبريد', 'HVAC')]:
        acat[code], _ = AssetCategory.objects.get_or_create(
            tenant_id=tenant_id, code=code, defaults={'name_ar': ar, 'name_en': en})

    locs = {}
    for code, ar, bld, flr in [('ADM', 'المبنى الإداري', 'الإداري', 'الأرضي'),
                               ('SCI', 'مبنى العلوم', 'العلوم', 'الأول'),
                               ('YRD', 'الساحة والمواقف', 'الساحة', '—')]:
        locs[code], _ = AssetLocation.objects.get_or_create(
            tenant_id=tenant_id, code=code,
            defaults={'name_ar': ar, 'name_en': code, 'building': bld, 'floor': flr})

    # (رقم, اسم, فئة, موقع, تكلفة, عمر بالأشهر, أشهر مضت, حالة)
    assets_spec = [
        ('FA-0001', 'حافلة مدرسية 30 راكب', 'VEH', 'YRD', 480000, 120, 26, 'capitalized'),
        ('FA-0002', 'حافلة مدرسية 15 راكب', 'VEH', 'YRD', 260000, 120, 14, 'capitalized'),
        ('FA-0003', 'مختبر حاسب — 25 جهاز', 'IT', 'SCI', 187500, 60, 19, 'capitalized'),
        ('FA-0004', 'سبورات ذكية تفاعلية (12)', 'IT', 'ADM', 96000, 60, 8, 'capitalized'),
        ('FA-0005', 'مكيفات مركزية — الإداري', 'HVAC', 'ADM', 145000, 96, 33, 'capitalized'),
        ('FA-0006', 'أثاث مكتبي — قاعة المعلمين', 'FURN', 'ADM', 62000, 120, 41, 'capitalized'),
        ('FA-0007', 'خادم شبكة ومقسّمات', 'IT', 'ADM', 78000, 48, 0, 'registered'),
    ]
    nbv_total = Decimal('0')
    depr_mtd = Decimal('0')
    for num, ar, cat, loc, cost, life, elapsed, status in assets_spec:
        cost_d = Decimal(str(cost))
        salvage = cost_d * Decimal('0.10')
        monthly = (cost_d - salvage) / Decimal(life)
        accum = monthly * Decimal(elapsed)
        nbv = cost_d - accum
        a, _ = Asset.objects.get_or_create(
            tenant_id=tenant_id, asset_number=num,
            defaults={'name_ar': ar, 'name_en': num, 'category': acat[cat], 'location': locs[loc],
                      'acquisition_cost': cost_d, 'salvage_value': salvage, 'book_value': nbv,
                      'useful_life_months': life, 'status': status,
                      'purchase_date': date.today() - timedelta(days=30 * (elapsed + 1)),
                      'commission_date': date.today() - timedelta(days=30 * elapsed) if elapsed else None,
                      'barcode': f'FA{num[-4:]}0000'})
        if status == 'capitalized':
            nbv_total += nbv
            depr_mtd += monthly

    ast, _ = AssetStatistics.objects.get_or_create(
        tenant_id=tenant_id, as_of_date=date.today())
    ast.total_assets_count = len(assets_spec)
    ast.total_net_book_value = nbv_total
    ast.total_depreciation_mtd = depr_mtd
    ast.save()

    print(f'  أصناف: {InventoryItem.objects.filter(tenant_id=tenant_id).count()}'
          f' | مستودعات: {Warehouse.objects.filter(tenant_id=tenant_id).count()}'
          f' | قيمة المخزون: {total_value:,.2f}'
          f' | تحت الحد: {low} | نافد: {out}')
    print(f'  أصول: {Asset.objects.filter(tenant_id=tenant_id).count()}'
          f' | القيمة الدفترية: {nbv_total:,.2f} | إهلاك شهري: {depr_mtd:,.2f}')


if __name__ == '__main__':
    for t in Tenant.objects.all():
        print(f'المستأجر: {t.name if hasattr(t, "name") else t.id}')
        seed(t.id)
    print('تم البذر.')
