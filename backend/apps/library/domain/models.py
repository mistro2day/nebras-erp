from django.db import models
from django.utils import timezone
from apps.shared.domain.models import CombinedSharedModel

# 1. LibraryBranch (فروع المكتبة)
class LibraryBranch(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم الفرع بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم الفرع بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز الفرع")

    class Meta:
        db_table = 'nebras_library_branches'
        unique_together = ('tenant_id', 'code')
        verbose_name = "فرع المكتبة"
        verbose_name_plural = "فروع المكتبات"

    def __str__(self):
        return self.name_ar


# 2. LibrarySection (أقسام المكتبة)
class LibrarySection(CombinedSharedModel):
    branch = models.ForeignKey(LibraryBranch, on_delete=models.CASCADE, related_name='sections', verbose_name="فرع المكتبة")
    name_ar = models.CharField(max_length=150, verbose_name="اسم القسم بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم القسم بالإنجليزي")
    code = models.CharField(max_length=50, verbose_name="رمز القسم")

    class Meta:
        db_table = 'nebras_library_sections'
        unique_together = ('tenant_id', 'branch', 'code')
        verbose_name = "قسم المكتبة"
        verbose_name_plural = "أقسام المكتبات"

    def __str__(self):
        return self.name_ar


# 3. Shelf (الرفوف وأماكن الحفظ)
class Shelf(CombinedSharedModel):
    section = models.ForeignKey(LibrarySection, on_delete=models.CASCADE, related_name='shelves', verbose_name="قسم المكتبة")
    code = models.CharField(max_length=50, verbose_name="رمز الرف (كود موقع التخزين)")

    class Meta:
        db_table = 'nebras_library_shelves'
        unique_together = ('tenant_id', 'section', 'code')
        verbose_name = "رف الكتب"
        verbose_name_plural = "رفوف حفظ الكتب"

    def __str__(self):
        return self.code


# 4. BookAuthor (مؤلفي الكتب)
class BookAuthor(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم المؤلف بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم المؤلف بالإنجليزي")

    class Meta:
        db_table = 'nebras_library_authors'
        verbose_name = "مؤلف كتاب"
        verbose_name_plural = "مؤلفي الكتب"

    def __str__(self):
        return self.name_ar


# 5. Publisher (دور النشر)
class Publisher(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم دار النشر بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم دار النشر بالإنجليزي")

    class Meta:
        db_table = 'nebras_library_publishers'
        verbose_name = "دار نشر"
        verbose_name_plural = "دور النشر والطباعة"

    def __str__(self):
        return self.name_ar


# 6. Category (تصنيفات ديوي العشرية/المواضيع)
class Category(CombinedSharedModel):
    name_ar = models.CharField(max_length=150, verbose_name="اسم التصنيف بالعربي")
    name_en = models.CharField(max_length=150, verbose_name="اسم التصنيف بالإنجليزي")
    code = models.CharField(max_length=50, db_index=True, verbose_name="رمز التصنيف")

    class Meta:
        db_table = 'nebras_library_categories'
        unique_together = ('tenant_id', 'code')
        verbose_name = "تصنيف كتب"
        verbose_name_plural = "تصنيفات الكتب والمواضيع"

    def __str__(self):
        return self.name_ar


# 7. Language (اللغات المتوفرة للكتب)
class Language(CombinedSharedModel):
    name_ar = models.CharField(max_length=100, verbose_name="اللغة بالعربي")
    name_en = models.CharField(max_length=100, verbose_name="اللغة بالإنجليزي")
    code = models.CharField(max_length=10, db_index=True, verbose_name="رمز اللغة (AR, EN)")

    class Meta:
        db_table = 'nebras_library_languages'
        unique_together = ('tenant_id', 'code')
        verbose_name = "لغة الكتاب"
        verbose_name_plural = "لغات الكتب والمواد"

    def __str__(self):
        return self.name_ar


# 8. Book (الكتب والمؤلفات)
class Book(CombinedSharedModel):
    title_ar = models.CharField(max_length=255, verbose_name="عنوان الكتاب بالعربي")
    title_en = models.CharField(max_length=255, verbose_name="عنوان الكتاب بالإنجليزي")
    
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='books', verbose_name="تصنيف الكتاب")
    language = models.ForeignKey(Language, on_delete=models.PROTECT, verbose_name="لغة الكتاب")
    publisher = models.ForeignKey(Publisher, on_delete=models.PROTECT, related_name='books', verbose_name="دار النشر")
    authors = models.ManyToManyField(BookAuthor, related_name='books', verbose_name="المؤلفين")
    
    summary = models.TextField(blank=True, null=True, verbose_name="ملخص الكتاب")
    cover_image = models.CharField(max_length=255, blank=True, null=True, verbose_name="رابط صورة الغلاف")

    class Meta:
        db_table = 'nebras_library_books'
        verbose_name = "كتاب"
        verbose_name_plural = "المصنفات والكتب"

    def __str__(self):
        return self.title_ar


# 9. BookEdition (طبعات وتدقيقات الكتب)
class BookEdition(CombinedSharedModel):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='editions', verbose_name="الكتاب")
    edition_number = models.CharField(max_length=50, verbose_name="رقم الطبعة/الإصدار")
    publication_year = models.IntegerField(verbose_name="سنة النشر")

    class Meta:
        db_table = 'nebras_library_book_editions'
        verbose_name = "طبعة كتاب"
        verbose_name_plural = "طبعات وإصدارات الكتب"


# 10. ISBN (الرقم التسلسلي الدولي الموحد)
class ISBN(CombinedSharedModel):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='isbns', verbose_name="الكتاب")
    isbn_code = models.CharField(max_length=50, unique=True, verbose_name="رقم الـ ISBN الفريد")

    class Meta:
        db_table = 'nebras_library_isbns'
        verbose_name = "رقم ISBN"
        verbose_name_plural = "أرقام ISBN الموحدة للكتب"


# 11. BookCopy (النسخ الفزيائية المتوفرة بالمكتبة للكتب)
class BookCopy(CombinedSharedModel):
    STATUS_CHOICES = (
        ('available', 'متاح للاستعارة'),
        ('borrowed', 'مستعار حالياً'),
        ('reserved', 'محجوز بانتظار الاستلام'),
        ('lost', 'مفقود'),
        ('damaged', 'تالف'),
    )
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='copies', verbose_name="الكتاب")
    shelf = models.ForeignKey(Shelf, on_delete=models.PROTECT, related_name='copies', verbose_name="الرف المتواجد فيه")
    barcode = models.CharField(max_length=100, db_index=True, verbose_name="الباركود الملتصق بالنسخة")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available', verbose_name="حالة النسخة")

    class Meta:
        db_table = 'nebras_library_book_copies'
        unique_together = ('tenant_id', 'barcode')
        verbose_name = "نسخة كتاب"
        verbose_name_plural = "نسخ الكتب الفزيائية"

    def __str__(self):
        return f"{self.book.title_ar} - {self.barcode}"


# 12. BorrowTransaction (عمليات الاستعارة الفردية)
class BorrowTransaction(CombinedSharedModel):
    STATUS_CHOICES = (
        ('borrowed', 'مستعار حالياً'),
        ('returned', 'تم الإرجاع بنجاح'),
        ('overdue', 'متأخر الإرجاع وبانتظار تسوية الغرامات'),
        ('lost', 'مفقود ولم يتم الإرجاع'),
    )
    copy = models.ForeignKey(BookCopy, on_delete=models.PROTECT, related_name='borrows', verbose_name="نسخة الكتاب")
    borrower_user_id = models.UUIDField(db_index=True, verbose_name="معرف المستعير (طالب/معلم/موظف)")
    borrow_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ الاستعارة")
    due_date = models.DateField(verbose_name="تاريخ الإرجاع المستحق")
    actual_return_date = models.DateField(blank=True, null=True, verbose_name="تاريخ الإرجاع الفعلي")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='borrowed', verbose_name="حالة الاستعارة")

    class Meta:
        db_table = 'nebras_library_borrows'
        verbose_name = "عملية استعارة"
        verbose_name_plural = "سجلات استعارة الكتب"


# 13. Reservation (طلبات الحجز المسبق للكتب المستعارة)
class Reservation(CombinedSharedModel):
    STATUS_CHOICES = (
        ('pending', 'قيد الانتظار'),
        ('available', 'متاح ومحجوز للاستلام'),
        ('completed', 'تمت الاستعارة وإلغاء الحجز'),
        ('cancelled', 'ملغى'),
    )
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='reservations', verbose_name="الكتاب المطلوب")
    user_id = models.UUIDField(db_index=True, verbose_name="المستخدم المتقدم بالحجز")
    reservation_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ تقديم الحجز")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    class Meta:
        db_table = 'nebras_library_reservations'
        verbose_name = "حجز مسبق"
        verbose_name_plural = "حجوزات الكتب المسبقة"


# 14. Renewal (عمليات التجديد لطلب الاستعارة الحالي)
class Renewal(CombinedSharedModel):
    borrow_transaction = models.ForeignKey(BorrowTransaction, on_delete=models.CASCADE, related_name='renewals', verbose_name="عملية الاستعارة")
    renewal_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ تقديم التجديد")
    new_due_date = models.DateField(verbose_name="تاريخ الإرجاع الجديد الممنوح")

    class Meta:
        db_table = 'nebras_library_renewals'
        verbose_name = "تجديد استعارة"
        verbose_name_plural = "تجديدات فترات الاستعارة"


# 15. Fine (غرامات التأخير الصادرة)
class Fine(CombinedSharedModel):
    STATUS_CHOICES = (
        ('unpaid', 'غير مدفوعة'),
        ('paid', 'تم السداد ومرحلة ماليّاً'),
        ('waived', 'تم الإعفاء والموافقة'),
    )
    borrow_transaction = models.ForeignKey(BorrowTransaction, on_delete=models.CASCADE, related_name='fines', verbose_name="عملية الاستعارة")
    fine_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="قيمة الغرامة المستحقة")
    days_overdue = models.IntegerField(verbose_name="عدد أيام التأخير")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='unpaid', verbose_name="حالة السداد")
    journal_entry_id = models.UUIDField(null=True, blank=True, help_text="قيد تسوية الغرامات المنعكس بالمالية")

    class Meta:
        db_table = 'nebras_library_fines'
        verbose_name = "غرامة تأخير"
        verbose_name_plural = "غرامات تأخير إرجاع الكتب"


# 16. LostBook (سجل إثبات الكتب المفقودة)
class LostBook(CombinedSharedModel):
    copy = models.ForeignKey(BookCopy, on_delete=models.PROTECT, related_name='lost_records', verbose_name="نسخة الكتاب")
    reported_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ إثبات الفقد")
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="القيمة المحملة على المستعير كتعويض")
    is_paid = models.BooleanField(default=False)

    class Meta:
        db_table = 'nebras_library_lost_books'
        verbose_name = "كتاب مفقود"
        verbose_name_plural = "سجلات الكتب المفقودة"


# 17. DamagedBook (سجلات الكتب التالفة بفعل الاستعارة)
class DamagedBook(CombinedSharedModel):
    copy = models.ForeignKey(BookCopy, on_delete=models.PROTECT, related_name='damaged_records', verbose_name="نسخة الكتاب")
    reported_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ إثبات التلف")
    damage_description = models.TextField(verbose_name="توصيف التلف الفعلي للنسخة")
    repair_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    class Meta:
        db_table = 'nebras_library_damaged_books'
        verbose_name = "كتاب تالف"
        verbose_name_plural = "سجلات الكتب التالفة"


# 18. DigitalResource (المصادر والمراجع الرقمية)
class DigitalResource(CombinedSharedModel):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='digital_resources', verbose_name="الكتاب/المرجع")
    file_type = models.CharField(max_length=50, verbose_name="نوع الملف (PDF, EPUB, MP4)")
    file_url = models.CharField(max_length=255, verbose_name="رابط تحميل/تصفح الملف الرقمي")
    download_allowed = models.BooleanField(default=True, verbose_name="متاح للتحميل المباشر")

    class Meta:
        db_table = 'nebras_library_digital_resources'
        verbose_name = "مصدر رقمي"
        verbose_name_plural = "المصادر والمراجع الرقمية"


# 19. MediaResource (مواد ومقاطع الفيديو والوسائط المتعددة التعليمية)
class MediaResource(CombinedSharedModel):
    title = models.CharField(max_length=200, verbose_name="عنوان الوسيط التعليمي")
    url = models.CharField(max_length=255, verbose_name="رابط التصفح/الفيديو")

    class Meta:
        db_table = 'nebras_library_media_resources'
        verbose_name = "وسيط تعليمي"
        verbose_name_plural = "مواد ووسائط الميديا التعليمية"


# 20. Subscription (الاشتراكات في قواعد البيانات والمجلات العلمية)
class Subscription(CombinedSharedModel):
    provider_name = models.CharField(max_length=150, verbose_name="اسم شبكة الاشتراك (مثال: دار المنظومة)")
    start_date = models.DateField(verbose_name="تاريخ بدء الاشتراك")
    end_date = models.DateField(verbose_name="تاريخ انتهاء الاشتراك")
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="تكلفة الاشتراك")

    class Meta:
        db_table = 'nebras_library_subscriptions'
        verbose_name = "اشتراك مجلة"
        verbose_name_plural = "اشتراكات المكتبات وقواعد البيانات"


# 21. LearningResource (الحزم والحقائب والمواد التعليمية المرفقة)
class LearningResource(CombinedSharedModel):
    title = models.CharField(max_length=200, verbose_name="عنوان الحقيبة التعليمية")
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'nebras_library_learning_resources'
        verbose_name = "حقيبة تعليمية"
        verbose_name_plural = "الحقائب والمواد التعليمية"


# 22. ResourceAttachment (المرفقات التابعة)
class ResourceAttachment(CombinedSharedModel):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name='attachments', verbose_name="الكتاب")
    file_path = models.CharField(max_length=255)

    class Meta:
        db_table = 'nebras_library_attachments'
        verbose_name = "مرفق مصنف"
        verbose_name_plural = "مرفقات الكتب ومصادر التعلم"


# 23. ReadingHistory (سجل القراءة والمطالعة التاريخية للمستخدم)
class ReadingHistory(CombinedSharedModel):
    user_id = models.UUIDField(db_index=True, verbose_name="المستخدم")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, verbose_name="الكتاب المطالع")
    read_date = models.DateField(default=timezone.localdate, verbose_name="تاريخ القراءة/الاستعارة")

    class Meta:
        db_table = 'nebras_library_reading_histories'
        verbose_name = "تاريخ قراءة"
        verbose_name_plural = "سجل القراءات التاريخي للمستخدمين"


# 24. ReadingRecommendation (التوصيات والترشيحات القرائية)
class ReadingRecommendation(CombinedSharedModel):
    user_id = models.UUIDField(db_index=True, verbose_name="المستهدف بالتوصية")
    book = models.ForeignKey(Book, on_delete=models.CASCADE, verbose_name="الكتاب الموصى به")
    reason = models.TextField(verbose_name="سبب الترشيح/التوصية")

    class Meta:
        db_table = 'nebras_library_recommendations'
        verbose_name = "توصية قرائية"
        verbose_name_plural = "التوصيات والترشيحات القرائية"


# 25. InventoryLink (التزامن والربط مع موديول المخازن والمستودعات)
class InventoryLink(CombinedSharedModel):
    copy = models.ForeignKey(BookCopy, on_delete=models.CASCADE, related_name='inventory_links', verbose_name="نسخة الكتاب")
    inventory_item_id = models.UUIDField(verbose_name="رقم البند التابع له بجدول المخازن (InventoryItem UUID)")

    class Meta:
        db_table = 'nebras_library_inventory_links'
        verbose_name = "رابط مخزني"
        verbose_name_plural = "روابط تتبع ومزامنة مخزون الكتب"


# 26. LibrarySettings (إعدادات وسياسات الإعارة والغرامات)
class LibrarySettings(CombinedSharedModel):
    max_books_allowed = models.IntegerField(default=5, verbose_name="أقصى عدد كتب مستعارة مسموح به")
    default_loan_period_days = models.IntegerField(default=14, verbose_name="فترة الاستعارة الافتراضية باليوم")
    fine_per_day = models.DecimalField(max_digits=6, decimal_places=2, default=1.00, verbose_name="غرامة التأخير لليوم الواحد")

    class Meta:
        db_table = 'nebras_library_settings'
        verbose_name = "إعدادات المكتبة"
        verbose_name_plural = "إعدادات وسياسات المكتبات"


# 27. LibraryStatistics (إحصائيات المكتبة العامة)
class LibraryStatistics(CombinedSharedModel):
    as_of_date = models.DateField(db_index=True)
    total_books_count = models.IntegerField(default=0, verbose_name="عدد العناوين المسجلة")
    borrowed_books_count = models.IntegerField(default=0, verbose_name="الكتب المستعارة حالياً")
    unpaid_fines_sum = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, verbose_name="إجمالي الغرامات غير المدفوعة")

    class Meta:
        db_table = 'nebras_library_statistics'
        verbose_name = "إحصائية مكتبة"
        verbose_name_plural = "إحصائيات المكتبة العامة"


# 28. LibraryAudit (سجل تدقيق عمليات المكتبة الحساسة)
class LibraryAudit(CombinedSharedModel):
    action_type = models.CharField(max_length=100, verbose_name="نوع العملية")
    performed_by = models.UUIDField(null=True, blank=True, verbose_name="المستخدم المنفذ")
    performed_at = models.DateTimeField(default=timezone.now)
    details = models.JSONField(default=dict, verbose_name="تفاصيل العملية")

    class Meta:
        db_table = 'nebras_library_audits'
        verbose_name = "سجل تدقيق مكتبة"
        verbose_name_plural = "سجلات تدقيق عمليات المكتبة"