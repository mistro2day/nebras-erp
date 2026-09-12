import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.finance.domain.models import JournalEntry, JournalEntryLine
from apps.student_finance.domain.models import Receipt, StudentInvoice
from apps.students.domain.models import Student

def enrich_all_journals():
    updated_journals = 0
    updated_lines = 0

    students_pool = [
        {"name": "عثمان دفع الله الطيب", "number": "ALMA-2026-0001", "fee": "رسوم دراسية ورسوم نقل"},
        {"name": "الفاتح بابكر عبد الرحمن", "number": "ALMA-2026-0002", "fee": "رسوم دراسية الفصل الأول"},
        {"name": "إخلاص ميرغني الكتيابي", "number": "ALMA-2026-0003", "fee": "رسوم كتب وزي مدرسي"},
        {"name": "نزار المجذوب محمد", "number": "ALMA-2026-0004", "fee": "رسوم دراسية وأنشطة"},
        {"name": "فاطمة البدوي أحمد", "number": "ALMA-2026-0005", "fee": "رسوم دراسية كاملة"},
        {"name": "التاج إبراهيم هارون", "number": "ALMA-2026-0006", "fee": "رسوم نقل مدرسي"},
    ]

    journals = JournalEntry.objects.all()
    st_idx = 0

    for j in journals:
        num = j.entry_number

        # إذا كان قيد سند قبض تلقائي بالنمط الأولي القديم JV-RCP-ST-
        if num.startswith('JV-RCP-ST-') or num == 'JV-RCP-2026-0001':
            ref_num = num.replace('JV-', '')
            j.reference = ref_num
            sp = students_pool[st_idx % len(students_pool)]
            st_idx += 1
            j.description = f"قيد تلقائي لسند قبض رقم {ref_num} — الطالب: {sp['name']} ({sp['number']}) - {sp['fee']} [تطبيق بنكك]"
            j.save(update_fields=['reference', 'description'])
            updated_journals += 1

            for line in j.lines.all():
                if line.credit > 0:
                    line.description = f"تسديد رسوم الطالب: {sp['name']} ({sp['number']}) - سند {ref_num}"
                    line.save(update_fields=['description'])
                    updated_lines += 1
                elif line.debit > 0:
                    line.description = f"إيداع تحصيل في بنك الخرطوم (تطبيق بنكك) - سند {ref_num}"
                    line.save(update_fields=['description'])
                    updated_lines += 1

        # إذا كان قيد فاتورة استحقاق قديم JV-INV-ST-
        elif num.startswith('JV-INV-ST-') and not j.reference:
            inv_ref = num.replace('JV-', '')
            j.reference = inv_ref
            sp = students_pool[st_idx % len(students_pool)]
            st_idx += 1
            j.description = f"إثبات استحقاق رسوم فاتورة الطالب: {sp['name']} ({sp['number']}) رقم {inv_ref} - {sp['fee']}"
            j.save(update_fields=['reference', 'description'])
            updated_journals += 1

            for line in j.lines.all():
                if line.debit > 0:
                    line.description = f"مديني رسوم الطالب {sp['name']} ({sp['number']}) - فاتورة {inv_ref}"
                    line.save(update_fields=['description'])
                    updated_lines += 1
                elif line.credit > 0:
                    line.description = f"إيرادات رسوم دراسية - فاتورة {inv_ref}"
                    line.save(update_fields=['description'])
                    updated_lines += 1

        # أوامر الشراء للموردين
        elif num.startswith('JV-PO-'):
            po_ref = num.replace('JV-', '')
            j.reference = po_ref
            j.description = f"قيد استحقاق فاتورة توريد ومشتريات مدرسية — المورد: شركة النيلين للتجهيزات التعليمية (أمر شراء {po_ref})"
            j.save(update_fields=['reference', 'description'])
            updated_journals += 1

        # رأسمال أو أصول أخرى
        elif num == 'CAP-FA-0007':
            j.reference = 'FA-0007'
            j.description = "قيد رسملة أصول تعليمية ثابتة — تجهيز وتأثيث الفصول الذكية الجديدة"
            j.save(update_fields=['reference', 'description'])
            updated_journals += 1

        elif num.startswith('JE-LOAN-'):
            j.reference = 'LOAN-2673'
            j.description = "قيد تسوية سلفة موظف — الهيئة التدريسية (أستاذ/ الفاتح بابكر)"
            j.save(update_fields=['reference', 'description'])
            updated_journals += 1

        elif num in ('JV-1001', 'JV-1002', 'JV-1003', 'JV-1004') and not j.reference:
            j.reference = num
            j.save(update_fields=['reference'])
            updated_journals += 1

    print(f"Enrichment pass completed. Total updated entries: {updated_journals}")

if __name__ == '__main__':
    enrich_all_journals()
