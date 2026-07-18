from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. VendorCategory (فئات الموردين)
class VendorCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_vendor_categories'
        unique_together = ('tenant_id', 'code')
        verbose_name = "فئة الموردين"
        verbose_name_plural = "فئات الموردين"

    def __str__(self):
        return self.name_ar


# 2. Vendor (الموردين)
class Vendor(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'قيد التأهيل والاعتماد'),
        ('approved', 'نشط ومعتمد'),
        ('blacklisted', 'مدرج بالقائمة السوداء'),
        ('suspended', 'موقوف مؤقتاً'),
    )
    category = models.ForeignKey(VendorCategory, on_delete=models.PROTECT, related_name='vendors')
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    tax_number = models.CharField(max_length=50, blank=True, null=True)
    cr_number = models.CharField(max_length=50, blank=True, null=True, help_text="رقم السجل التجاري")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00)  # من 1.00 إلى 5.00

    class Meta:
        db_table = 'nebras_vendors'
        verbose_name = "المورد"
        verbose_name_plural = "الموردون"

    def __str__(self):
        return self.name_ar


# 3. VendorContact (جهات الاتصال للموردين)
class VendorContact(CombinedSharedModel):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=150)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    # البريد والهاتف اختياريان: كثير من الموردين يُعرفون بهاتف فقط، وفرض بريد
    # إجباري يدفع لاختلاق عناوين وهمية تُلوّث البيانات.
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = 'nebras_vendor_contacts'
        verbose_name = "جهة اتصال المورد"
        verbose_name_plural = "جهات اتصال الموردين"


# 4. VendorBankAccount (الحسابات البنكية للموردين)
class VendorBankAccount(CombinedSharedModel):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='bank_accounts')
    bank_name = models.CharField(max_length=150)
    account_number = models.CharField(max_length=100)
    iban = models.CharField(max_length=100)
    currency_code = models.CharField(max_length=10, default='SAR')

    class Meta:
        db_table = 'nebras_vendor_bank_accounts'
        verbose_name = "حساب بنكي للمورد"
        verbose_name_plural = "الحسابات البنكية للموردين"


# 5. VendorDocument (وثائق ومستندات الموردين)
class VendorDocument(CombinedSharedModel):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='documents')
    document_name = models.CharField(max_length=150)
    file_path = models.CharField(max_length=255)
    expiry_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_vendor_documents'
        verbose_name = "مستند المورد"
        verbose_name_plural = "مستندات الموردين"


# 6. VendorEvaluation (تقييم الموردين)
class VendorEvaluation(CombinedSharedModel):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='evaluations')
    evaluation_date = models.DateField(default=timezone.localdate)
    evaluator_id = models.UUIDField()
    score = models.DecimalField(max_digits=5, decimal_places=2)  # النسبة المئوية مثلاً
    notes = models.TextField()

    class Meta:
        db_table = 'nebras_vendor_evaluations'
        verbose_name = "تقييم المورد"
        verbose_name_plural = "تقييمات الموردين"


# 7. VendorBlacklist (القائمة السوداء للموردين)
class VendorBlacklist(CombinedSharedModel):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='blacklist_records')
    blacklist_date = models.DateField(default=timezone.localdate)
    reason = models.TextField()
    removed_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_vendor_blacklist'
        verbose_name = "القائمة السوداء"
        verbose_name_plural = "القائمة السوداء للموردين"


# 8. VendorPerformance (مؤشرات أداء الموردين)
class VendorPerformance(CombinedSharedModel):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='performance_metrics')
    delivery_on_time_rate = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    quality_rate = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    price_competitiveness = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)

    class Meta:
        db_table = 'nebras_vendor_performance'
        verbose_name = "أداء المورد"
        verbose_name_plural = "مؤشرات أداء الموردين"


# 9. PurchaseRequest (طلبات الشراء)
class PurchaseRequest(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('pending_approval', 'قيد المراجعة والاعتماد'),
        ('approved', 'معتمد ومقبول للشراء'),
        ('rejected', 'مرفوض'),
        ('rfq_created', 'تم توليد طلب عروض الأسعار'),
        ('completed', 'مكتمل ومصدر له أمر شراء'),
    )
    request_number = models.CharField(max_length=50, db_index=True)
    department_id = models.UUIDField(db_index=True, help_text="القسم الطالب للشراء")
    requested_by = models.UUIDField(db_index=True)
    date = models.DateField(default=timezone.localdate)
    priority = models.CharField(max_length=20, choices=(('low', 'منخفض'), ('medium', 'متوسط'), ('high', 'عاجل')), default='medium')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    total_estimated_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    reason = models.TextField()

    class Meta:
        db_table = 'nebras_purchase_requests'
        unique_together = ('tenant_id', 'request_number')
        verbose_name = "طلب شراء"
        verbose_name_plural = "طلبات الشراء"

    def __str__(self):
        return self.request_number


# 10. PurchaseRequestItem (بنود طلب الشراء)
class PurchaseRequestItem(CombinedSharedModel):
    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30)
    estimated_unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    budget_account_id = models.UUIDField(help_text="حساب الموازنة المخصص للشراء بالمالية")
    cost_center_id = models.UUIDField(help_text="مركز التكلفة المخصص")

    class Meta:
        db_table = 'nebras_purchase_request_items'
        verbose_name = "بند طلب شراء"
        verbose_name_plural = "بنود طلبات الشراء"


# 11. PurchaseRequestApproval (موافقات طلب الشراء)
class PurchaseRequestApproval(CombinedSharedModel):
    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='approvals')
    approver_id = models.UUIDField()
    approved_at = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=(('pending', 'معلق'), ('approved', 'معتمد'), ('rejected', 'مرفوض')), default='pending')
    comments = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_purchase_request_approvals'
        verbose_name = "اعتماد طلب شراء"
        verbose_name_plural = "اعتمادات طلبات الشراء"


# 12. PurchasePlan (خطط الشراء السنوية)
class PurchasePlan(CombinedSharedModel):
    name = models.CharField(max_length=150)
    fiscal_year_id = models.UUIDField()
    budget_allocated = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_purchase_plans'
        verbose_name = "خطة شراء"
        verbose_name_plural = "خطط الشراء السنوية"


# 13. PurchaseBudget (حجوزات موازنات المشتريات)
class PurchaseBudget(CombinedSharedModel):
    cost_center_id = models.UUIDField()
    account_id = models.UUIDField()
    reserved_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    consumed_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'nebras_purchase_budgets'
        verbose_name = "حجز موازنة"
        verbose_name_plural = "حجوزات موازنات المشتريات"


# 14. RFQ (طلب تقديم عروض الأسعار)
class RFQ(CombinedSharedModel):
    rfq_number = models.CharField(max_length=50, db_index=True)
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.PROTECT, related_name='rfqs')
    deadline = models.DateTimeField()
    status = models.CharField(max_length=30, choices=(('draft', 'مسودة'), ('published', 'منشور للموردين'), ('closed', 'مغلق وقيد التحليل'), ('awarded', 'تمت الترسية')), default='draft')
    notes = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_rfqs'
        verbose_name = "طلب عروض أسعار"
        verbose_name_plural = "طلبات عروض الأسعار (RFQ)"

    def __str__(self):
        return self.rfq_number


# 15. RFQItem (بنود طلب عروض الأسعار)
class RFQItem(CombinedSharedModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30)

    class Meta:
        db_table = 'nebras_rfq_items'
        verbose_name = "بند طلب أسعار"
        verbose_name_plural = "بنود طلبات عروض الأسعار"


# 16. Quotation (عروض أسعار الموردين)
class Quotation(CombinedSharedModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='quotations')
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    quotation_reference = models.CharField(max_length=50)
    submitted_date = models.DateField(default=timezone.localdate)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    lead_time_days = models.IntegerField(default=7)
    status = models.CharField(max_length=20, choices=(('submitted', 'مقدم'), ('evaluated', 'مقيّم'), ('awarded', 'مقبول وتمت الترسية'), ('rejected', 'مرفوض')), default='submitted')

    class Meta:
        db_table = 'nebras_quotations'
        verbose_name = "عرض أسعار"
        verbose_name_plural = "عروض أسعار الموردين"


# 17. QuotationItem (بنود عروض الأسعار)
class QuotationItem(CombinedSharedModel):
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='items')
    rfq_item = models.ForeignKey(RFQItem, on_delete=models.PROTECT)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_quotation_items'
        verbose_name = "بند عرض أسعار"
        verbose_name_plural = "بنود عروض الأسعار"


# 18. QuotationComparison (مقارنة وتحليل عروض الأسعار)
class QuotationComparison(CombinedSharedModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE)
    comparison_matrix = models.JSONField(default=dict)
    recommendation = models.TextField()

    class Meta:
        db_table = 'nebras_quotation_comparisons'
        verbose_name = "مقارنة عروض الأسعار"
        verbose_name_plural = "مقارنات وتحليلات عروض الأسعار"


# 19. VendorAward (ترسية المشتريات)
class VendorAward(CombinedSharedModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.PROTECT)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    quotation = models.ForeignKey(Quotation, on_delete=models.PROTECT)
    award_date = models.DateField(default=timezone.localdate)
    awarded_amount = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_vendor_awards'
        verbose_name = "ترسية المشتريات"
        verbose_name_plural = "ترسية المشتريات"


# 20. PurchaseOrder (أوامر الشراء)
class PurchaseOrder(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('approved', 'معتمد ومصدر للمورد'),
        ('issued', 'مرسل ومؤكد'),
        ('completed', 'مكتمل ومستلم بالكامل'),
        ('cancelled', 'ملغى'),
    )
    po_number = models.CharField(max_length=50, db_index=True)
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.PROTECT, related_name='purchase_orders')
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='draft')
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_terms = models.TextField(blank=True, null=True)

    # فاتورة المورّد والترحيل المحاسبي (آخر حلقة نحو المالية)
    vendor_invoice_number = models.CharField(max_length=50, blank=True, null=True,
                                             help_text="رقم فاتورة المورّد المستلمة")
    vendor_invoice_date = models.DateField(null=True, blank=True)
    journal_entry_id = models.UUIDField(null=True, blank=True,
                                        help_text="قيد اليومية المرحّل لفاتورة المورّد بالمالية")

    class Meta:
        db_table = 'nebras_purchase_orders'
        unique_together = ('tenant_id', 'po_number')
        verbose_name = "أمر شراء"
        verbose_name_plural = "أوامر الشراء (PO)"

    def __str__(self):
        return self.po_number


# 21. PurchaseOrderItem (بنود أمر الشراء)
class PurchaseOrderItem(CombinedSharedModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=30)
    unit_price = models.DecimalField(max_digits=15, decimal_places=2)
    total_price = models.DecimalField(max_digits=15, decimal_places=2)
    budget_account_id = models.UUIDField()
    cost_center_id = models.UUIDField()

    class Meta:
        db_table = 'nebras_purchase_order_items'
        verbose_name = "بند أمر شراء"
        verbose_name_plural = "بنود أوامر الشراء"


# 22. PurchaseOrderRevision (مراجعات وتعديلات أوامر الشراء)
class PurchaseOrderRevision(CombinedSharedModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='revisions')
    revision_number = models.IntegerField(default=1)
    revised_date = models.DateField(default=timezone.localdate)
    change_summary = models.TextField()

    class Meta:
        db_table = 'nebras_purchase_order_revisions'
        verbose_name = "مراجعة أمر شراء"
        verbose_name_plural = "تعديلات ومراجعات أوامر الشراء"


# 23. PurchaseContract (عقود المشتريات)
class PurchaseContract(CombinedSharedModel):
    contract_number = models.CharField(max_length=50, db_index=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT)
    title = models.CharField(max_length=200)
    start_date = models.DateField()
    end_date = models.DateField()
    contract_value = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=(('active', 'نشط'), ('expired', 'منتهي'), ('terminated', 'ملغى')), default='active')

    class Meta:
        db_table = 'nebras_purchase_contracts'
        unique_together = ('tenant_id', 'contract_number')
        verbose_name = "عقد مشتريات"
        verbose_name_plural = "عقود المشتريات والاتفاقيات"

    def __str__(self):
        return self.contract_number


# 24. ContractItem (بنود العقد)
class ContractItem(CombinedSharedModel):
    contract = models.ForeignKey(PurchaseContract, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=200)
    fixed_unit_price = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_contract_items'
        verbose_name = "بند عقد"
        verbose_name_plural = "بنود عقود المشتريات"


# 25. ContractRenewal (تجديدات العقود)
class ContractRenewal(CombinedSharedModel):
    contract = models.ForeignKey(PurchaseContract, on_delete=models.CASCADE, related_name='renewals')
    renewal_date = models.DateField(default=timezone.localdate)
    new_end_date = models.DateField()
    adjusted_value = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_contract_renewals'
        verbose_name = "تجديد عقد"
        verbose_name_plural = "تجديدات العقود"


# 26. PurchaseSettings (إعدادات الشراء)
class PurchaseSettings(CombinedSharedModel):
    max_request_limit_without_rfq = models.DecimalField(max_digits=15, decimal_places=2, default=5000.00)
    enable_budget_validation = models.BooleanField(default=True)
    payable_gl_account_id = models.UUIDField(
        null=True, blank=True,
        help_text="حساب ذمم الموردين الدائنة في شجرة حسابات المالية — يُرحَّل عليه قيد فاتورة المورّد"
    )

    class Meta:
        db_table = 'nebras_purchase_settings'
        verbose_name = "إعدادات المشتريات"
        verbose_name_plural = "إعدادات المشتريات"


# 27. ProcurementStatistics (إحصائيات المشتريات)
class ProcurementStatistics(CombinedSharedModel):
    total_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    savings_achieved = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'nebras_procurement_statistics'
        verbose_name = "إحصائيات المشتريات"
        verbose_name_plural = "إحصائيات المشتريات"


# 28. ProcurementAudit (سجل تدقيق المشتريات)
class ProcurementAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100)
    performed_by = models.UUIDField(null=True, blank=True)
    performed_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_procurement_audits'
        verbose_name = "سجل تدقيق المشتريات"
        verbose_name_plural = "سجلات تدقيق المشتريات"
