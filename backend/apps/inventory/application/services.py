import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.inventory.domain.models import (
    Warehouse, BinLocation, InventoryItem, InventoryBalance, InventoryTransaction,
    GoodsReceipt, GoodsReceiptItem, GoodsIssue, GoodsIssueItem, InventoryTransfer,
    InventoryAdjustment, StockMovement, InventoryBatch, InventoryLot, SerialNumber
)

# قيود المخازن تُنشأ كمسودات في المالية ويعتمدها المحاسب المختص (لا تُرحّل من هنا)
from apps.finance.domain.models import ChartOfAccount, CostCenter, FiscalYear, AccountingPeriod, JournalEntry, JournalEntryLine, Currency

# استهلاك نظام المشتريات لتحديث حالة الاستلام
from apps.procurement.domain.models import PurchaseOrder


class GoodsReceiptService:
    @staticmethod
    @transaction.atomic
    def receive_from_purchase_order(tenant_id, po_id, warehouse_id, items_data, user_id=None):
        """
        استلام البضائع بناءً على أمر الشراء (PO) وتوليد سند استلام مخزني،
        تحديث أرصدة المستودع المعني، وتوليد القيد المالي المقابل تلقائياً.
        """
        try:
            po = PurchaseOrder.objects.get(tenant_id=tenant_id, id=po_id)
        except PurchaseOrder.DoesNotExist:
            raise ValidationError("أمر الشراء غير موجود.")

        warehouse = Warehouse.objects.get(tenant_id=tenant_id, id=warehouse_id)
        
        # 1. إنشاء سند الاستلام
        receipt_number = f"GR-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        gr = GoodsReceipt.objects.create(
            tenant_id=tenant_id,
            receipt_number=receipt_number,
            purchase_order_id=po.id,
            warehouse=warehouse,
            status='approved',
            created_by=user_id
        )

        total_value = Decimal('0.00')
        journal_lines = []

        # 2. إضافة الأصناف للمستودع وتسجيل الحركات
        for data in items_data:
            item_id = data.get('item_id')
            qty_received = Decimal(str(data.get('qty_received', 0)))
            unit_price = Decimal(str(data.get('unit_price', 0)))
            
            # حساب الحساب المالي المخصص للصنف من بند أمر الشراء أو حساب افتراضي
            budget_account_id = data.get('budget_account_id')
            cost_center_id = data.get('cost_center_id')

            item = InventoryItem.objects.get(tenant_id=tenant_id, id=item_id)
            
            # إنشاء البند المستلم
            GoodsReceiptItem.objects.create(
                tenant_id=tenant_id,
                goods_receipt=gr,
                item=item,
                qty_ordered=qty_received, # نفترض الاستلام مطابق للطلب لأغراض التبسيط
                qty_received=qty_received,
                unit_price=unit_price
            )

            # تحديث رصيد المخزون الفعلي
            balance, created = InventoryBalance.objects.get_or_create(
                tenant_id=tenant_id,
                item=item,
                warehouse=warehouse,
                defaults={'qty_on_hand': Decimal('0.0000'), 'qty_reserved': Decimal('0.0000')}
            )
            balance.qty_on_hand += qty_received
            balance.save()

            # تسجيل الحركة التاريخية الفردية للبطاقة
            item_value = qty_received * unit_price
            total_value += item_value

            InventoryTransaction.objects.create(
                tenant_id=tenant_id,
                transaction_number=receipt_number,
                item=item,
                warehouse=warehouse,
                transaction_type='receipt',
                quantity=qty_received,
                unit_cost=unit_price,
                total_value=item_value,
                created_by=user_id
            )

            # تسجيل حركة كارت الصنف اللحظية
            StockMovement.objects.create(
                tenant_id=tenant_id,
                item=item,
                warehouse=warehouse,
                quantity_delta=qty_received,
                new_balance=balance.qty_on_hand,
                reference_document=receipt_number
            )

            # تجميع أطراف القيد المالي
            # الجانب المدين (Debit): حساب الأصول المخزنية المخصص للبند
            if budget_account_id:
                journal_lines.append({
                    'account_id': budget_account_id,
                    'cost_center_id': cost_center_id,
                    'debit': item_value,
                    'credit': Decimal('0.00'),
                    'description': f"استلام صنف {item.name_ar} بموجب {receipt_number}"
                })

        # 3. تحديث حالة أمر الشراء في موديول المشتريات
        po.status = 'completed'
        po.save()

        # 4. توليد القيد المحاسبي في موديول المالية تلقائياً
        creditor_account = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='2').first()
        if creditor_account and journal_lines:
            journal_lines.append({
                'account_id': creditor_account.id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': total_value,
                'description': f"الاستحقاق المخزني للمورد بموجب {receipt_number}"
            })

            # إيجاد الفترة المفتوحة
            active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
            if active_fy:
                period = active_fy.periods.filter(start_date__lte=timezone.localdate(), end_date__gte=timezone.localdate()).first()
                if period:
                    # إنشاء قيد اليومية بالمالية
                    base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                    journal = JournalEntry.objects.create(
                        tenant_id=tenant_id,
                        entry_number=f"JV-{receipt_number}",
                        date=timezone.localdate(),
                        accounting_period=period,
                        description=f"إثبات قيد استلام البضائع بسند {receipt_number}",
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
                    # فصل الصلاحيات: أمين المستودع يحرّك المخزون، والمحاسب يحرّك الدفاتر.
                    gr.journal_entry_id = journal.id
                    gr.save()

        return gr


class GoodsIssueService:
    @staticmethod
    @transaction.atomic
    def issue_stock(tenant_id, warehouse_id, issue_type, items_data, user_id=None):
        """
        صرف كميات مخزنية لصالح جهة معينة (قسم، مختبر، طالب)، 
        تخفيض الرصيد وتوليد قيد الاستهلاك المالي التلقائي.
        """
        warehouse = Warehouse.objects.get(tenant_id=tenant_id, id=warehouse_id)
        
        issue_number = f"GI-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        gi = GoodsIssue.objects.create(
            tenant_id=tenant_id,
            issue_number=issue_number,
            issue_type=issue_type,
            warehouse=warehouse,
            status='approved',
            created_by=user_id
        )

        total_value = Decimal('0.00')
        journal_lines = []

        for data in items_data:
            item_id = data.get('item_id')
            qty_issued = Decimal(str(data.get('qty_issued', 0)))
            unit_cost = Decimal(str(data.get('unit_cost', 0))) # تكلفة الصرف الفعلي
            
            expense_account_id = data.get('expense_account_id')
            cost_center_id = data.get('cost_center_id')

            item = InventoryItem.objects.get(tenant_id=tenant_id, id=item_id)

            # التحقق من توفر رصيد
            try:
                balance = InventoryBalance.objects.get(tenant_id=tenant_id, item=item, warehouse=warehouse)
            except InventoryBalance.DoesNotExist:
                raise ValidationError(f"لا يوجد رصيد للصنف {item.name_ar} في المستودع المحدد.")

            if balance.qty_available < qty_issued:
                raise ValidationError(f"الرصيد المتاح للصنف {item.name_ar} لا يكفي لعملية الصرف.")

            # خصم الكمية
            balance.qty_on_hand -= qty_issued
            balance.save()

            # إنشاء بند الصرف
            GoodsIssueItem.objects.create(
                tenant_id=tenant_id,
                goods_issue=gi,
                item=item,
                qty_issued=qty_issued,
                unit_cost=unit_cost
            )

            item_value = qty_issued * unit_cost
            total_value += item_value

            # تسجيل الحركة التاريخية
            InventoryTransaction.objects.create(
                tenant_id=tenant_id,
                transaction_number=issue_number,
                item=item,
                warehouse=warehouse,
                transaction_type='issue',
                quantity=qty_issued,
                unit_cost=unit_cost,
                total_value=item_value,
                created_by=user_id
            )

            # تسجيل كارت الصنف اللحظي
            StockMovement.objects.create(
                tenant_id=tenant_id,
                item=item,
                warehouse=warehouse,
                quantity_delta=-qty_issued,
                new_balance=balance.qty_on_hand,
                reference_document=issue_number
            )

            # الجانب المدين (Debit): حساب مصروف الاستهلاك للقسم المعني
            if expense_account_id:
                journal_lines.append({
                    'account_id': expense_account_id,
                    'cost_center_id': cost_center_id,
                    'debit': item_value,
                    'credit': Decimal('0.00'),
                    'description': f"مصروف استهلاك صنف {item.name_ar} بسند {issue_number}"
                })

        # الجانب الدائن (Credit): حساب الأصول المخزنية المصروفة
        inventory_asset_account = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='1').first()
        if inventory_asset_account and journal_lines:
            journal_lines.append({
                'account_id': inventory_asset_account.id,
                'cost_center_id': None,
                'debit': Decimal('0.00'),
                'credit': total_value,
                'description': f"تخفيض الأصول المخزنية بسند {issue_number}"
            })

            # توليد قيد اليومية بالمالية
            active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
            if active_fy:
                period = active_fy.periods.filter(start_date__lte=timezone.localdate(), end_date__gte=timezone.localdate()).first()
                if period:
                    base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                    journal = JournalEntry.objects.create(
                        tenant_id=tenant_id,
                        entry_number=f"JV-{issue_number}",
                        date=timezone.localdate(),
                        accounting_period=period,
                        description=f"إثبات قيد استهلاك وصرف مخزني بسند {issue_number}",
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

                    # مسودة بانتظار اعتماد المحاسب — راجع التعليق في receive_from_purchase_order
                    gi.journal_entry_id = journal.id
                    gi.save()

        return gi


class InventoryAdjustmentService:
    @staticmethod
    @transaction.atomic
    def adjust_stock(tenant_id, warehouse_id, items_data, reason, user_id=None):
        """
        تسوية يدوية للمخزون (زيادة الأصناف المكتشفة أو تخفيض التالف/المفقود) وتوليد قيد التسوية بالمالية.
        """
        warehouse = Warehouse.objects.get(tenant_id=tenant_id, id=warehouse_id)
        
        adj_number = f"ADJ-{timezone.now().strftime('%Y%m%d%H%M%S')}"
        adjustment = InventoryAdjustment.objects.create(
            tenant_id=tenant_id,
            adjustment_number=adj_number,
            warehouse=warehouse,
            reason=reason,
            status='approved',
            created_by=user_id
        )

        total_value = Decimal('0.00')
        journal_lines = []

        for data in items_data:
            item_id = data.get('item_id')
            qty_delta = Decimal(str(data.get('qty_delta', 0))) # يمكن أن تكون سالبة للتخفيض
            unit_cost = Decimal(str(data.get('unit_cost', 0)))
            
            account_id = data.get('account_id')
            cost_center_id = data.get('cost_center_id')

            item = InventoryItem.objects.get(tenant_id=tenant_id, id=item_id)

            balance, created = InventoryBalance.objects.get_or_create(
                tenant_id=tenant_id,
                item=item,
                warehouse=warehouse,
                defaults={'qty_on_hand': Decimal('0.0000'), 'qty_reserved': Decimal('0.0000')}
            )
            balance.qty_on_hand += qty_delta
            balance.save()

            item_value = abs(qty_delta) * unit_cost
            total_value += item_value

            # تسجيل الحركة التاريخية
            InventoryTransaction.objects.create(
                tenant_id=tenant_id,
                transaction_number=adj_number,
                item=item,
                warehouse=warehouse,
                transaction_type='adjustment_in' if qty_delta > 0 else 'adjustment_out',
                quantity=abs(qty_delta),
                unit_cost=unit_cost,
                total_value=item_value,
                created_by=user_id
            )

            # تسجيل كارت الصنف اللحظي
            StockMovement.objects.create(
                tenant_id=tenant_id,
                item=item,
                warehouse=warehouse,
                quantity_delta=qty_delta,
                new_balance=balance.qty_on_hand,
                reference_document=adj_number
            )

            # تجميع أطراف القيد
            if qty_delta > 0:
                # زيادة مخزون: مدين حساب المخزن، دائن حساب الإيرادات المتنوعة
                if account_id:
                    journal_lines.append({
                        'account_id': account_id,
                        'cost_center_id': cost_center_id,
                        'debit': item_value,
                        'credit': Decimal('0.00'),
                        'description': f"زيادة قيمة المخزون تسوية {adj_number}"
                    })
            else:
                # نقصان/عجز مخزون: مدين حساب خسائر التسوية، دائن حساب المخزن
                if account_id:
                    journal_lines.append({
                        'account_id': account_id,
                        'cost_center_id': cost_center_id,
                        'debit': item_value,
                        'credit': Decimal('0.00'),
                        'description': f"إثبات عجز/خسائر تسوية مخزنية {adj_number}"
                    })

        # ربط مع القيد المالي بالمالية
        inventory_asset_account = ChartOfAccount.objects.filter(tenant_id=tenant_id, code__startswith='1').first()
        if inventory_asset_account and journal_lines:
            # إضافة الطرف المقابل للقيد تلقائياً
            for line in list(journal_lines):
                if line['debit'] > 0:
                    # الجانب الدائن المقابل لزيادة المخزن
                    journal_lines.append({
                        'account_id': inventory_asset_account.id,
                        'cost_center_id': None,
                        'debit': Decimal('0.00'),
                        'credit': line['debit'],
                        'description': f"قيد تسوية مخزنية {adj_number}"
                    })
                else:
                    # الجانب المدين المقابل لنقص المخزن
                    journal_lines.append({
                        'account_id': inventory_asset_account.id,
                        'cost_center_id': None,
                        'debit': line['credit'],
                        'credit': Decimal('0.00'),
                        'description': f"قيد تسوية مخزنية {adj_number}"
                    })

            active_fy = FiscalYear.objects.filter(tenant_id=tenant_id, status='open', is_current=True).first()
            if active_fy:
                period = active_fy.periods.filter(start_date__lte=timezone.localdate(), end_date__gte=timezone.localdate()).first()
                if period:
                    base_currency = Currency.objects.filter(tenant_id=tenant_id, is_base=True).first()
                    journal = JournalEntry.objects.create(
                        tenant_id=tenant_id,
                        entry_number=f"JV-{adj_number}",
                        date=timezone.localdate(),
                        accounting_period=period,
                        description=f"إثبات قيد تسوية مخزنية بسند {adj_number}",
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

                    # مسودة بانتظار اعتماد المحاسب — التسوية المخزنية تمسّ الدفاتر فلا تُرحّل تلقائياً
                    adjustment.journal_entry_id = journal.id
                    adjustment.save()

        return adjustment
