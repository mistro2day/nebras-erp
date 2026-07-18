"""تشغيل عمليات حقيقية على سلسلة الإمداد لتوليد بيانات تجريبية أصيلة.

لا يكتب صفوفاً يدوياً: يستدعي خدمات النظام نفسها (صرف مخزني، رسملة، إهلاك)
فتنتج الأرصدة والحركات والقيود كما تنتج في التشغيل الفعلي — والقيود تصل
المالية **كمسودات** بانتظار اعتماد المحاسب.

    python seed_supply_chain_ops.py
"""
import os
from datetime import date
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django  # noqa: E402

django.setup()

from apps.tenants.domain.models import Tenant  # noqa: E402
from apps.finance.domain.models import ChartOfAccount, CostCenter, JournalEntry  # noqa: E402
from apps.inventory.domain.models import (  # noqa: E402
    Warehouse, InventoryItem, InventoryBalance, GoodsIssue,
)
from apps.inventory.application.services import GoodsIssueService  # noqa: E402
from apps.assets.domain.models import Asset, AssetCapitalization, AssetDepreciation  # noqa: E402
from apps.assets.application.services import AssetService, DepreciationService  # noqa: E402


def run(tenant_id):
    wh = Warehouse.objects.filter(tenant_id=tenant_id, code='WH-MAIN').first()
    if not wh:
        print('  لا يوجد مستودع رئيسي — شغّل seed_supply_chain.py أولاً.')
        return

    expense = ChartOfAccount.objects.filter(tenant_id=tenant_id, code='5200').first()
    cc = CostCenter.objects.filter(tenant_id=tenant_id, name_ar='الإدارة العامة').first()
    if not (expense and cc):
        print('  ينقص حساب مصروف 5200 أو مركز التكلفة — تخطّي عمليات الصرف.')
    else:
        # ---- صرف مخزني فعلي: استهلاك أقسام من المستودع ----
        issues = [
            ('SKU-1003', 60, 4.75),   # دفاتر للفصول
            ('SKU-1002', 15, 18.50),  # أقلام سبورة
            ('SKU-2002', 6, 55.00),   # مناديل
        ]
        made = 0
        for sku, qty, cost in issues:
            item = InventoryItem.objects.filter(tenant_id=tenant_id, sku=sku).first()
            if not item:
                continue
            bal = InventoryBalance.objects.filter(tenant_id=tenant_id, item=item, warehouse=wh).first()
            if not bal or bal.qty_available < Decimal(qty):
                continue
            GoodsIssueService.issue_stock(
                tenant_id=tenant_id,
                warehouse_id=wh.id,
                issue_type='department',
                items_data=[{
                    'item_id': str(item.id),
                    'qty_issued': qty,
                    'unit_cost': cost,
                    'expense_account_id': str(expense.id),
                    'cost_center_id': str(cc.id),
                }],
            )
            made += 1
        print(f'  سندات صرف مُنشأة: {made}')

    # ---- رسملة الأصل غير المرسمل ----
    asset_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='1').first()
    offset_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='2').first()
    pending = Asset.objects.filter(tenant_id=tenant_id, status='registered').first()
    if pending and asset_acc and offset_acc:
        AssetService.capitalize_asset(
            tenant_id=tenant_id,
            asset_id=pending.id,
            capitalization_date=date.today(),
            asset_gl_account_id=str(asset_acc.id),
            offset_gl_account_id=str(offset_acc.id),
            cost_center_id=str(cc.id) if cc else None,
        )
        print(f'  رُسمل الأصل: {pending.asset_number}')

    # ---- إهلاك دوري لأصول مرسملة ----
    depr_exp = ChartOfAccount.objects.filter(tenant_id=tenant_id, code='5200').first() or asset_acc
    accum_acc = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='1').last()
    ran = 0
    if depr_exp and accum_acc:
        for a in Asset.objects.filter(tenant_id=tenant_id, status='capitalized')[:4]:
            try:
                DepreciationService.calculate_and_post_depreciation(
                    tenant_id=tenant_id,
                    asset_id=a.id,
                    run_date=date.today(),
                    depr_expense_gl_account_id=str(depr_exp.id),
                    accum_depr_gl_account_id=str(accum_acc.id),
                    cost_center_id=str(cc.id) if cc else None,
                )
                ran += 1
            except Exception as e:  # noqa: BLE001 — نعرض السبب ولا نُسقط البذر كلّه
                print(f'    تعذّر إهلاك {a.asset_number}: {e}')
    print(f'  قيود إهلاك مُنشأة: {ran}')

    # ---- التحقق: هل وصلت القيود كمسودات فعلاً؟ ----
    drafts = JournalEntry.objects.filter(tenant_id=tenant_id, status='draft', source_type='automatic')
    posted = JournalEntry.objects.filter(tenant_id=tenant_id, status='posted', source_type='automatic')
    print(f'\n  قيود آلية مسودة (بانتظار المحاسب): {drafts.count()}')
    print(f'  قيود آلية مرحّلة تلقائياً: {posted.count()}')
    for j in drafts.order_by('-created_at')[:6]:
        print(f'    · {j.entry_number:32} {j.description[:46]}')

    print(f'\n  سندات صرف: {GoodsIssue.objects.filter(tenant_id=tenant_id).count()}'
          f' | رسملة: {AssetCapitalization.objects.filter(tenant_id=tenant_id).count()}'
          f' | إهلاك: {AssetDepreciation.objects.filter(tenant_id=tenant_id).count()}')


if __name__ == '__main__':
    for t in Tenant.objects.all():
        print(f'المستأجر: {getattr(t, "name", t.id)}')
        run(t.id)
    print('\nانتهت العمليات.')
