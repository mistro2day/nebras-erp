import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.assets.domain.models import (
    Asset, AssetCategory, AssetLocation, AssetAcquisition,
    AssetCapitalization, AssetDepreciation, AssetDisposal, AssetRevaluation
)

# قيود الأصول تُنشأ كمسودات في المالية ويعتمدها المحاسب المختص (لا تُرحّل من هنا)
from apps.finance.domain.models import ChartOfAccount, CostCenter, FiscalYear, AccountingPeriod, JournalEntry, JournalEntryLine, Currency
from apps.finance.application.account_resolver import resolve_account


class AssetService:
    @staticmethod
    @transaction.atomic
    def capitalize_asset(tenant_id, asset_id, capitalization_date, asset_gl_account_id, offset_gl_account_id, cost_center_id=None, user_id=None):
        """
        تأصيل ورسملة الأصل الثابت وتوليد قيد إثبات الأصل ماليّاً.
        """
        asset = Asset.objects.get(tenant_id=tenant_id, id=asset_id)
        if asset.status != 'registered':
            raise ValidationError("الأصل مرسمل أو مستبعد بالفعل.")

        # 1. تحديث بيانات الأصل
        asset.status = 'capitalized'
        asset.commission_date = capitalization_date
        asset.book_value = asset.acquisition_cost
        asset.save()

        # 2. إنشاء سجل الرسملة
        cap = AssetCapitalization.objects.create(
            tenant_id=tenant_id,
            asset=asset,
            capitalization_date=capitalization_date,
            amount=asset.acquisition_cost,
            created_by=user_id
        )

        # 3. توليد القيد المحاسبي بالمالية تلقائياً
        # الجانب المدين (Debit): حساب الأصول الثابتة (مثال: حواسيب وأجهزة)
        # الجانب الدائن (Credit): حساب وسيط (مشتريات أصول أو مشاريع تحت التنفيذ)
        journal_lines = [
            {
                'account_id': asset_gl_account_id,
                'cost_center_id': cost_center_id,
                'debit': asset.acquisition_cost,
                'credit': Decimal('0.00'),
                'description': f"رسملة وإثبات الأصل الثابت {asset.name_ar} رقم {asset.asset_number}"
            },
            {
                'account_id': offset_gl_account_id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': asset.acquisition_cost,
                'description': f"إقفال حساب وسيط اقتناء أصل رقم {asset.asset_number}"
            }
        ]

        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if active_fy:
            period = active_fy.periods.filter(start_date__lte=capitalization_date, end_date__gte=capitalization_date).first()
            if period:
                base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                journal = JournalEntry.objects.create(
                    tenant_id=tenant_id,
                    entry_number=f"CAP-{asset.asset_number}",
                    date=capitalization_date,
                    accounting_period=period,
                    description=f"قيد رسملة وتأصيل الأصل {asset.name_ar}",
                    source_type='automatic',
                    status='draft',
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

                # يصل القيد للمالية كمسودة — المحاسب المختص هو من يعتمده ويرحّله.
                # فصل الصلاحيات: مسؤول الأصول يسجّل الأصل، والمحاسب يحرّك الدفاتر.
                cap.journal_entry_id = journal.id
                cap.save()

        return cap


class DepreciationService:
    @staticmethod
    @transaction.atomic
    def calculate_and_post_depreciation(tenant_id, asset_id, run_date, depr_expense_gl_account_id, accum_depr_gl_account_id, cost_center_id=None, user_id=None):
        """
        حساب الإهلاك الدوري للأصل الثابت (بناءً على طريقة القسط الثابت) وتوليد قيد الإهلاك تلقائياً بالمالية.
        """
        asset = Asset.objects.get(tenant_id=tenant_id, id=asset_id)
        if asset.status != 'capitalized':
            raise ValidationError("الأصل غير نشط أو مستبعد، لا يمكن إهلاكه.")

        # إهلاك القسط الثابت الشهري:
        # (تكلفة الاقتناء - قيمة الخردة) / العمر الافتراضي بالأشهر
        depreciable_base = asset.acquisition_cost - asset.salvage_value
        if depreciable_base <= 0 or asset.useful_life_months <= 0:
            raise ValidationError("الأصل تم إهلاكه بالكامل أو ليس له قيمة قابلة للإهلاك.")

        monthly_depr = depreciable_base / Decimal(str(asset.useful_life_months))
        monthly_depr = monthly_depr.quantize(Decimal('0.01'))

        if asset.book_value - monthly_depr < asset.salvage_value:
            monthly_depr = asset.book_value - asset.salvage_value

        if monthly_depr <= 0:
            raise ValidationError("الأصل تم إهلاكه بالكامل للقيمة الدفترية الدنيا (الخردة).")

        # تحديث القيمة الدفترية للأصل
        old_book_value = asset.book_value
        asset.book_value -= monthly_depr
        asset.save()

        # حساب مجمع الإهلاك
        accum_depr = asset.acquisition_cost - asset.book_value

        # إنشاء سجل الإهلاك التاريخي
        depr = AssetDepreciation.objects.create(
            tenant_id=tenant_id,
            asset=asset,
            depreciation_date=run_date,
            depreciation_amount=monthly_depr,
            accumulated_depreciation=accum_depr,
            book_value_after=asset.book_value,
            created_by=user_id
        )

        # توليد قيد الإهلاك بالمالية
        # الجانب المدين (Debit): حساب مصروف إهلاك الأصول الثابتة
        # الجانب الدائن (Credit): حساب مجمع إهلاك الأصول الثابتة (Accumulated Depreciation)
        journal_lines = [
            {
                'account_id': depr_expense_gl_account_id,
                'cost_center_id': cost_center_id,
                'debit': monthly_depr,
                'credit': Decimal('0.00'),
                'description': f"إثبات قيد إهلاك أصل {asset.name_ar} لشهر {run_date.strftime('%B')}"
            },
            {
                'account_id': accum_depr_gl_account_id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': monthly_depr,
                'description': f"إثبات مجمع إهلاك أصل {asset.name_ar} لشهر {run_date.strftime('%B')}"
            }
        ]

        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if active_fy:
            period = active_fy.periods.filter(start_date__lte=run_date, end_date__gte=run_date).first()
            if period:
                base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                journal = JournalEntry.objects.create(
                    tenant_id=tenant_id,
                    entry_number=f"DEP-{asset.asset_number}-{timezone.now().strftime('%Y%m%d%H%M')}",
                    date=run_date,
                    accounting_period=period,
                    description=f"قيد إهلاك دوري للأصل {asset.name_ar}",
                    source_type='automatic',
                    status='draft',
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

                # مسودة بانتظار اعتماد المحاسب — حتى الإهلاك الدوري يمرّ بالمراجعة
                depr.journal_entry_id = journal.id
                depr.save()

        return depr


class DisposalService:
    @staticmethod
    @transaction.atomic
    def dispose_asset(tenant_id, asset_id, disposal_type, proceeds, run_date, disposal_expense_gl_account_id, asset_gl_account_id, accum_depr_gl_account_id, user_id=None):
        """
        استبعاد وشطب الأصل الثابت (بيع أو خردة)، وإغلاق حساباته وتوليد قيد أرباح/خسائر رأسمالية بالمالية.
        """
        asset = Asset.objects.get(tenant_id=tenant_id, id=asset_id)
        if asset.status in ['disposed', 'retired']:
            raise ValidationError("الأصل مستبعد أو خارج الخدمة بالفعل.")

        book_value = asset.book_value
        proceeds_decimal = Decimal(str(proceeds))

        # حساب الربح أو الخسارة الرأسمالية: متحصلات البيع - القيمة الدفترية للأصل
        gain_loss = proceeds_decimal - book_value

        # تحديث حالة الأصل
        asset.status = 'disposed'
        asset.book_value = Decimal('0.00')
        asset.save()

        # إنشاء سجل الاستبعاد
        disp = AssetDisposal.objects.create(
            tenant_id=tenant_id,
            asset=asset,
            disposal_type=disposal_type,
            disposal_date=run_date,
            disposal_proceeds=proceeds_decimal,
            gain_loss=gain_loss,
            status='approved',
            created_by=user_id
        )

        # قيد استبعاد الأصول بالمالية:
        # مدين: حساب مجمع إهلاك الأصول بالكامل (Accumulated Depreciation)
        # مدين: الصندوق/البنك بالمتحصلات إن وجد (Proceeds)
        # مدين: خسائر رأسمالية (في حال كانت القيمة الدفترية أكبر من المتحصلات)
        # دائن: حساب الأصول الثابتة بكامل تكلفة الاقتناء الأصلية (Acquisition Cost)
        # دائن: أرباح رأسمالية (في حال كانت المتحصلات أكبر من القيمة الدفترية)
        accumulated_depr_val = asset.acquisition_cost - book_value

        journal_lines = [
            # 1. إقفال مجمع الإهلاك (مدين)
            {
                'account_id': accum_depr_gl_account_id,
                'cost_center_id': None,
                'debit': accumulated_depr_val,
                'credit': Decimal('0.00'),
                'description': f"إقفال مجمع إهلاك أصل {asset.name_ar} المستبعد"
            },
            # 2. إثبات خروج الأصل الثابت بكامل التكلفة التاريخية (دائن)
            {
                'account_id': asset_gl_account_id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': asset.acquisition_cost,
                'description': f"شطب تكلفة أصل {asset.name_ar} المستبعد"
            }
        ]

        # 3. إثبات المتحصلات النقدية إن وجدت
        if proceeds_decimal > 0:
            # الصندوق أو البنك — تفصيلي لا رئيسي
            cash_account = resolve_account(tenant_id, 'cash', prefix='11')
            if cash_account:
                journal_lines.append({
                    'account_id': cash_account.id,
                    'cost_center_id': None,
                    'debit': proceeds_decimal,
                    'credit': Decimal('0.00'),
                    'description': f"إثبات متحصلات بيع أصل {asset.name_ar}"
                })

        # 4. إثبات الأرباح أو الخسائر الرأسمالية
        if gain_loss > 0:
            # دائن: أرباح رأسمالية
            revenue_gain_account = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='4').first()
            if revenue_gain_account:
                journal_lines.append({
                    'account_id': revenue_gain_account.id,
                    'cost_center_id': None,
                    'debit': Decimal('0.00'),
                    'credit': gain_loss,
                    'description': f"إثبات أرباح رأسمالية بيع أصل {asset.name_ar}"
                })
        elif gain_loss < 0:
            # مدين: خسائر رأسمالية
            if disposal_expense_gl_account_id:
                journal_lines.append({
                    'account_id': disposal_expense_gl_account_id,
                    'cost_center_id': None,
                    'debit': abs(gain_loss),
                    'credit': Decimal('0.00'),
                    'description': f"إثبات خسائر رأسمالية شطب أصل {asset.name_ar}"
                })

        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if active_fy:
            period = active_fy.periods.filter(start_date__lte=run_date, end_date__gte=run_date).first()
            if period:
                base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                journal = JournalEntry.objects.create(
                    tenant_id=tenant_id,
                    entry_number=f"DSP-{asset.asset_number}",
                    date=run_date,
                    accounting_period=period,
                    description=f"قيد استبعاد وتصفية الأصل {asset.name_ar}",
                    source_type='automatic',
                    status='draft',
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

                # مسودة بانتظار اعتماد المحاسب — الاستبعاد يثبت ربحاً أو خسارة رأسمالية
                disp.journal_entry_id = journal.id
                disp.save()

        return disp
