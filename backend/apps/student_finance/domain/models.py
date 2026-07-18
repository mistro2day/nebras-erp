from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. FeeCategory (فئة الرسوم)
class FeeCategory(CombinedSharedModel):
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)  # admission, registration, tuition, hostel, transport, etc.
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_fee_categories'
        unique_together = ('tenant_id', 'code')
        verbose_name = "فئة الرسوم"
        verbose_name_plural = "فئات الرسوم"

    def __str__(self):
        return self.name_ar


# 2. FeeType (نوع الرسوم)
class FeeType(CombinedSharedModel):
    fee_category = models.ForeignKey(FeeCategory, on_delete=models.PROTECT, related_name='types')
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150)
    code = models.CharField(max_length=50, db_index=True)
    default_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)

    class Meta:
        db_table = 'nebras_fee_types'
        unique_together = ('tenant_id', 'code')
        verbose_name = "نوع الرسوم"
        verbose_name_plural = "أنواع الرسوم"

    def __str__(self):
        return self.name_ar


# 3. FeeStructure (هيكل الرسوم)
class FeeStructure(CombinedSharedModel):
    name = models.CharField(max_length=150)
    academic_year = models.CharField(max_length=50, db_index=True)
    term = models.CharField(max_length=50, blank=True, null=True)
    grade_id = models.UUIDField(blank=True, null=True, db_index=True)
    program_id = models.UUIDField(blank=True, null=True, db_index=True)
    nationality_group = models.CharField(max_length=50, blank=True, null=True)  # saudi, non-saudi, gcc
    fee_type = models.ForeignKey(FeeType, on_delete=models.PROTECT, related_name='structures')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_fee_structures'
        verbose_name = "هيكل الرسوم"
        verbose_name_plural = "هياكل الرسوم"

    def __str__(self):
        return f"{self.name} ({self.amount})"


# 4. FeeSchedule (جدول استحقاق الرسوم)
class FeeSchedule(CombinedSharedModel):
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name='schedules')
    due_date = models.DateField()
    installment_plan_allowed = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_fee_schedules'
        verbose_name = "جدول استحقاق الرسوم"
        verbose_name_plural = "جداول استحقاق الرسوم"


# 5. AcademicFeePlan (خطة الرسوم الأكاديمية للطالب)
class AcademicFeePlan(CombinedSharedModel):
    student_id = models.UUIDField(db_index=True)
    fee_structures = models.ManyToManyField(FeeStructure, related_name='fee_plans')
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_academic_fee_plans'
        verbose_name = "خطة الرسوم الأكاديمية"
        verbose_name_plural = "خطط الرسوم الأكاديمية"


# 6. StudentBillingAccount (حساب فوترة الطالب)
class StudentBillingAccount(CombinedSharedModel):
    student_id = models.UUIDField(unique=True, db_index=True)
    account_number = models.CharField(max_length=50, unique=True, db_index=True)
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    current_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    outstanding_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    credit_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    is_blocked = models.BooleanField(default=False)
    financial_hold = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_student_billing_accounts'
        verbose_name = "حساب فوترة الطالب"
        verbose_name_plural = "حسابات فوترة الطلاب"

    def __str__(self):
        return f"Acc: {self.account_number} - Stud: {self.student_id}"


# 7. StudentInvoice (فاتورة الطالب)
class StudentInvoice(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('posted', 'مرحلة ومسجلة'),
        ('cancelled', 'ملغاة'),
    )
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='invoices')
    invoice_number = models.CharField(max_length=50, db_index=True)
    issue_date = models.DateField(db_index=True)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    outstanding_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد الاستحقاق المرتبط في موديول المالية")

    class Meta:
        db_table = 'nebras_student_invoices'
        unique_together = ('tenant_id', 'invoice_number')
        ordering = ['-issue_date', '-invoice_number']
        verbose_name = "فاتورة الطالب"
        verbose_name_plural = "فواتير الطلاب"

    def __str__(self):
        return self.invoice_number


# 8. InvoiceItem (بنود الفاتورة)
class InvoiceItem(CombinedSharedModel):
    invoice = models.ForeignKey(StudentInvoice, on_delete=models.CASCADE, related_name='items')
    fee_type = models.ForeignKey(FeeType, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_student_invoice_items'
        verbose_name = "بند الفاتورة"
        verbose_name_plural = "بنود الفواتير"


# 9. InvoiceAdjustment (تسويات الفواتير)
class InvoiceAdjustment(CombinedSharedModel):
    TYPE_CHOICES = (
        ('credit', 'تخفيض الرصيد المستحق (Credit)'),
        ('debit', 'زيادة الرصيد المستحق (Debit)'),
    )
    invoice = models.ForeignKey(StudentInvoice, on_delete=models.CASCADE, related_name='adjustments')
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    reason = models.TextField()
    approved_by = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_student_invoice_adjustments'
        verbose_name = "تسوية الفاتورة"
        verbose_name_plural = "تسويات الفواتير"


# 10. InvoiceDiscount (خصومات الفواتير)
class InvoiceDiscount(CombinedSharedModel):
    invoice = models.ForeignKey(StudentInvoice, on_delete=models.CASCADE, related_name='discounts')
    discount_type = models.CharField(max_length=20, choices=(('percentage', 'نسبة مئوية'), ('fixed', 'مبلغ ثابت')))
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    discount_reason = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_student_invoice_discounts'
        verbose_name = "خصم الفاتورة"
        verbose_name_plural = "خصومات الفواتير"


# 11. Scholarship (المنح الدراسية للطلاب)
class Scholarship(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'معلقة الموافقة'),
        ('approved', 'نشطة ومعتمدة'),
        ('expired', 'منتهية'),
    )
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='scholarships')
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=50, choices=(('partial', 'جزئية'), ('full', 'كاملة 100%'), ('merit', 'تفوق أكاديمي'), ('need', 'حاجة اجتماعية')))
    amount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    fixed_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_student_scholarships'
        verbose_name = "منحة دراسية"
        verbose_name_plural = "المنح الدراسية"


# 12. ScholarshipRule (قواعد المنح الدراسية)
class ScholarshipRule(CombinedSharedModel):
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, unique=True)
    rule_config = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_student_scholarship_rules'
        verbose_name = "قاعدة المنح"
        verbose_name_plural = "قواعد المنح الدراسية"


# 13. FinancialAid (المساعدات المالية)
class FinancialAid(CombinedSharedModel):
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='financial_aids')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    approved_by = models.UUIDField()
    description = models.TextField()

    class Meta:
        db_table = 'nebras_student_financial_aids'
        verbose_name = "مساعدة مالية"
        verbose_name_plural = "المساعدات المالية"


# 14. InstallmentPlan (خطط وتقسيط الرسوم)
class InstallmentPlan(CombinedSharedModel):
    name = models.CharField(max_length=150)
    number_of_installments = models.IntegerField()
    grace_period_days = models.IntegerField(default=5)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'nebras_installment_plans'
        verbose_name = "خطة تقسيط"
        verbose_name_plural = "خطط التقسيط"


# 15. Installment (الأقساط المجدولة)
class Installment(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'معلق السداد'),
        ('paid', 'مدفوع'),
        ('overdue', 'متأخر'),
    )
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='installments')
    invoice = models.ForeignKey(StudentInvoice, on_delete=models.CASCADE, related_name='installments')
    installment_plan = models.ForeignKey(InstallmentPlan, on_delete=models.PROTECT)
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        db_table = 'nebras_installments'
        verbose_name = "قسط مجدول"
        verbose_name_plural = "الأقساط المجدولة"


# 16. StudentReceivable (حسابات القبض والمستحقات للطلاب)
class StudentReceivable(CombinedSharedModel):
    STATUS_CHOICES = (
        ('outstanding', 'مستحق وغير مدفوع'),
        ('paid', 'مدفوع بالكامل'),
        ('written_off', 'معدم ومشطوب'),
    )
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='receivables')
    invoice = models.ForeignKey(StudentInvoice, on_delete=models.CASCADE, related_name='receivables')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    outstanding_amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='outstanding', db_index=True)

    class Meta:
        db_table = 'nebras_student_receivables'
        verbose_name = "مستحق طالب"
        verbose_name_plural = "حسابات القبض والمستحقات"


# 17. PaymentAllocation (تخصيص السداد للفواتير والمستحقات)
class PaymentAllocation(CombinedSharedModel):
    receivable = models.ForeignKey(StudentReceivable, on_delete=models.CASCADE, related_name='allocations')
    receipt = models.ForeignKey('Receipt', on_delete=models.CASCADE, related_name='allocations')
    amount_allocated = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_student_payment_allocations'
        verbose_name = "تخصيص سداد"
        verbose_name_plural = "تخصيصات السداد"


# 18. Receipt (إيصالات القبض / تحصيلات الطلاب)
class Receipt(CombinedSharedModel):
    STATUS_CHOICES = (
        ('draft', 'مسودة'),
        ('posted', 'مرحل ومقفل في الصندوق'),
        ('cancelled', 'ملغي'),
    )
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='receipts')
    receipt_number = models.CharField(max_length=50, db_index=True)
    payment_date = models.DateField(db_index=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    payment_method_id = models.UUIDField(db_index=True, help_text="رابط مع طرق الدفع في موديول المالية")
    
    bank_account_id = models.UUIDField(null=True, blank=True, help_text="البنك المستلم إن وجد")
    cash_box_id = models.UUIDField(null=True, blank=True, help_text="الخزنة المستلمة إن وجد")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    voucher_id = models.UUIDField(null=True, blank=True, help_text="سند القبض المولد في موديول المالية")

    class Meta:
        db_table = 'nebras_student_receipts'
        unique_together = ('tenant_id', 'receipt_number')
        verbose_name = "إيصال سداد"
        verbose_name_plural = "إيصالات تحصيل الطلاب"

    def __str__(self):
        return self.receipt_number


# 19. Refund (المبالغ المستردة)
class Refund(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'قيد المراجعة'),
        ('approved', 'معتمد للصرف'),
        ('completed', 'تم الصرف للعميل'),
        ('rejected', 'مرفوض'),
    )
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='refunds')
    refund_number = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    refund_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    voucher_id = models.UUIDField(null=True, blank=True, help_text="سند الصرف المسترد المولد بالمالية")

    class Meta:
        db_table = 'nebras_student_refunds'
        verbose_name = "مبلغ مسترد"
        verbose_name_plural = "المبالغ المستردة للطلاب"


# 20. CreditNote (الإشعار الدائن)
class CreditNote(CombinedSharedModel):
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='credit_notes')
    invoice = models.ForeignKey(StudentInvoice, on_delete=models.SET_NULL, null=True, blank=True)
    note_number = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    issue_date = models.DateField()
    journal_entry_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_student_credit_notes'
        verbose_name = "إشعار دائن"
        verbose_name_plural = "الإشعارات الدائنة للطلاب"


# 21. DebitNote (الإشعار المدين)
class DebitNote(CombinedSharedModel):
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='debit_notes')
    invoice = models.ForeignKey(StudentInvoice, on_delete=models.SET_NULL, null=True, blank=True)
    note_number = models.CharField(max_length=50)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    issue_date = models.DateField()
    journal_entry_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = 'nebras_student_debit_notes'
        verbose_name = "إشعار مدين"
        verbose_name_plural = "الإشعارات المدينة للطلاب"


# 22. LateFeeRule (قواعد غرامات التأخير)
class LateFeeRule(CombinedSharedModel):
    name = models.CharField(max_length=150)
    grace_period_days = models.IntegerField(default=15)
    charge_type = models.CharField(max_length=20, choices=(('fixed', 'مبلغ ثابت'), ('percentage', 'نسبة مئوية من المستحق')))
    charge_amount = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_student_late_fee_rules'
        verbose_name = "قاعدة غرامة تأخير"
        verbose_name_plural = "قواعد غرامات التأخير"


# 23. CollectionPolicy (سياسة التحصيل والمتابعة)
class CollectionPolicy(CombinedSharedModel):
    name = models.CharField(max_length=150)
    days_overdue = models.IntegerField()
    action_required = models.CharField(max_length=50, choices=(('email', 'بريد تذكيري'), ('sms', 'رسالة نصية'), ('hold', 'فرض حظر مالي')))

    class Meta:
        db_table = 'nebras_student_collection_policies'
        verbose_name = "سياسة تحصيل"
        verbose_name_plural = "سياسات التحصيل ومتابعة الديون"


# 24. FinancialHold (الحظر المالي)
class FinancialHold(CombinedSharedModel):
    STATUS_CHOICES = (
        ('active', 'نشط (مفروض حالياً)'),
        ('released', 'ملغي ومرفوع'),
    )
    HOLD_CHOICES = (
        ('exam', 'حجب الامتحانات ورصد الدرجات'),
        ('registration', 'منع التسجيل للفصل الجديد'),
        ('certificate', 'منع سحب الشهادات والوثائق'),
        ('graduation', 'حظر حفل التخرج والإنهاء'),
        ('library', 'حظر الإعارة من المكتبة'),
        ('custom', 'حظر مخصص'),
    )
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.PROTECT, related_name='holds')
    hold_type = models.CharField(max_length=30, choices=HOLD_CHOICES)
    reason = models.TextField()
    applied_at = models.DateTimeField(default=timezone.now)
    released_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    class Meta:
        db_table = 'nebras_student_financial_holds'
        verbose_name = "حظر مالي"
        verbose_name_plural = "سجلات الحظر المالي"


# 25. BillingCycle (دورات الفوترة)
class BillingCycle(CombinedSharedModel):
    name = models.CharField(max_length=150)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=(('open', 'مفتوحة'), ('closed', 'مغلقة ومؤرشفة')), default='open')

    class Meta:
        db_table = 'nebras_student_billing_cycles'
        verbose_name = "دورة فوترة"
        verbose_name_plural = "دورات الفوترة"


# 26. Statement (كشوفات الحساب التاريخية)
class Statement(CombinedSharedModel):
    student_billing_account = models.ForeignKey(StudentBillingAccount, on_delete=models.CASCADE, related_name='statements')
    statement_date = models.DateField(default=timezone.localdate)
    start_date = models.DateField()
    end_date = models.DateField()
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2)
    closing_balance = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'nebras_student_statements'
        verbose_name = "كشف حساب"
        verbose_name_plural = "كشوفات الحساب التاريخية"


# 27. BillingAudit (سجل تدقيق عمليات فوترة الطلاب)
class BillingAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100)  # generate_invoice, apply_scholarship, add_hold
    performed_by = models.UUIDField(null=True, blank=True)
    performed_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField(default=dict)

    class Meta:
        db_table = 'nebras_student_billing_audits'
        verbose_name = "سجل تدقيق الفوترة"
        verbose_name_plural = "سجلات تدقيق الفوترة"


# 28. StudentFinanceSettings (الإعدادات المالية للطلاب)
class StudentFinanceSettings(CombinedSharedModel):
    receivables_gl_account_id = models.UUIDField(help_text="حساب المدينين للطلاب المرتبط في شجرة الحسابات")
    revenue_gl_account_id = models.UUIDField(help_text="حساب إيرادات الرسوم الدراسية في شجرة الحسابات")
    auto_apply_late_fees = models.BooleanField(default=False)
    max_credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=1000.0)

    class Meta:
        db_table = 'nebras_student_finance_settings'
        verbose_name = "إعدادات مالية الطلاب"
        verbose_name_plural = "إعدادات مالية الطلاب"


# 29. OnlinePaymentRequest (طلب سداد أونلاين من ولي الأمر عبر تحويل بنكي)
class OnlinePaymentRequest(CombinedSharedModel):
    """
    طلب سداد يقدّمه ولي الأمر عبر التحويل البنكي (بنك الخرطوم / تطبيق بنكك).

    يرفق ولي الأمر إيصال التحويل ويبقى الطلب «معلّقاً» حتى يراجعه المحاسب
    فيعتمده (يولّد إيصال قبض مرحّل ويخصم من مستحقات الطالب) أو يرفضه بسبب.
    """
    STATUS_CHOICES = (
        ('pending', 'معلّق قيد المراجعة'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
    )
    student_billing_account = models.ForeignKey(
        StudentBillingAccount, on_delete=models.PROTECT, related_name='online_payment_requests'
    )
    student_id = models.UUIDField(db_index=True)
    submitted_by_user_id = models.UUIDField(null=True, blank=True, help_text="مستخدم ولي الأمر مقدّم الطلب")

    amount = models.DecimalField(max_digits=15, decimal_places=2)
    bank_name = models.CharField(max_length=100, default='بنك الخرطوم')
    transfer_reference = models.CharField(max_length=50, help_text="الرقم المرجعي للتحويل (عبر بنكك)")
    transfer_date = models.DateField()
    sender_name = models.CharField(max_length=150, blank=True, null=True, help_text="اسم صاحب الحساب المُحوِّل")
    note = models.TextField(blank=True, null=True)
    receipt_attachment = models.FileField(upload_to='student_finance/online_payments/%Y/%m/')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    reviewed_by = models.UUIDField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    receipt_id = models.UUIDField(null=True, blank=True, help_text="إيصال القبض المُنشأ عند الاعتماد")
    posted_to_gl = models.BooleanField(default=False, help_text="هل رُحّل القيد المحاسبي في دفتر الأستاذ")

    class Meta:
        db_table = 'nebras_online_payment_requests'
        ordering = ['-created_at']
        verbose_name = "طلب سداد أونلاين"
        verbose_name_plural = "طلبات السداد الأونلاين"

    def __str__(self):
        return f"{self.transfer_reference} - {self.amount} ({self.status})"
