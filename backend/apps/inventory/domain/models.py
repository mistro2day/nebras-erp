from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. Warehouse (المستودع)
class Warehouse(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم المستودع بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم المستودع بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز المستودع")
    location = models.TextField(blank=True, null=True, verbose_name="الموقع الجغرافي/العنوان")
    is_virtual = models.BooleanField(default=False, verbose_name="مستودع افتراضي (ترانزيت/تصفية)")
    is_transit = models.BooleanField(default=False, verbose_name="مستودع عبور (Transit)")
    is_default = models.BooleanField(default=False, verbose_name="المستودع الافتراضي للمنشأة")
    capacity_volume = models.DecimalField(max_digits=12, decimal_places=2, default=0.0, verbose_name="السعة التخزينية المتاحة (متر مكعب)")

    class Meta:
        db_table = 'nebras_warehouses'
        unique_together = ('tenant_id', 'code')
        verbose_name = "المستودع"
        verbose_name_plural = "المستودعات والمخازن"

    def __str__(self):
        return self.name_ar


# 2. WarehouseZone (منطقة المستودع)
class WarehouseZone(CombinedSharedModel):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='zones', verbose_name="المستودع")
    name_ar = models.CharField(max_length=100, verbose_name="اسم المنطقة بالعربي")
    name_en = models.CharField(max_length=100, verbose_name="اسم المنطقة بالإنجليزي")
    code = models.CharField(max_length=50, verbose_name="رمز المنطقة التخزينية")

    class Meta:
        db_table = 'nebras_warehouse_zones'
        unique_together = ('tenant_id', 'warehouse', 'code')
        verbose_name = "منطقة تخزين"
        verbose_name_plural = "مناطق التخزين بالمستودعات"

    def __str__(self):
        return f"{self.warehouse.name_ar} - {self.name_ar}"


# 3. WarehouseAisle (ممر المستودع)
class WarehouseAisle(CombinedSharedModel):
    zone = models.ForeignKey(WarehouseZone, on_delete=models.CASCADE, related_name='aisles', verbose_name="المنطقة")
    code = models.CharField(max_length=50, verbose_name="رمز الممر/الرف")

    class Meta:
        db_table = 'nebras_warehouse_aisles'
        unique_together = ('tenant_id', 'zone', 'code')
        verbose_name = "ممر المستودع"
        verbose_name_plural = "ممرات المستودعات"

    def __str__(self):
        return f"{self.zone.name_ar} - {self.code}"


# 4. BinLocation (موقع الرف/الصندوق)
class BinLocation(CombinedSharedModel):
    aisle = models.ForeignKey(WarehouseAisle, on_delete=models.CASCADE, related_name='bins', verbose_name="الممر")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز موقع التخزين (Bin)")
    max_weight = models.DecimalField(max_digits=10, decimal_places=2, default=0.0, verbose_name="أقصى وزن متاح للرف (كجم)")
    is_active = models.BooleanField(default=True, verbose_name="نشط وقابل للتخزين فيه")

    class Meta:
        db_table = 'nebras_bin_locations'
        unique_together = ('tenant_id', 'aisle', 'code')
        verbose_name = "موقع رف التخزين"
        verbose_name_plural = "مواقع رفوف التخزين (Bins)"

    def __str__(self):
        return f"{self.aisle.zone.warehouse.name_ar} - Bin: {self.code}"


# 5. InventoryCategory (فئة المخزون)
class InventoryCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم الفئة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم الفئة بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز فئة المخزون")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")

    class Meta:
        db_table = 'nebras_inventory_categories'
        unique_together = ('tenant_id', 'code')
        verbose_name = "فئة المخزون"
        verbose_name_plural = "فئات المخزون (التصنيفات)"

    def __str__(self):
        return self.name_ar


# 6. InventoryUnit (وحدات القياس)
class InventoryUnit(CombinedSharedModel):
    name_ar = models.CharField(max_length=100, verbose_name="اسم الوحدة بالعربي")
    name_en = models.CharField(max_length=100, verbose_name="اسم الوحدة بالإنجليزي")
    code = models.CharField(max_length=30, db_index=True, verbose_name="رمز الوحدة (UoM)")
    base_unit = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='conversions', verbose_name="الوحدة الأساسية المقابلة")
    conversion_factor = models.DecimalField(max_digits=12, decimal_places=6, default=1.000000, verbose_name="معامل التحويل للوحدة الأساسية")

    class Meta:
        db_table = 'nebras_inventory_units'
        unique_together = ('tenant_id', 'code')
        verbose_name = "وحدة القياس"
        verbose_name_plural = "وحدات القياس (UoM)"

    def __str__(self):
        return self.name_ar


# 7. InventoryItem (أصناف وبنود المخزون)
class InventoryItem(CombinedSharedModel):
    TYPE_CHOICES = (
        ('stock', 'صنف مخزني (تتبع الكميات)'),
        ('non_stock', 'صنف غير مخزني (خدمي)'),
        ('consumable', 'مادة استهلاكية'),
        ('medical', 'مستلزم طبي'),
        ('library', 'صنف مكتبة (كتب/دوريات)'),
        ('laboratory', 'مستلزم مختبر وكيمياويات'),
        ('fixed_asset', 'أصل ثابت (تهيئة للربط)'),
    )
    category = models.ForeignKey(InventoryCategory, on_delete=models.PROTECT, related_name='items', verbose_name="فئة الصنف")
    name_ar = models.CharField(max_length=200, verbose_name="اسم الصنف بالعربي")
    name_en = models.CharField(max_length=200, verbose_name="اسم الصنف بالإنجليزي")
    sku = models.CharField(max_length=100, db_index=True, verbose_name="رمز التخزين التعريفي (SKU)")
    barcode = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name="الباركود (Barcode)")
    qr_code = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name="رمز الاستجابة السريعة (QR Code)")
    uom = models.ForeignKey(InventoryUnit, on_delete=models.PROTECT, related_name='items', verbose_name="وحدة القياس الافتراضية")
    item_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='stock', verbose_name="نوع البند المخزني")
    manufacturer = models.CharField(max_length=150, blank=True, null=True, verbose_name="الشركة المصنعة")
    brand = models.CharField(max_length=100, blank=True, null=True, verbose_name="العلامة التجارية")
    model_number = models.CharField(max_length=100, blank=True, null=True, verbose_name="الموديل")
    specifications = models.TextField(blank=True, null=True, verbose_name="المواصفات الفنية")

    class Meta:
        db_table = 'nebras_inventory_items'
        unique_together = ('tenant_id', 'sku')
        verbose_name = "بند مخزني"
        verbose_name_plural = "الأصناف والبنود المخزنية"

    def __str__(self):
        return self.name_ar


# 8. InventoryBatch (تشغيلات المخزون)
class InventoryBatch(CombinedSharedModel):
    batch_number = models.CharField(max_length=100, db_index=True, verbose_name="رقم التشغيلة (Batch)")
    manufacturing_date = models.DateField(blank=True, null=True, verbose_name="تاريخ التصنيع")
    expiry_date = models.DateField(blank=True, null=True, verbose_name="تاريخ انتهاء الصلاحية")

    class Meta:
        db_table = 'nebras_inventory_batches'
        unique_together = ('tenant_id', 'batch_number')
        verbose_name = "تشغيلة مخزنية"
        verbose_name_plural = "تشغيلات الأصناف (Batches)"

    def __str__(self):
        return self.batch_number


# 9. InventoryLot (لوط المخزون)
class InventoryLot(CombinedSharedModel):
    lot_number = models.CharField(max_length=100, db_index=True, verbose_name="رقم اللوط (Lot)")
    description = models.TextField(blank=True, null=True, verbose_name="الوصف")

    class Meta:
        db_table = 'nebras_inventory_lots'
        unique_together = ('tenant_id', 'lot_number')
        verbose_name = "لوط مخزني"
        verbose_name_plural = "لوطات المخزون (Lots)"

    def __str__(self):
        return self.lot_number


# 10. SerialNumber (الأرقام التسلسلية المخصصة للصنف)
class SerialNumber(CombinedSharedModel):
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='serials', verbose_name="الصنف")
    serial_number = models.CharField(max_length=100, db_index=True, verbose_name="الرقم التسلسلي الفريد")
    is_allocated = models.BooleanField(default=False, verbose_name="مخصص ومحجوز")

    class Meta:
        db_table = 'nebras_inventory_serials'
        unique_together = ('tenant_id', 'item', 'serial_number')
        verbose_name = "الرقم التسلسلي"
        verbose_name_plural = "الأرقام التسلسلية للأصناف"

    def __str__(self):
        return self.serial_number


# 11. InventoryBalance (رصيد المخزون الفعلي في المواقع)
class InventoryBalance(CombinedSharedModel):
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, related_name='balances', verbose_name="الصنف")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='balances', verbose_name="المستودع")
    bin_location = models.ForeignKey(BinLocation, on_delete=models.PROTECT, related_name='balances', null=True, blank=True, verbose_name="موقع الرف")
    batch = models.ForeignKey(InventoryBatch, on_delete=models.PROTECT, null=True, blank=True, verbose_name="التشغيلة")
    lot = models.ForeignKey(InventoryLot, on_delete=models.PROTECT, null=True, blank=True, verbose_name="اللوط")
    qty_on_hand = models.DecimalField(max_digits=15, decimal_places=4, default=0.0, verbose_name="الكمية المتوفرة حالياً")
    qty_reserved = models.DecimalField(max_digits=15, decimal_places=4, default=0.0, verbose_name="الكمية المحجوزة")

    class Meta:
        db_table = 'nebras_inventory_balances'
        verbose_name = "رصيد الصنف"
        verbose_name_plural = "أرصدة الأصناف بالمستودعات"

    @property
    def qty_available(self):
        return self.qty_on_hand - self.qty_reserved


# 12. InventoryTransaction (الحركات التاريخية القياسية)
class InventoryTransaction(CombinedSharedModel):
    TYPE_CHOICES = (
        ('receipt', 'سند استلام بضائع (Goods Receipt)'),
        ('issue', 'سند صرف بضائع (Goods Issue)'),
        ('transfer', 'نقل بين مستودعات (Transfer)'),
        ('adjustment_in', 'تسوية بالزيادة'),
        ('adjustment_out', 'تسوية بالنقصان/تلف'),
    )
    transaction_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم الحركة المخزنية")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="المستودع المعني")
    bin_location = models.ForeignKey(BinLocation, on_delete=models.PROTECT, null=True, blank=True, verbose_name="موقع الرف")
    transaction_type = models.CharField(max_length=30, choices=TYPE_CHOICES, verbose_name="نوع الحركة")
    quantity = models.DecimalField(max_digits=15, decimal_places=4, verbose_name="الكمية")
    unit_cost = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="تكلفة الوحدة")
    total_value = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="القيمة الإجمالية للحركة")
    date = models.DateField(default=timezone.localdate, verbose_name="تاريخ تسجيل الحركة")

    class Meta:
        db_table = 'nebras_inventory_transactions'
        verbose_name = "حركة مخزنية"
        verbose_name_plural = "سجل الحركات المخزنية التاريخية"


# 13. InventoryReservation (حجوزات المخزون المؤقتة)
class InventoryReservation(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشط ومعلق'),
        ('released', 'ملغى ومفرج عنه'),
        ('consumed', 'مستهلك بالكامل'),
    )
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف المحجوز")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="المستودع")
    quantity = models.DecimalField(max_digits=15, decimal_places=4, verbose_name="الكمية المحجوزة")
    reserved_until = models.DateTimeField(verbose_name="محجوز حتى تاريخ")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'nebras_inventory_reservations'
        verbose_name = "حجز مخزن مؤقت"
        verbose_name_plural = "حجوزات المخزون المؤقتة"


# 14. InventoryAdjustment (تسويات وجرد الفروقات يدوياً)
class InventoryAdjustment(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('pending', 'قيد موافقة واعتماد التسوية'),
        ('approved', 'معتمدة ومرحلة ماليّاً'),
        ('rejected', 'مرفوضة'),
    )
    adjustment_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم التسوية المخزنية")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="المستودع")
    date = models.DateField(default=timezone.localdate, verbose_name="التاريخ")
    reason = models.TextField(verbose_name="سبب التسوية (فقد/تلف/عجز/زيادة)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد التسوية المخزنية المنعكس في المالية")

    class Meta:
        db_table = 'nebras_inventory_adjustments'
        unique_together = ('tenant_id', 'adjustment_number')
        verbose_name = "تسوية مخزنية"
        verbose_name_plural = "تسويات المخزون (خسائر/أرباح)"


# 15. GoodsReceipt (سندات استلام بضائع)
class GoodsReceipt(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('pending', 'تحت الفحص والمراجعة'),
        ('approved', 'مستلم ومضاف للمخزون'),
        ('rejected', 'مرفوض الاستلام'),
    )
    receipt_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم سند الاستلام")
    purchase_order_id = models.UUIDField(null=True, blank=True, help_text="رابط مع أمر الشراء (PO) في موديول المشتريات")
    received_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الاستلام الفعلي")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="مستودع الاستلام الرئيسي")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد الاستحقاق/التسوية المخزنية بالمالية")

    class Meta:
        db_table = 'nebras_goods_receipts'
        unique_together = ('tenant_id', 'receipt_number')
        verbose_name = "سند استلام بضائع"
        verbose_name_plural = "سندات استلام البضائع"


# 16. GoodsReceiptItem (بنود سندات استلام البضائع)
class GoodsReceiptItem(CombinedSharedModel):
    goods_receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='items', verbose_name="سند الاستلام")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف")
    qty_ordered = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="الكمية المطلوبة في أمر الشراء")
    qty_received = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="الكمية المستلمة فعلياً")
    qty_rejected = models.DecimalField(max_digits=12, decimal_places=4, default=0.0, verbose_name="الكمية المرفوضة/التالفة")
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="سعر التكلفة المعتمد")

    class Meta:
        db_table = 'nebras_goods_receipt_items'
        verbose_name = "بند سند استلام"
        verbose_name_plural = "بنود سندات استلام البضائع"


# 17. GoodsIssue (سندات صرف البضائع)
class GoodsIssue(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('approved', 'تم الصرف ومسجل ماليّاً'),
        ('cancelled', 'ملغى'),
    )
    issue_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم سند الصرف")
    issue_type = models.CharField(max_length=50, default='department', help_text="نوع الجهة المستلمة: قسم، عيادة، مختبر، طالب، إلخ")
    destination_reference_id = models.UUIDField(null=True, blank=True, help_text="المعرف للجهة المستلمة (UUID للمستلم)")
    issue_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ صرف البند")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="مستودع الصرف")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد الصرف الاستهلاكي المنعكس بالمالية")

    class Meta:
        db_table = 'nebras_goods_issues'
        unique_together = ('tenant_id', 'issue_number')
        verbose_name = "سند صرف مخزني"
        verbose_name_plural = "سندات صرف البضائع والمستلزمات"


# 18. GoodsIssueItem (بنود سند صرف البضائع)
class GoodsIssueItem(CombinedSharedModel):
    goods_issue = models.ForeignKey(GoodsIssue, on_delete=models.CASCADE, related_name='items', verbose_name="سند الصرف")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف المصروف")
    qty_issued = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="الكمية المصروفة")
    unit_cost = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="تكلفة الصرف المقدرة")

    class Meta:
        db_table = 'nebras_goods_issue_items'
        verbose_name = "بند سند الصرف"
        verbose_name_plural = "بنود سندات صرف البضائع"


# 19. InventoryTransfer (أوامر التحويل والتحركات بين المخازن)
class InventoryTransfer(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة تحويل'),
        ('pending', 'قيد موافقة التحويل'),
        ('transit', 'في الطريق للجهة الأخرى (Transit)'),
        ('completed', 'مكتمل ومستلم بالكامل'),
        ('cancelled', 'ملغى'),
    )
    transfer_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم طلب التحويل")
    from_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='outgoing_transfers', verbose_name="المستودع المصدر")
    to_warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='incoming_transfers', verbose_name="المستودع الوجهة")
    date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الطلب")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    approved_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_inventory_transfers'
        unique_together = ('tenant_id', 'transfer_number')
        verbose_name = "تحويل مخزني"
        verbose_name_plural = "حركات التحويل بين المستودعات"


# 19-ب. InventoryTransferItem (بنود التحويل المخزني)
class InventoryTransferItem(CombinedSharedModel):
    """بنود التحويل — التحويل بلا بنود لا يعرف ماذا يُنقل ولا كم."""
    transfer = models.ForeignKey(InventoryTransfer, on_delete=models.CASCADE, related_name='items', verbose_name="التحويل")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف المحوَّل")
    quantity = models.DecimalField(max_digits=15, decimal_places=4, verbose_name="الكمية المحوَّلة")
    unit_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="تكلفة الوحدة وقت التحويل")

    class Meta:
        db_table = 'nebras_inventory_transfer_items'
        verbose_name = "بند تحويل مخزني"
        verbose_name_plural = "بنود التحويلات المخزنية"


# 20. StockCount (أوامر جرد المخزون)
class StockCount(CombinedSharedModel):
    STATUS_CHOICES = (
        ('scheduled', 'مجدول وقيد التحضير'),
        ('counting', 'قيد العد الفعلي والمطابقة'),
        ('completed', 'مكتمل واعتمت الفروقات'),
        ('cancelled', 'ملغى'),
    )
    count_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم محضر الجرد")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="المستودع الخاضع للجرد")
    start_date = models.DateField(verbose_name="تاريخ بدء الجرد")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    is_blind = models.BooleanField(default=False, verbose_name="جرد أعمى (لا يعرض الكميات الدفترية للعدادين)")

    class Meta:
        db_table = 'nebras_stock_counts'
        unique_together = ('tenant_id', 'count_number')
        verbose_name = "محضر جرد مخزني"
        verbose_name_plural = "محاضر جرد المخازن (السنوية/الدورية)"


# 21. StockCountItem (بنود محضر الجرد والتسجيل)
class StockCountItem(CombinedSharedModel):
    stock_count = models.ForeignKey(StockCount, on_delete=models.CASCADE, related_name='items', verbose_name="محضر الجرد")
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف")
    qty_book = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="الكمية الدفترية المسجلة بالنظام")
    qty_physical = models.DecimalField(max_digits=12, decimal_places=4, default=0.0, verbose_name="الكمية الفعلية بعد العد")
    variance = models.DecimalField(max_digits=12, decimal_places=4, default=0.0, verbose_name="فرق الجرد (Physical - Book)")

    class Meta:
        db_table = 'nebras_stock_count_items'
        verbose_name = "بند محضر جرد"
        verbose_name_plural = "بنود محاضر جرد المخازن"


# 22. StockMovement (سجل ومخطط تحركات البند)
class StockMovement(CombinedSharedModel):
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="المستودع")
    bin_location = models.ForeignKey(BinLocation, on_delete=models.PROTECT, null=True, blank=True, verbose_name="موقع الرف")
    quantity_delta = models.DecimalField(max_digits=15, decimal_places=4, verbose_name="فارق الكمية (+ / -)")
    new_balance = models.DecimalField(max_digits=15, decimal_places=4, verbose_name="الرصيد الجديد الفعلي")
    reference_document = models.CharField(max_length=100, verbose_name="رقم المستند المرجعي (استلام/صرف/تسوية)")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="وقت تسجيل التعديل")

    class Meta:
        db_table = 'nebras_stock_movements'
        ordering = ['-timestamp']
        verbose_name = "حركة المخزون اللحظية"
        verbose_name_plural = "تحركات المخزون اللحظية (Stock Cards)"


# 23. InventoryValuation (تقييم المخزون التاريخي)
class InventoryValuation(CombinedSharedModel):
    valuation_date = models.DateField(db_index=True, verbose_name="تاريخ احتساب التقييم")
    method = models.CharField(max_length=20, choices=(('fifo', 'أول يصرف أولاً FIFO'), ('weighted_average', 'المتوسط المرجح')), default='weighted_average')
    total_value = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="القيمة الإجمالية للمخزون")

    class Meta:
        db_table = 'nebras_inventory_valuations'
        verbose_name = "تقييم المخزون"
        verbose_name_plural = "تقييمات المخزون التاريخية"


# 24. ReorderRule (قواعد إعادة الطلب التلقائي للمورد المفصل)
class ReorderRule(CombinedSharedModel):
    item = models.ForeignKey(InventoryItem, on_delete=models.PROTECT, verbose_name="الصنف الخاضع للقاعدة")
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, verbose_name="المستودع")
    min_stock = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="الحد الأدنى للمخزون")
    max_stock = models.DecimalField(max_digits=12, decimal_places=4, verbose_name="الحد الأقصى للمخزون")
    safety_stock = models.DecimalField(max_digits=12, decimal_places=4, default=0.0, verbose_name="مخزون الأمان")
    lead_time_days = models.IntegerField(default=5, verbose_name="فترة التوريد باليوم")
    preferred_vendor_id = models.UUIDField(null=True, blank=True, help_text="رابط المورد المفضل بطلب التوريد")

    class Meta:
        db_table = 'nebras_inventory_reorder_rules'
        unique_together = ('tenant_id', 'item', 'warehouse')
        verbose_name = "قاعدة إعادة الطلب"
        verbose_name_plural = "قواعد إعادة الطلب التلقائي للأصناف"


# 25. InventorySettings (إعدادات المخزون العامة)
class InventorySettings(CombinedSharedModel):
    allow_negative_stock = models.BooleanField(default=False, verbose_name="السماح بالبيع/الصرف بالسالب")
    default_valuation_method = models.CharField(max_length=30, choices=(('fifo', 'FIFO'), ('weighted_average', 'Weighted Average')), default='weighted_average')
    enforce_inspection_on_receipt = models.BooleanField(default=False, verbose_name="إلزامية الفحص والجودة عند استلام البضائع")

    class Meta:
        db_table = 'nebras_inventory_settings'
        verbose_name = "إعدادات المخازن"
        verbose_name_plural = "إعدادات المخازن والمستودعات"


# 26. InventoryStatistics (إحصائيات المخزون العامة)
class InventoryStatistics(CombinedSharedModel):
    as_of_date = models.DateField(db_index=True)
    total_items_count = models.IntegerField(default=0, verbose_name="إجمالي عدد الأصناف النشطة")
    total_stock_value = models.DecimalField(max_digits=15, decimal_places=2, default=0.0, verbose_name="إجمالي القيمة التقديرية للمخزون")
    out_of_stock_items = models.IntegerField(default=0, verbose_name="الأصناف غير المتوفرة (منتهية المخزون)")
    low_stock_items = models.IntegerField(default=0, verbose_name="الأصناف تحت حد إعادة الطلب")

    class Meta:
        db_table = 'nebras_inventory_statistics'
        verbose_name = "إحصائية المخزون"
        verbose_name_plural = "إحصائيات المخازن والمخزون"


# 27. InventoryAudit (سجل تدقيق عمليات المخازن الحساسة)
class InventoryAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100, verbose_name="نوع العملية المخزنية الحساسة")
    performed_by = models.UUIDField(null=True, blank=True, verbose_name="الموظف المنفذ")
    performed_at = models.DateTimeField(default=timezone.now, verbose_name="وقت وتاريخ التنفيذ")
    details = models.JSONField(default=dict, verbose_name="تفاصيل العملية والكميات السابقة والحالية")

    class Meta:
        db_table = 'nebras_inventory_audits'
        verbose_name = "سجل تدقيق مخزني"
        verbose_name_plural = "سجلات تدقيق عمليات المستودعات والمخزون"