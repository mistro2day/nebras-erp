# -*- coding: utf-8 -*-
import os
import sys
import django
import datetime
import uuid
from decimal import Decimal

sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.tenants.domain.models import Tenant
from apps.clinic.domain.models import (
    Clinic, ClinicRoom, MedicalProfile, ClinicVisit, VitalSigns,
    Medication, MedicationDispense, MedicalLeave, MedicalCertificate
)
from apps.library.domain.models import (
    LibraryBranch, LibrarySection, Shelf, BookAuthor, Publisher,
    Category, Language, Book, BookCopy, BorrowTransaction, Fine, LibrarySettings
)
from apps.inventory.domain.models import Warehouse, InventoryItem, InventoryUnit, InventoryCategory, InventoryBalance
from apps.finance.domain.models import ChartOfAccount, FiscalYear, AccountingPeriod, Currency, AccountType, AccountCategory

def seed():
    # 1. جلب المستأجر الافتراضي لبيئة التطوير
    dev_tenant_id = 'b943665a-19ff-4ef3-9c24-221cf4057a55'
    tenant = Tenant.objects.filter(id=dev_tenant_id).first() or Tenant.objects.first()
    
    if not tenant:
        print("خطأ: لم يتم العثور على أي مستأجر (Tenant) في النظام.")
        return
    
    t_id = tenant.id
    print(f"استخدام المستأجر للتأسيس: {tenant.name} ({t_id})")

    # --- تهيئة الحسابات المالية اللازمة لتكامل المكتبة ---
    currency, _ = Currency.objects.get_or_create(
        tenant_id=t_id,
        code="SAR",
        defaults={
            "name_ar": "ريال سعودي",
            "name_en": "Saudi Riyal",
            "symbol": "SR",
            "is_base": True
        }
    )
    fiscal_year, _ = FiscalYear.objects.get_or_create(
        tenant_id=t_id,
        name="2026",
        defaults={
            "start_date": datetime.date(2026, 1, 1),
            "end_date": datetime.date(2026, 12, 31),
            "status": 'open',
            "is_current": True
        }
    )
    AccountingPeriod.objects.get_or_create(
        tenant_id=t_id,
        fiscal_year=fiscal_year,
        name="Full Year 2026",
        defaults={
            "start_date": datetime.date(2026, 1, 1),
            "end_date": datetime.date(2026, 12, 31),
            "status": 'open'
        }
    )
    
    type_asset, _ = AccountType.objects.get_or_create(
        tenant_id=t_id, code='asset', defaults={"name_ar": "أصول", "name_en": "Assets", "normal_balance": "debit"}
    )
    type_revenue, _ = AccountType.objects.get_or_create(
        tenant_id=t_id, code='revenue', defaults={"name_ar": "إيرادات", "name_en": "Revenues", "normal_balance": "credit"}
    )
    cat_current, _ = AccountCategory.objects.get_or_create(
        tenant_id=t_id, code='current_assets', defaults={"name_ar": "أصول متداولة", "name_en": "Current Assets", "account_type": type_asset}
    )
    
    debit_acc, _ = ChartOfAccount.objects.get_or_create(
        tenant_id=t_id,
        code="120303",
        defaults={
            "name_ar": "ذمم استعارات الطلاب",
            "name_en": "Student Borrowing Receivables",
            "account_type": type_asset,
            "account_category": cat_current,
            "normal_balance": 'debit',
            "status": 'active'
        }
    )
    credit_acc, _ = ChartOfAccount.objects.get_or_create(
        tenant_id=t_id,
        code="420303",
        defaults={
            "name_ar": "إيرادات غرامات المكتبة",
            "name_en": "Library Fine Revenues",
            "account_type": type_revenue,
            "account_category": cat_current,
            "normal_balance": 'credit',
            "status": 'active'
        }
    )

    # --- 1. بذر موديول العيادة الطبية ---
    clinic, _ = Clinic.objects.get_or_create(
        tenant_id=t_id,
        code="CLN-MAIN",
        defaults={
            "name_ar": "العيادة المدرسية الرئيسية",
            "name_en": "Main School Clinic"
        }
    )
    ClinicRoom.objects.get_or_create(
        tenant_id=t_id,
        clinic=clinic,
        room_number="ROOM-101",
        defaults={"purpose": "غرفة كشف وتشخيص عامة"}
    )
    ClinicRoom.objects.get_or_create(
        tenant_id=t_id,
        clinic=clinic,
        room_number="ROOM-102",
        defaults={"purpose": "غرفة عزل وقائي"}
    )
    
    # مستودع وصنف مخزني للأدوية
    wh, _ = Warehouse.objects.get_or_create(
        tenant_id=t_id,
        code="CLN-WH",
        defaults={
            "name_ar": "مستودع مستلزمات العيادة",
            "name_en": "Clinic Supplies Warehouse"
        }
    )
    inv_cat, _ = InventoryCategory.objects.get_or_create(
        tenant_id=t_id,
        code="MED",
        defaults={
            "name_ar": "أدوية ومستلزمات طبية",
            "name_en": "Medicines"
        }
    )
    unit, _ = InventoryUnit.objects.get_or_create(
        tenant_id=t_id,
        code="BOX",
        defaults={
            "name_ar": "علبة",
            "name_en": "Box"
        }
    )
    
    inv_item1, _ = InventoryItem.objects.get_or_create(
        tenant_id=t_id,
        sku="MED-PAN-500",
        defaults={
            "category": inv_cat,
            "name_ar": "بنادول 500 ملجم",
            "name_en": "Panadol 500mg",
            "uom": unit
        }
    )
    inv_item2, _ = InventoryItem.objects.get_or_create(
        tenant_id=t_id,
        sku="MED-AMX-250",
        defaults={
            "category": inv_cat,
            "name_ar": "أموكسيسيلين شراب 250 ملجم",
            "name_en": "Amoxicillin Syrup 250mg",
            "uom": unit
        }
    )
    
    # ربط مستحضرات العيادة بالأصناف المخزنية
    med1, _ = Medication.objects.get_or_create(
        tenant_id=t_id,
        name_ar="بنادول خافض حرارة مسكن",
        name_en="Panadol Pain Reliever",
        defaults={"inventory_item_id": inv_item1.id}
    )
    med2, _ = Medication.objects.get_or_create(
        tenant_id=t_id,
        name_ar="أموكسيل مضاد حيوي للأطفال",
        name_en="Amoxil Antibiotic Syrup",
        defaults={"inventory_item_id": inv_item2.id}
    )

    # شحن الرصيد المخزني بالعيادة لتمر عملية الصرف بنجاح
    InventoryBalance.objects.get_or_create(
        tenant_id=t_id,
        item=inv_item1,
        warehouse=wh,
        defaults={"qty_on_hand": Decimal('100.00'), "qty_reserved": Decimal('0.00')}
    )
    InventoryBalance.objects.get_or_create(
        tenant_id=t_id,
        item=inv_item2,
        warehouse=wh,
        defaults={"qty_on_hand": Decimal('50.00'), "qty_reserved": Decimal('0.00')}
    )
    
    # زيارات عيادة تجريبية
    patient1 = uuid.uuid4()
    patient2 = uuid.uuid4()
    
    v1, _ = ClinicVisit.objects.get_or_create(
        tenant_id=t_id,
        clinic=clinic,
        patient_user_id=patient1,
        visit_date=datetime.date.today(),
        defaults={
            "visit_type": "walk_in",
            "status": "checked_in",
            "notes": "صداع مستمر وارتفاع طفيف في درجة الحرارة"
        }
    )
    v2, _ = ClinicVisit.objects.get_or_create(
        tenant_id=t_id,
        clinic=clinic,
        patient_user_id=patient2,
        visit_date=datetime.date.today(),
        defaults={
            "visit_type": "emergency",
            "status": "diagnosed",
            "notes": "إصابة رياضية خفيفة في الساق أثناء حصة التربية البدنية"
        }
    )
    
    # إجازات طبية تجريبية معلقة
    MedicalLeave.objects.get_or_create(
        tenant_id=t_id,
        patient_user_id=patient1,
        start_date=datetime.date.today(),
        defaults={
            "end_date": datetime.date.today() + datetime.timedelta(days=2),
            "reason": "إنفلونزا حادة تستدعي الراحة المنزلية",
            "status": "submitted"
        }
    )

    # --- 2. بذر موديول المكتبة ---
    branch, _ = LibraryBranch.objects.get_or_create(
        tenant_id=t_id,
        code="MAIN-LIB",
        defaults={
            "name_ar": "المكتبة المركزية العامة",
            "name_en": "Main General Library"
        }
    )
    section, _ = LibrarySection.objects.get_or_create(
        tenant_id=t_id,
        branch=branch,
        code="SEC-A",
        defaults={
            "name_ar": "قسم المعرفة والعلوم",
            "name_en": "Science & Knowledge"
        }
    )
    shelf, _ = Shelf.objects.get_or_create(
        tenant_id=t_id,
        section=section,
        code="SHF-12",
        defaults={}
    )
    author, _ = BookAuthor.objects.get_or_create(
        tenant_id=t_id,
        name_ar="د. أحمد مصطفى",
        name_en="Dr. Ahmed Mostafa",
        defaults={}
    )
    publisher, _ = Publisher.objects.get_or_create(
        tenant_id=t_id,
        name_ar="دار المعارف للنشر",
        name_en="Dar Al Maaref",
        defaults={}
    )
    cat, _ = Category.objects.get_or_create(
        tenant_id=t_id,
        code="000",
        defaults={
            "name_ar": "علوم الحاسوب والبرمجيات",
            "name_en": "Computer Science"
        }
    )
    lang, _ = Language.objects.get_or_create(
        tenant_id=t_id,
        code="AR",
        defaults={
            "name_ar": "العربية",
            "name_en": "Arabic"
        }
    )
    
    # الكتب
    book1, _ = Book.objects.get_or_create(
        tenant_id=t_id,
        title_ar="المدخل الشامل للبرمجة بلغة بايثون",
        title_en="Comprehensive Guide to Python",
        defaults={
            "category": cat,
            "language": lang,
            "publisher": publisher
        }
    )
    book1.authors.add(author)
    
    book2, _ = Book.objects.get_or_create(
        tenant_id=t_id,
        title_ar="أساسيات الرياضيات التطبيقية",
        title_en="Fundamentals of Applied Mathematics",
        defaults={
            "category": cat,
            "language": lang,
            "publisher": publisher
        }
    )
    book2.authors.add(author)
    
    # نسخ الكتب الفزيائية والباركود
    copy1, _ = BookCopy.objects.get_or_create(
        tenant_id=t_id,
        barcode="BK-PY-01",
        defaults={
            "book": book1,
            "shelf": shelf,
            "status": "available"
        }
    )
    copy2, _ = BookCopy.objects.get_or_create(
        tenant_id=t_id,
        barcode="BK-PY-02",
        defaults={
            "book": book1,
            "shelf": shelf,
            "status": "borrowed"
        }
    )
    copy3, _ = BookCopy.objects.get_or_create(
        tenant_id=t_id,
        barcode="BK-MA-01",
        defaults={
            "book": book2,
            "shelf": shelf,
            "status": "available"
        }
    )
    
    # تهيئة إعدادات المكتبة الافتراضية
    LibrarySettings.objects.get_or_create(
        tenant_id=t_id,
        defaults={
            "max_books_allowed": 5,
            "default_loan_period_days": 14,
            "fine_per_day": Decimal('1.50')
        }
    )

    # إنشاء معاملة استعارة نشطة لإتاحة إرجاعها واحتساب الغرامة
    bt, _ = BorrowTransaction.objects.get_or_create(
        tenant_id=t_id,
        copy=copy2,
        borrower_user_id=patient1,
        defaults={
            "borrow_date": datetime.date.today() - datetime.timedelta(days=20),
            "due_date": datetime.date.today() - datetime.timedelta(days=6),
            "status": "borrowed"
        }
    )
    
    # غرامات معلقة تجريبية
    Fine.objects.get_or_create(
        tenant_id=t_id,
        borrow_transaction=bt,
        defaults={
            "fine_amount": Decimal("15.00"),
            "days_overdue": 10,
            "status": "unpaid"
        }
    )

    print("Done seeding clinic and library data successfully!")

if __name__ == '__main__':
    seed()
