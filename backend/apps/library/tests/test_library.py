import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone

from apps.library.domain.models import (
    LibraryBranch, LibrarySection, Shelf, Book, BookCopy, BorrowTransaction,
    Category, Language, Publisher, Fine, LibrarySettings
)
from apps.library.application.services import BorrowService, FineService

# استدعاء الحسابات العامة
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, Currency, AccountType, AccountCategory

class LibraryTestCase(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        
        # 1. إعداد العملة والفترة المالية والمحاسبية لنجاح التكامل المالي
        self.currency = Currency.objects.create(
            tenant_id=self.tenant_id,
            code="SAR",
            name_ar="ريال سعودي",
            name_en="Saudi Riyal",
            symbol="SR",
            is_base=True
        )
        self.fiscal_year = FiscalYear.objects.create(
            tenant_id=self.tenant_id,
            name="2026",
            start_date=timezone.datetime(2026, 1, 1).date(),
            end_date=timezone.datetime(2026, 12, 31).date(),
            status='open',
            is_current=True
        )
        self.period = AccountingPeriod.objects.create(
            tenant_id=self.tenant_id,
            fiscal_year=self.fiscal_year,
            name="Full Year 2026",
            start_date=timezone.datetime(2026, 1, 1).date(),
            end_date=timezone.datetime(2026, 12, 31).date(),
            status='open'
        )

        # الحسابات وتصنيفات الشجرة
        self.type_asset = AccountType.objects.create(
            tenant_id=self.tenant_id, code='asset', name_ar='أصول', name_en='Assets', normal_balance='debit'
        )
        self.type_revenue = AccountType.objects.create(
            tenant_id=self.tenant_id, code='revenue', name_ar='إيرادات', name_en='Revenues', normal_balance='credit'
        )
        self.cat_current = AccountCategory.objects.create(
            tenant_id=self.tenant_id, code='current_assets', name_ar='أصول متداولة', name_en='Current Assets', account_type=self.type_asset
        )

        self.debit_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="120303",
            name_ar="ذمم استعارات الطلاب",
            name_en="Student Borrowing Receivables",
            account_type=self.type_asset,
            account_category=self.cat_current,
            normal_balance='debit',
            status='active'
        )
        self.credit_account = ChartOfAccount.objects.create(
            tenant_id=self.tenant_id,
            code="420303",
            name_ar="إيرادات غرامات المكتبة",
            name_en="Library Fine Revenues",
            account_type=self.type_revenue,
            account_category=self.cat_current,
            normal_balance='credit',
            status='active'
        )

        # 2. إعداد الفرع والقسم والرف والناشر والتصنيف واللغة
        self.branch = LibraryBranch.objects.create(
            tenant_id=self.tenant_id, code="MAIN-LIB", name_ar="المكتبة المركزية", name_en="Main Library"
        )
        self.section = LibrarySection.objects.create(
            tenant_id=self.tenant_id, branch=self.branch, code="SEC-A", name_ar="قسم المعرفة العامة", name_en="General Knowledge"
        )
        self.shelf = Shelf.objects.create(
            tenant_id=self.tenant_id, section=self.section, code="SHF-12"
        )
        self.publisher = Publisher.objects.create(
            tenant_id=self.tenant_id, name_ar="دار الفكر العربي", name_en="Al Fikr Publishers"
        )
        self.category = Category.objects.create(
            tenant_id=self.tenant_id, code="000", name_ar="الحواسب والمعلومات", name_en="Computer Science"
        )
        self.language = Language.objects.create(
            tenant_id=self.tenant_id, code="AR", name_ar="العربية", name_en="Arabic"
        )

        # 3. إعداد إعدادات المكتبة والسياسات
        self.settings = LibrarySettings.objects.create(
            tenant_id=self.tenant_id,
            max_books_allowed=5,
            default_loan_period_days=14,
            fine_per_day=Decimal('2.50')
        )

        # 4. تسجيل كتاب ونسخة منه
        self.book = Book.objects.create(
            tenant_id=self.tenant_id,
            title_ar="مقدمة في هندسة البرمجيات",
            title_en="Introduction to Software Engineering",
            category=self.category,
            language=self.language,
            publisher=self.publisher
        )
        self.copy = BookCopy.objects.create(
            tenant_id=self.tenant_id,
            book=self.book,
            shelf=self.shelf,
            barcode="BC-2026-9090",
            status='available'
        )

        self.borrower_id = uuid.uuid4()

    def test_library_borrow_and_return_with_fine_posting(self):
        # 1. إعارة نسخة الكتاب
        tx = BorrowService.borrow_book(
            tenant_id=self.tenant_id,
            copy_id=self.copy.id,
            borrower_user_id=self.borrower_id,
            loan_period_days=10
        )

        self.copy.refresh_from_db()
        self.assertEqual(self.copy.status, 'borrowed')
        self.assertEqual(tx.status, 'borrowed')

        # 2. إرجاع الكتاب متأخراً 4 أيام (تاريخ الإرجاع بعد 14 يوماً بينما المسموح 10 أيام)
        return_date = tx.borrow_date + timezone.timedelta(days=14)
        
        # إرجاع وتطبيق غرامة: 4 أيام تأخير * 2.50 ريال غرامة يومية = 10.00 ريال غرامة
        returned_tx = BorrowService.return_book(
            tenant_id=self.tenant_id,
            borrow_transaction_id=tx.id,
            actual_return_date=return_date,
            debit_gl_account_id=self.debit_account.id,
            credit_gl_account_id=self.credit_account.id
        )

        self.copy.refresh_from_db()
        self.assertEqual(self.copy.status, 'available')
        self.assertEqual(returned_tx.status, 'returned')

        # التحقق من تسجيل وتوليد قيد الغرامة بنجاح
        fine = Fine.objects.filter(tenant_id=self.tenant_id, borrow_transaction=tx).first()
        self.assertIsNotNone(fine)
        self.assertEqual(fine.fine_amount, Decimal('10.00'))
        self.assertEqual(fine.days_overdue, 4)
        self.assertIsNotNone(fine.journal_entry_id)
