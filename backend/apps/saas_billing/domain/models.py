"""نماذج فوترة المنصة (SaaS): خطط الاشتراك، اشتراكات المستأجرين، الفواتير والمدفوعات.

هذه الوحدة على مستوى المنصّة (مشغّل نبراس) لا مستوى المستأجر: فهي تدير اشتراك كل
مدرسة/مستأجر في النظام نفسه. لذلك لا نستخدم مدير المستأجر التلقائي (الذي يعزل
البيانات لكل مستأجر)، بل نحتفظ بمعرّف المستأجر كحقل موضوعٍ للفاتورة، ويطّلع
مشرف المنصّة على كل المستأجرين.
"""
from decimal import Decimal
import uuid
from django.db import models
from django.utils import timezone


class BillingCycle(models.TextChoices):
    MONTHLY = 'monthly', 'شهري'
    QUARTERLY = 'quarterly', 'ربع سنوي'
    ANNUAL = 'annual', 'سنوي'


class SubscriptionStatus(models.TextChoices):
    TRIAL = 'trial', 'تجريبي'
    ACTIVE = 'active', 'نشط'
    PAST_DUE = 'past_due', 'متأخر السداد'
    SUSPENDED = 'suspended', 'موقوف'
    CANCELED = 'canceled', 'ملغى'
    EXPIRED = 'expired', 'منتهٍ'


class InvoiceStatus(models.TextChoices):
    DRAFT = 'draft', 'مسودة'
    OPEN = 'open', 'مستحقة'
    PAID = 'paid', 'مدفوعة'
    OVERDUE = 'overdue', 'متأخرة'
    VOID = 'void', 'ملغاة'


class PaymentMethod(models.TextChoices):
    BANK_TRANSFER = 'bank_transfer', 'تحويل بنكي'
    CASH = 'cash', 'نقدي'
    CARD = 'card', 'بطاقة'
    MANUAL = 'manual', 'تسوية يدوية'


class SubscriptionPlan(models.Model):
    """خطة اشتراك عامّة على مستوى المنصّة (غير مخصّصة لمستأجر)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name_ar = models.CharField(max_length=150)
    name_en = models.CharField(max_length=150, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    billing_cycle = models.CharField(max_length=20, choices=BillingCycle.choices, default=BillingCycle.ANNUAL)
    price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=8, default='SDG')

    # حدود الاستخدام (0 أو فارغ = بلا حدّ)
    max_students = models.PositiveIntegerField(default=0)
    max_staff = models.PositiveIntegerField(default=0)
    max_branches = models.PositiveIntegerField(default=0)
    modules = models.JSONField(default=list, blank=True)  # رموز الوحدات المتاحة

    is_active = models.BooleanField(default=True, db_index=True)
    is_public = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saas_subscription_plans'
        ordering = ['sort_order', 'price']
        verbose_name = 'خطة اشتراك'
        verbose_name_plural = 'خطط الاشتراك'

    def __str__(self):
        return self.name_ar


class TenantSubscription(models.Model):
    """اشتراك مستأجر واحد في خطة."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscriptions')

    status = models.CharField(max_length=20, choices=SubscriptionStatus.choices,
                              default=SubscriptionStatus.TRIAL, db_index=True)
    started_at = models.DateField(default=timezone.now)
    current_period_start = models.DateField(null=True, blank=True)
    current_period_end = models.DateField(null=True, blank=True, db_index=True)
    trial_ends_at = models.DateField(null=True, blank=True)

    cancel_at_period_end = models.BooleanField(default=False)
    canceled_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saas_tenant_subscriptions'
        ordering = ['-created_at']
        verbose_name = 'اشتراك مستأجر'
        verbose_name_plural = 'اشتراكات المستأجرين'

    def __str__(self):
        return f'{self.tenant_id} → {self.plan_id} ({self.status})'


class Invoice(models.Model):
    """فاتورة اشتراك مستأجر."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='saas_invoices')
    subscription = models.ForeignKey(TenantSubscription, on_delete=models.SET_NULL,
                                     null=True, blank=True, related_name='invoices')

    number = models.CharField(max_length=40, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices,
                              default=InvoiceStatus.DRAFT, db_index=True)

    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField(null=True, blank=True, db_index=True)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    currency = models.CharField(max_length=8, default='SDG')
    subtotal = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    discount_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    amount_paid = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saas_invoices'
        ordering = ['-issue_date', '-created_at']
        verbose_name = 'فاتورة اشتراك'
        verbose_name_plural = 'فواتير الاشتراك'

    def __str__(self):
        return self.number

    @property
    def balance_due(self) -> Decimal:
        return (self.total or Decimal('0')) - (self.amount_paid or Decimal('0'))


class InvoiceLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    unit_price = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        db_table = 'saas_invoice_line_items'
        ordering = ['id']

    def __str__(self):
        return self.description


class TenantSignupRequest(models.Model):
    """طلب انضمام مدرسة عبر الموقع العام — يبقى معلّقاً حتى يعتمده مالك المنصّة.

    لا يُنشأ المستأجر ولا النطاق الفرعي إلا عند الاعتماد، منعاً للإساءة وحجز النطاقات.
    """
    STATUS_CHOICES = (
        ('pending', 'معلّق قيد المراجعة'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school_name = models.CharField(max_length=255)
    subdomain = models.CharField(max_length=100, db_index=True, help_text='النطاق الفرعي المطلوب')
    contact_name = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    city = models.CharField(max_length=120, blank=True, null=True)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name='signup_requests')
    note = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    reviewed_by = models.UUIDField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    created_tenant = models.ForeignKey('tenants.Tenant', on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='signup_request', help_text='المستأجر المُنشأ عند الاعتماد')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saas_tenant_signup_requests'
        ordering = ['-created_at']
        verbose_name = 'طلب انضمام مدرسة'
        verbose_name_plural = 'طلبات انضمام المدارس'

    def __str__(self):
        return f'{self.school_name} ({self.subdomain}) — {self.status}'


class PaymentSubmission(models.Model):
    """طلب سداد ذاتي يقدّمه المستأجر لفاتورة اشتراكه عبر تحويل بنكي.

    يرفق المستأجر إيصال التحويل ويبقى الطلب «معلّقاً» حتى يراجعه مشغّل المنصّة
    فيعتمده (يولّد دفعة مرحّلة ويحدّث حالة الفاتورة) أو يرفضه بسبب.
    """
    STATUS_CHOICES = (
        ('pending', 'معلّق قيد المراجعة'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='saas_payment_submissions')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='submissions')

    amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.BANK_TRANSFER)
    bank_name = models.CharField(max_length=120, blank=True, null=True)
    transfer_reference = models.CharField(max_length=120, blank=True, null=True)
    transfer_date = models.DateField(null=True, blank=True)
    sender_name = models.CharField(max_length=150, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    receipt_attachment = models.FileField(upload_to='saas_billing/payment_submissions/%Y/%m/', null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    submitted_by = models.UUIDField(null=True, blank=True)
    reviewed_by = models.UUIDField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    payment = models.ForeignKey('Payment', on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='submission', help_text='الدفعة المُنشأة عند الاعتماد')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'saas_payment_submissions'
        ordering = ['-created_at']
        verbose_name = 'طلب سداد اشتراك'
        verbose_name_plural = 'طلبات سداد الاشتراك'

    def __str__(self):
        return f'{self.transfer_reference or self.id} — {self.amount} ({self.status})'


class Payment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='saas_payments')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')

    amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.BANK_TRANSFER)
    reference = models.CharField(max_length=120, blank=True, null=True)
    paid_at = models.DateTimeField(default=timezone.now)
    recorded_by = models.UUIDField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saas_payments'
        ordering = ['-paid_at']
        verbose_name = 'دفعة اشتراك'
        verbose_name_plural = 'مدفوعات الاشتراك'

    def __str__(self):
        return f'{self.amount} — {self.invoice_id}'
