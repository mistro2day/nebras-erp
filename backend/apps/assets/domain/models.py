from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. AssetCategory (فئات الأصول)
class AssetCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم فئة الأصول بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم فئة الأصول بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز الفئة")

    class Meta:
        db_table = 'nebras_asset_categories'
        unique_together = ('tenant_id', 'code')
        verbose_name = "فئة أصول"
        verbose_name_plural = "فئات الأصول الثابتة"

    def __str__(self):
        return self.name_ar


# 2. AssetClass (رتبة/فئات التصنيف للأصول)
class AssetClass(CombinedSharedModel):
    category = models.ForeignKey(AssetCategory, on_delete=models.CASCADE, related_name='classes', verbose_name="فئة الأصول")
    name_ar = models.CharField(max_length=150, verbose_name="اسم رتبة الأصل بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم رتبة الأصل بالإنجليزي")
    code = models.CharField(max_length=50, verbose_name="رمز الرتبة")

    class Meta:
        db_table = 'nebras_asset_classes'
        unique_together = ('tenant_id', 'category', 'code')
        verbose_name = "رتبة الأصل"
        verbose_name_plural = "رتب وتصنيفات الأصول"

    def __str__(self):
        return self.name_ar


# 3. AssetGroup (مجموعات الأصول)
class AssetGroup(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم المجموعة بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم المجموعة بالإنجليزي")
    code = models.CharField(max_length=50, verbose_name="رمز المجموعة")

    class Meta:
        db_table = 'nebras_asset_groups'
        unique_together = ('tenant_id', 'code')
        verbose_name = "مجموعة أصول"
        verbose_name_plural = "مجموعات الأصول"

    def __str__(self):
        return self.name_ar


# 4. AssetLocation (مواقع الأصول)
class AssetLocation(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم الموقع بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم الموقع بالإنجليزي")
    code = models.CharField(max_length=50, verbose_name="رمز الموقع")
    building = models.CharField(max_length=100, blank=True, null=True, verbose_name="المبنى")
    floor = models.CharField(max_length=50, blank=True, null=True, verbose_name="الطابق/الدور")
    room = models.CharField(max_length=50, blank=True, null=True, verbose_name="الغرفة/المكتب")

    class Meta:
        db_table = 'nebras_asset_locations'
        unique_together = ('tenant_id', 'code')
        verbose_name = "موقع أصول"
        verbose_name_plural = "مواقع الأصول الثابتة"

    def __str__(self):
        return self.name_ar


# 5. Asset (الأصول الثابتة)
class Asset(CombinedSharedModel):
    STATUS_CHOICES = (
        ('registered', 'مسجل وقيد الإعداد'),
        ('capitalized', 'مرسمل ومستخدم (Active)'),
        ('disposed', 'مستبعد أو مباع (Disposed)'),
        ('retired', 'متقاعد ومنتهي الصلاحية'),
        ('maintenance', 'تحت الصيانة والإصلاح'),
    )
    asset_number = models.CharField(max_length=50, db_index=True, verbose_name="رقم تعريف الأصل")
    barcode = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name="الباركود")
    qr_code = models.CharField(max_length=100, blank=True, null=True, db_index=True, verbose_name="رمز QR")
    name_ar = models.CharField(max_length=200, verbose_name="اسم الأصل بالعربي")
    name_en = models.CharField(max_length=200, verbose_name="اسم الأصل بالإنجليزي")
    
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name='assets', verbose_name="فئة الأصل")
    asset_class = models.ForeignKey(AssetClass, on_delete=models.PROTECT, related_name='assets', null=True, blank=True, verbose_name="رتبة الأصل")
    group = models.ForeignKey(AssetGroup, on_delete=models.PROTECT, related_name='assets', null=True, blank=True, verbose_name="مجموعة الأصل")
    location = models.ForeignKey(AssetLocation, on_delete=models.PROTECT, related_name='assets', verbose_name="موقع الأصل")

    serial_number = models.CharField(max_length=100, blank=True, null=True, verbose_name="الرقم التسلسلي من المصنع")
    manufacturer = models.CharField(max_length=150, blank=True, null=True, verbose_name="الشركة المصنعة")
    brand = models.CharField(max_length=100, blank=True, null=True, verbose_name="العلامة التجارية")
    model = models.CharField(max_length=100, blank=True, null=True, verbose_name="الموديل")
    
    purchase_date = models.DateField(blank=True, null=True, verbose_name="تاريخ الشراء")
    commission_date = models.DateField(blank=True, null=True, verbose_name="تاريخ بدء التشغيل/الاستخدام")
    useful_life_months = models.IntegerField(default=60, verbose_name="العمر الافتراضي بالأشهر")
    
    acquisition_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="تكلفة الاقتناء")
    salvage_value = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="القيمة المتبقية/الخردة")
    book_value = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="القيمة الدفترية الحالية")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered', verbose_name="حالة الأصل")

    class Meta:
        db_table = 'nebras_assets'
        unique_together = ('tenant_id', 'asset_number')
        verbose_name = "الأصل الثابت"
        verbose_name_plural = "الأصول الثابتة ودورة الحياة"

    def __str__(self):
        return self.name_ar


# 6. AssetAssignment (تخصيص/تسليم الأصول للعهدة)
class AssetAssignment(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments', verbose_name="الأصل")
    assigned_to_user_id = models.UUIDField(db_index=True, verbose_name="الموظف المستلم للعهدة")
    assigned_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ تسليم العهدة")
    return_date = models.DateField(blank=True, null=True, verbose_name="تاريخ إرجاع العهدة")
    notes = models.TextField(blank=True, null=True, verbose_name="ملاحظات")

    class Meta:
        db_table = 'nebras_asset_assignments'
        verbose_name = "تسليم عهدة"
        verbose_name_plural = "سجلات عهد وتسليم الأصول"


# 7. AssetCustodian (سجل الأمناء التاريخيين للأصل)
class AssetCustodian(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='custodians', verbose_name="الأصل")
    custodian_user_id = models.UUIDField(verbose_name="أمين العهدة")
    start_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ البدء")
    end_date = models.DateField(blank=True, null=True, verbose_name="تاريخ الانتهاء")

    class Meta:
        db_table = 'nebras_asset_custodians'
        verbose_name = "أمين عهدة"
        verbose_name_plural = "سجل أمناء العهد للأصول"


# 8. AssetComponent (مكونات الأصول)
class AssetComponent(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='components', verbose_name="الأصل الرئيسي")
    name = models.CharField(max_length=150, verbose_name="اسم المكون الفني")
    serial_number = models.CharField(max_length=100, blank=True, null=True, verbose_name="الرقم التسلسلي للمكون")

    class Meta:
        db_table = 'nebras_asset_components'
        verbose_name = "مكون الأصل"
        verbose_name_plural = "مكونات وتفاصيل الأصول الفنية"


# 9. AssetAccessory (ملحقات ومرفقات الأصول)
class AssetAccessory(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='accessories', verbose_name="الأصل")
    name = models.CharField(max_length=150, verbose_name="اسم الملحق")

    class Meta:
        db_table = 'nebras_asset_accessories'
        verbose_name = "ملحق أصل"
        verbose_name_plural = "ملحقات الأصول"


# 10. AssetWarranty (ضمانات الأصول)
class AssetWarranty(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='warranties', verbose_name="الأصل")
    warranty_number = models.CharField(max_length=100, verbose_name="رقم وثيقة الضمان")
    provider = models.CharField(max_length=150, verbose_name="الجهة المانحة للضمان")
    start_date = models.DateField(verbose_name="تاريخ بدء الضمان")
    end_date = models.DateField(verbose_name="تاريخ انتهاء الضمان")
    coverage_details = models.TextField(blank=True, null=True, verbose_name="تفاصيل التغطية والضمان")

    class Meta:
        db_table = 'nebras_asset_warranties'
        verbose_name = "ضمان أصل"
        verbose_name_plural = "ضمانات الأصول الثابتة"


# 11. AssetInsurance (تأمينات الأصول)
class AssetInsurance(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='insurances', verbose_name="الأصل")
    policy_number = models.CharField(max_length=100, verbose_name="رقم وثيقة التأمين")
    provider = models.CharField(max_length=150, verbose_name="شركة التأمين")
    premium = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="قسط التأمين")
    coverage_amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="مبلغ التغطية التأمينية")
    start_date = models.DateField(verbose_name="تاريخ بدء التأمين")
    end_date = models.DateField(verbose_name="تاريخ انتهاء التأمين")

    class Meta:
        db_table = 'nebras_asset_insurances'
        verbose_name = "تأمين أصل"
        verbose_name_plural = "وثائق تأمين الأصول الثابتة"


# 12. AssetVendor (موردي الأصول)
class AssetVendor(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم مورد الأصول بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم مورد الأصول بالإنجليزي")
    contact_phone = models.CharField(max_length=50, blank=True, null=True, verbose_name="رقم الاتصال")

    class Meta:
        db_table = 'nebras_asset_vendors'
        verbose_name = "مورد أصول"
        verbose_name_plural = "موردي الأصول"

    def __str__(self):
        return self.name_ar


# 13. AssetAcquisition (عمليات اقتناء الأصول)
class AssetAcquisition(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='acquisitions', verbose_name="الأصل")
    acquisition_type = models.CharField(max_length=50, choices=(('purchase', 'شراء مباشر'), ('donation', 'تبرع/هبة'), ('construction', 'تصنيع داخلي')), default='purchase', verbose_name="نوع الاقتناء")
    cost = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="تكلفة الشراء/القيمة العادلة")
    acquisition_date = models.DateField(verbose_name="تاريخ الاقتناء")
    vendor_id = models.UUIDField(null=True, blank=True, help_text="رابط المورد بموديول المشتريات")

    class Meta:
        db_table = 'nebras_asset_acquisitions'
        verbose_name = "عملية اقتناء"
        verbose_name_plural = "سجلات اقتناء الأصول"


# 14. AssetCapitalization (رسملة الأصول وتحويلها للتشغيل المالي)
class AssetCapitalization(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='capitalizations', verbose_name="الأصل")
    capitalization_date = models.DateField(verbose_name="تاريخ الرسملة الفعلي")
    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="القيمة المعتمدة للرسملة")
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="رابط القيد المالي بالمالية")

    class Meta:
        db_table = 'nebras_asset_capitalizations'
        verbose_name = "رسملة أصل"
        verbose_name_plural = "عمليات رسملة الأصول الثابتة"


# 15. AssetDepreciationMethod (طرق الإهلاك للأصول)
class AssetDepreciationMethod(CombinedSharedModel):
    name_ar = models.CharField(max_length=100, verbose_name="اسم طريقة الإهلاك بالعربي")
    name_en = models.CharField(max_length=100, verbose_name="اسم طريقة الإهلاك بالإنجليزي")
    code = models.CharField(max_length=50, verbose_name="رمز طريقة الإهلاك (StraightLine, Declining)")

    class Meta:
        db_table = 'nebras_asset_depreciation_methods'
        unique_together = ('tenant_id', 'code')
        verbose_name = "طريقة إهلاك"
        verbose_name_plural = "طرق إهلاك الأصول"

    def __str__(self):
        return self.name_ar


# 16. AssetDepreciation (إهلاك الأصول الدوري)
class AssetDepreciation(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='depreciations', verbose_name="الأصل")
    depreciation_date = models.DateField(verbose_name="تاريخ قيد الإهلاك")
    depreciation_amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="قيمة الإهلاك المحتسب")
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="إجمالي الإهلاك المتراكم")
    book_value_after = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="القيمة الدفترية بعد القيد")
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="رابط قيد اليومية بالمالية")

    class Meta:
        db_table = 'nebras_asset_depreciations'
        verbose_name = "إهلاك أصول دوري"
        verbose_name_plural = "سجلات إهلاك الأصول الثابتة"


# 17. AssetTransfer (تحويل الأصول بين المواقع أو الفروع)
class AssetTransfer(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'معلق وموافق الإدارة مطلوب'),
        ('approved', 'معتمد ومثبت ماليّاً وموقعيّاً'),
        ('rejected', 'مرفوض التحويل'),
    )
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='transfers', verbose_name="الأصل")
    from_location = models.ForeignKey(AssetLocation, on_delete=models.PROTECT, related_name='outgoing_transfers', verbose_name="الموقع الأصلي")
    to_location = models.ForeignKey(AssetLocation, on_delete=models.PROTECT, related_name='incoming_transfers', verbose_name="الموقع الوجهة")
    transfer_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ طلب النقل")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_asset_transfers'
        verbose_name = "تحويل أصل"
        verbose_name_plural = "طلبات نقل وتحويل الأصول"


# 18. AssetMovement (التحركات الفيزيائية للأصل وتتبعها)
class AssetMovement(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='movements', verbose_name="الأصل")
    from_location = models.ForeignKey(AssetLocation, on_delete=models.PROTECT, related_name='+', verbose_name="الموقع السابق")
    to_location = models.ForeignKey(AssetLocation, on_delete=models.PROTECT, related_name='+', verbose_name="الموقع الحالي")
    timestamp = models.DateTimeField(default=timezone.now, verbose_name="تاريخ ووقت التحرك الفعلي")

    class Meta:
        db_table = 'nebras_asset_movements'
        ordering = ['-timestamp']
        verbose_name = "حركة أصول"
        verbose_name_plural = "سجل حركات وتتبع الأصول الثابتة"


# 19. AssetMaintenancePlaceholder (صيانة الأصول)
class AssetMaintenancePlaceholder(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_records', verbose_name="الأصل")
    maintenance_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الصيانة والإصلاح")
    cost = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="تكلفة الصيانة")
    description = models.TextField(verbose_name="وصف أعمال الصيانة")

    class Meta:
        db_table = 'nebras_asset_maintenance_placeholders'
        verbose_name = "عملية صيانة"
        verbose_name_plural = "عمليات صيانة الأصول"


# 20. AssetCondition (الحالات الفنية للأصل)
class AssetCondition(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='conditions', verbose_name="الأصل")
    condition = models.CharField(max_length=50, choices=(('new', 'جديد ممتاز'), ('good', 'حالة جيدة'), ('fair', 'مقبول'), ('poor', 'تالف/متهالك')), default='good', verbose_name="الحالة الحالية للأصل")
    as_of_date = models.DateField(default=timezone.localdate, verbose_name="التاريخ")

    class Meta:
        db_table = 'nebras_asset_conditions'
        verbose_name = "حالة أصل فنية"
        verbose_name_plural = "الحالات الفنية للأصول"


# 21. AssetInspection (فحوصات ومعاينات الأصول)
class AssetInspection(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='inspections', verbose_name="الأصل")
    inspection_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الفحص")
    inspector_user_id = models.UUIDField(verbose_name="المفتش/الموظف القائم بالفحص")
    result = models.TextField(verbose_name="نتائج وتوصيات الفحص")

    class Meta:
        db_table = 'nebras_asset_inspections'
        verbose_name = "فحص أصول"
        verbose_name_plural = "فحوصات ومعاينات الأصول"


# 22. AssetDisposal (الاستبعاد وشطب الأصول)
class AssetDisposal(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'معلق الموافقة'),
        ('approved', 'تم الشطب والاستبعاد ماليّاً'),
        ('rejected', 'مرفوض الاستبعاد'),
    )
    DISPOSAL_TYPE = (
        ('sale', 'بيع للغير'),
        ('scrap', 'بيع كخردة/تخريد'),
        ('donation', 'هبة وتبرع'),
        ('write_off', 'شطب وإهلاك كامل'),
        ('stolen', 'سرقة أو فقد'),
    )
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='disposals', verbose_name="الأصل المستبعد")
    disposal_type = models.CharField(max_length=20, choices=DISPOSAL_TYPE, default='write_off', verbose_name="نوع الاستبعاد")
    disposal_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الاستبعاد الفعلي")
    disposal_proceeds = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="متحصلات البيع/الاستبعاد")
    gain_loss = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="الأرباح أو الخسائر الرأسمالية المحققة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد الاستبعاد المنعكس في الحسابات بالمالية")

    class Meta:
        db_table = 'nebras_asset_disposals'
        verbose_name = "استبعاد أصول"
        verbose_name_plural = "سجلات استبعاد وشطب الأصول"


# 23. AssetSale (عمليات بيع الأصول الموثقة)
class AssetSale(CombinedSharedModel):
    disposal = models.ForeignKey(AssetDisposal, on_delete=models.CASCADE, related_name='sales', verbose_name="عملية الاستبعاد")
    buyer_name = models.CharField(max_length=200, verbose_name="اسم المشتري")
    sale_price = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="سعر البيع المعتمد")

    class Meta:
        db_table = 'nebras_asset_sales'
        verbose_name = "بيع أصل"
        verbose_name_plural = "عمليات بيع الأصول"


# 24. AssetRetirement (سجل تقاعد وخروج الأصول الفعلي)
class AssetRetirement(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='retirements', verbose_name="الأصل")
    retirement_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ التقاعد")
    reason = models.TextField(verbose_name="سبب الخروج من الخدمة")

    class Meta:
        db_table = 'nebras_asset_retirements'
        verbose_name = "تقاعد أصل"
        verbose_name_plural = "سجلات تقاعد الأصول"


# 25. AssetRevaluation (عمليات إعادة التقييم المالي للأصل)
class AssetRevaluation(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='revaluations', verbose_name="الأصل")
    revaluation_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ إعادة التقييم")
    old_value = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="القيمة القديمة")
    new_value = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="القيمة المقدرة الجديدة")
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد تسوية إعادة التقييم بالمالية")

    class Meta:
        db_table = 'nebras_asset_revaluations'
        verbose_name = "إعادة تقييم أصل"
        verbose_name_plural = "عمليات إعادة التقييم للأصول"


# 26. AssetImpairment (خسائر تدني/اضمحلال قيمة الأصل)
class AssetImpairment(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='impairments', verbose_name="الأصل")
    impairment_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الاضمحلال")
    impairment_amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="قيمة الاضمحلال/التخفيض")
    journal_entry_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_asset_impairments'
        verbose_name = "اضمحلال قيمة أصل"
        verbose_name_plural = "عمليات اضمحلال وتدني الأصول"


# 27. AssetInventoryAudit (حملات جرد الأصول الثابتة الفعلي)
class AssetInventoryAudit(CombinedSharedModel):
    audit_name = models.CharField(max_length=150, verbose_name="اسم حملة جرد الأصول")
    audit_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الجرد")
    status = models.CharField(max_length=30, choices=(('scheduled', 'مجدول'), ('in_progress', 'جاري المطابقة'), ('completed', 'مكتمل ومرحل')), default='scheduled')

    class Meta:
        db_table = 'nebras_asset_inventory_audits'
        verbose_name = "حملة جرد أصول"
        verbose_name_plural = "حملات جرد الأصول الثابتة"


# 28. AssetAttachment (مستندات ومرفقات الأصول)
class AssetAttachment(CombinedSharedModel):
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='attachments', verbose_name="الأصل")
    title = models.CharField(max_length=150, verbose_name="عنوان المرفق")
    file_path = models.CharField(max_length=255, verbose_name="رابط/مسار الملف")

    class Meta:
        db_table = 'nebras_asset_attachments'
        verbose_name = "مرفق أصول"
        verbose_name_plural = "مرفقات الأصول"


# 29. AssetStatistics (إحصائيات الأصول الثابتة لمدير النظام)
class AssetStatistics(CombinedSharedModel):
    as_of_date = models.DateField(db_index=True)
    total_assets_count = models.IntegerField(default=0, verbose_name="عدد الأصول")
    total_net_book_value = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="صافي القيمة الدفترية للأصول")
    total_depreciation_mtd = models.DecimalField(max_digits=15, decimal_places=2, default=0.00, verbose_name="إهلاك الشهر الجاري")

    class Meta:
        db_table = 'nebras_asset_statistics'
        verbose_name = "إحصائية الأصول"
        verbose_name_plural = "إحصائيات الأصول الثابتة العامة"


# 30. AssetSettings (إعدادات الأصول ومحددات الإهلاك الافتراضية)
class AssetSettings(CombinedSharedModel):
    default_depreciation_method = models.CharField(max_length=50, default='StraightLine', verbose_name="طريقة الإهلاك الافتراضية للمنشأة")
    auto_post_depreciation = models.BooleanField(default=True, verbose_name="ترحيل قيود الإهلاك تلقائياً بالمالية")

    class Meta:
        db_table = 'nebras_asset_settings'
        verbose_name = "إعدادات الأصول"
        verbose_name_plural = "إعدادات الأصول والمحددات"


# 31. AssetAudit (سجلات تدقيق العمليات الحساسة للأصل)
class AssetAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100, verbose_name="نوع العملية المنفذة")
    performed_by = models.UUIDField(null=True, blank=True, verbose_name="المستخدم المنفذ")
    performed_at = models.DateTimeField(default=timezone.now, verbose_name="وقت وتاريخ التنفيذ")
    details = models.JSONField(default=dict, verbose_name="تفاصيل التغيير")

    class Meta:
        db_table = 'nebras_asset_audits'
        verbose_name = "سجل تدقيق أصول"
        verbose_name_plural = "سجلات تدقيق عمليات الأصول الثابتة"
