import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.maintenance.domain.models import (
    MaintenanceRequest, WorkOrder, MaintenanceHistory, MaintenancePlan,
    PreventiveSchedule, MaintenanceCost, LaborCost, MaterialConsumption, DowntimeRecord
)
from apps.assets.domain.models import Asset

# استدعاء خدمات المخازن والمالية
from apps.inventory.application.services import GoodsIssueService
from apps.finance.application.services import PostingService
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, JournalEntry, JournalEntryLine, Currency


class WorkOrderService:
    @staticmethod
    @transaction.atomic
    def complete_work_order(tenant_id, work_order_id, actual_hours, summary, user_id=None):
        """
        إكمال وإغلاق أمر العمل الفنية للأصل وتوثيقه بسجل الصيانة التاريخي.
        """
        wo = WorkOrder.objects.get(tenant_id=tenant_id, id=work_order_id)
        if wo.status in ['completed', 'closed', 'cancelled']:
            raise ValidationError("أمر العمل مكتمل أو مغلق بالفعل.")

        # 1. تحديث بيانات أمر العمل
        wo.status = 'completed'
        wo.actual_end = timezone.now()
        wo.actual_labor_hours = Decimal(str(actual_hours))
        wo.save()

        # 2. إقفال سجل التوقف (Downtime) إن وجد
        downtime = DowntimeRecord.objects.filter(tenant_id=tenant_id, work_order=wo, end_time__isnull=True).first()
        if downtime:
            downtime.end_time = timezone.now()
            delta = downtime.end_time - downtime.start_time
            downtime.downtime_minutes = int(delta.total_seconds() / 60)
            downtime.save()

        # 3. إضافته في سجل الصيانة التاريخي (History) للأصل
        history = MaintenanceHistory.objects.create(
            tenant_id=tenant_id,
            asset=wo.asset,
            work_order=wo,
            completion_date=timezone.now().date(),
            summary=summary,
            created_by=user_id
        )

        # 4. تحديث حالة طلب البلاغ إن وجد
        if wo.request:
            req = wo.request
            req.status = 'completed'
            req.save()

        return wo

    @staticmethod
    @transaction.atomic
    def consume_parts_for_work_order(tenant_id, work_order_id, warehouse_id, items, user_id=None):
        """
        استهلاك وصرف قطع الغيار الفعلي لأمر العمل من خلال استدعاء موديول المستودعات (Inventory).
        items: قائمة بالمواد والكميات المصروفة [{ 'item_id': UUID, 'qty': 2.0 }]
        """
        wo = WorkOrder.objects.get(tenant_id=tenant_id, id=work_order_id)
        
        # 1. إعداد قائمة الأصناف المخزنية لعملية الصرف
        inventory_items = []
        for it in items:
            inventory_items.append({
                'item_id': it['item_id'],
                'qty_issued': Decimal(str(it['qty'])),
                'unit_cost': Decimal('0.00')  # تحسب تلقائياً من خلال خدمة الصرف بالمستودعات
            })

        # 2. استدعاء خدمة الصرف الفعلي بموديول المخازن
        # يقلل الأرصدة بالمخزن ويولد قيد المحاسبة المخزني (مدين مصروفات صيانة / دائن مخزون)
        receipt = GoodsIssueService.issue_stock(
            tenant_id=tenant_id,
            warehouse_id=warehouse_id,
            issue_type='department',
            destination_reference_id=wo.id,
            items=inventory_items,
            user_id=user_id
        )

        # 3. تسجيل استهلاك المواد الفني في موديول الصيانة للمتابعة والتقييم
        total_material_cost = Decimal('0.00')
        for item in receipt.items.all():
            cost = item.qty_issued * item.unit_cost
            total_material_cost += cost

            MaterialConsumption.objects.create(
                tenant_id=tenant_id,
                work_order=wo,
                inventory_item_id=item.item.id,
                qty_consumed=item.qty_issued,
                unit_cost=item.unit_cost,
                total_cost=cost,
                created_by=user_id
            )

        # 4. تحديث أو إنشاء سجل تكاليف الصيانة لأمر العمل
        maint_cost, created = MaintenanceCost.objects.get_or_create(
            tenant_id=tenant_id,
            work_order=wo,
            defaults={'material_cost': total_material_cost, 'total_cost': total_material_cost}
        )
        if not created:
            maint_cost.material_cost += total_material_cost
            maint_cost.total_cost += total_material_cost
            maint_cost.save()

        return maint_cost


class PreventiveMaintenanceService:
    @staticmethod
    @transaction.atomic
    def generate_preventive_work_orders(tenant_id, run_date):
        """
        توليد أوامر العمل الوقائية تلقائياً للأصول التي استحق موعد صيانتها الوقائية.
        """
        schedules = PreventiveSchedule.objects.filter(
            tenant_id=tenant_id,
            is_active=True,
            next_due_date__lte=run_date
        )

        generated_orders = []
        for sched in schedules:
            # 1. توليد رقم أمر عمل جديد
            wo_number = f"PM-{sched.asset.asset_number}-{timezone.now().strftime('%Y%m%d%H%M')}"
            
            # 2. إنشاء أمر العمل الوقائي
            wo = WorkOrder.objects.create(
                tenant_id=tenant_id,
                wo_number=wo_number,
                asset=sched.asset,
                status='assigned',
                scheduled_start=timezone.datetime.combine(sched.next_due_date, timezone.datetime.min.time()),
                scheduled_end=timezone.datetime.combine(sched.next_due_date + timezone.timedelta(days=1), timezone.datetime.min.time()),
            )

            # 3. تحديث جدولة الصيانة الوقائية للأصل
            sched.last_run_date = sched.next_due_date
            sched.next_due_date = sched.next_due_date + timezone.timedelta(days=sched.plan.frequency_days)
            sched.save()

            generated_orders.append(wo)

        return generated_orders


class MaintenanceCostService:
    @staticmethod
    @transaction.atomic
    def post_maintenance_costs_to_finance(tenant_id, work_order_id, maintenance_expense_gl_account_id, offset_gl_account_id, cost_center_id=None, user_id=None):
        """
        ترحيل تكاليف الصيانة لأمر العمل بالكامل ماليّاً لتنعكس في المصاريف والحسابات العامة.
        """
        wo = WorkOrder.objects.get(tenant_id=tenant_id, id=work_order_id)
        cost_record = MaintenanceCost.objects.filter(tenant_id=tenant_id, work_order=wo).first()
        if not cost_record or cost_record.total_cost <= 0:
            raise ValidationError("لا توجد تكاليف مسجلة لأمر العمل هذا أو القيمة صفر.")

        if cost_record.journal_entry_id:
            raise ValidationError("التكاليف مرحلة بالكامل للدفاتر المالية سابقاً.")

        # القيد المحاسبي:
        # مدين: حساب مصروفات الصيانة والإصلاح (الأصل والموقع أو القسم)
        # دائن: حساب وسيط/صندوق أو دائنون (Offset)
        journal_lines = [
            {
                'account_id': maintenance_expense_gl_account_id,
                'cost_center_id': cost_center_id,
                'debit': cost_record.total_cost,
                'credit': Decimal('0.00'),
                'description': f"إثبات تكاليف الصيانة والإصلاح الفنية لأمر العمل رقم {wo.wo_number}"
            },
            {
                'account_id': offset_gl_account_id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': cost_record.total_cost,
                'description': f"إثبات المصاريف المقابلة لعقد الصيانة وأمر العمل رقم {wo.wo_number}"
            }
        ]

        active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
        if active_fy:
            period = active_fy.periods.filter(start_date__lte=timezone.now().date(), end_date__gte=timezone.now().date()).first()
            if period:
                base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                journal = JournalEntry.objects.create(
                    tenant_id=tenant_id,
                    entry_number=f"MNT-{wo.wo_number}",
                    date=timezone.now().date(),
                    accounting_period=period,
                    description=f"قيد مصروفات صيانة وتصليح للأصل {wo.asset.name_ar}",
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
                cost_record.journal_entry_id = journal.id
                cost_record.save()

        return cost_record
