"""تحديد الحساب المحاسبي المناسب لغرض تشغيلي محدّد.

المشكلة التي يعالجها: الموديولات التشغيلية (مشتريات، مخازن، أصول) تحتاج
حساباً محاسبياً لتوليد قيودها، وكانت تسقط على `code__startswith='2'` فتصيب
**حساباً رئيسياً** (2000 الخصوم) بدل التفصيلي (2101 ذمم الموردين).
الترحيل على حساب رئيسي يُفسد هيكل التقارير المالية ويجعل الأرصدة مضلّلة.

القاعدة هنا: لا يُرحَّل إلا على حساب تفصيلي (ورقة بلا أبناء)، وإن لم يُوجد
حساب مناسب يُرفع خطأ واضح بدل التخمين — الفشل الصريح أسلم من قيد خاطئ.
"""
from django.core.exceptions import ValidationError

from apps.finance.domain.models import ChartOfAccount

# الرموز المرشّحة لكل غرض، مرتّبة بالأفضلية.
# تُستخدم حين لا يضبط المستأجر الحساب صراحةً في إعدادات موديوله.
PURPOSE_CODES = {
    'payable': (['2101', '2100'], 'ذمم الموردين الدائنة'),
    'inventory_asset': (['1106'], 'المخزون'),
    'cash': (['1101', '1102'], 'الصندوق أو البنك'),
    'bank': (['1102', '1101'], 'البنك'),
    # غرامات المكتبة: مدين ذمم مدينة على المستعير، ودائن إيراد
    'receivable': (['1103'], 'المدينون (ذمم مدينة)'),
    'fine_revenue': (['4103', '4102', '4101'], 'إيرادات الغرامات والخدمات'),
}


def is_postable(account):
    """الحساب قابل للترحيل إن كان ورقة — لا أبناء له."""
    if account is None:
        return False
    return not account.children.filter(deleted_at__isnull=True).exists()


def resolve_account(tenant_id, purpose, configured_id=None, prefix=None):
    """يُرجع حساباً تفصيلياً صالحاً للترحيل، أو يرفع خطأً مفهوماً.

    الترتيب: الحساب المضبوط في الإعدادات ← الرموز المعروفة للغرض ←
    أول حساب تفصيلي تحت البادئة. وفي كل الحالات يُستبعد الحساب الرئيسي.
    """
    codes, label = PURPOSE_CODES.get(purpose, ([], purpose))

    # 1) ما ضبطه المستأجر صراحةً — يُحترم لكن يُتحقّق منه
    if configured_id:
        acc = ChartOfAccount.objects.filter(
            tenant_id=tenant_id, id=configured_id, deleted_at__isnull=True).first()
        if acc is not None:
            if not is_postable(acc):
                raise ValidationError(
                    f"الحساب المضبوط ({acc.code} {acc.name_ar}) حساب رئيسي ولا يقبل الترحيل. "
                    f"اختر حساباً تفصيلياً في الإعدادات."
                )
            return acc

    # 2) الرموز المعروفة لهذا الغرض
    for code in codes:
        acc = ChartOfAccount.objects.filter(
            tenant_id=tenant_id, code=code, deleted_at__isnull=True).first()
        if is_postable(acc):
            return acc

    # 3) أول حساب تفصيلي تحت البادئة — آخر محاولة قبل الفشل
    if prefix:
        for acc in ChartOfAccount.objects.filter(
            tenant_id=tenant_id, code__startswith=prefix, deleted_at__isnull=True
        ).order_by('code'):
            if is_postable(acc):
                return acc

    raise ValidationError(
        f"لم يُعثر على حساب تفصيلي صالح لـ«{label}» في دليل الحسابات. "
        f"عرّف الحساب أو اضبطه في إعدادات الموديول قبل تنفيذ هذه العملية."
    )
