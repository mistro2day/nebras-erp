import uuid
import datetime
import re
import io
import csv
import typing
from django.db import transaction
from django.utils import timezone
from apps.common.exceptions import BusinessException
from apps.students.domain.models import (
    Student, StudentProfile, StudentMedicalProfile,
    StudentFamilyRelation, StudentEnrollment
)
from apps.academics.domain.models import Grade, Section, AcademicYear, Stage
from apps.organization.domain.models import Branch
from apps.students.domain.services import StudentNumberGenerator
from apps.students.domain.events import DomainEventPublisher
from apps.students.application.services import resolve_branch_for_gender, StudentApplicationService
from decimal import Decimal
from apps.student_finance.domain.models import StudentBillingAccount, StudentInvoice, Receipt, Installment, InstallmentPlan
try:
    from apps.clinic.application import profile_service as clinic_profiles
except ImportError:
    clinic_profiles = None
from openpyxl.worksheet.datavalidation import DataValidation  # type: ignore
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side  # type: ignore
from openpyxl.utils import get_column_letter  # type: ignore
import openpyxl  # type: ignore


class StudentBulkImportService:
    """
    خدمة استيراد كشوفات الطلاب دفعة واحدة وتوليد قوالب الإكسل (.xlsx) الرسمية
    المطابقة للهوية السودانية وأنظمة نبراس التعليمية والربط المالي الآلي.
    """

    TEMPLATE_COLUMNS = [
        {'id': 'arabic_name', 'label': 'اسم الطالب رباعي *', 'required': True, 'width': 30, 'example': 'عثمان دفع الله الفاتح بابكر'},
        {'id': 'english_name', 'label': 'اسم الطالب بالإنجليزية', 'required': False, 'width': 26, 'example': 'Osman Dafallah Elfatih'},
        {'id': 'gender', 'label': 'الجنس * (ذكر / أنثى)', 'required': True, 'width': 18, 'example': 'ذكر'},
        {'id': 'date_of_birth', 'label': 'تاريخ الميلاد * (YYYY-MM-DD)', 'required': True, 'width': 24, 'example': '2014-04-12'},
        {'id': 'national_id', 'label': 'الرقم الوطني / شهادة الميلاد', 'required': False, 'width': 24, 'example': '11025894123'},
        {'id': 'nationality', 'label': 'الجنسية', 'required': False, 'width': 16, 'example': 'سوداني'},
        {'id': 'religion', 'label': 'الديانة (مسلم / مسيحي)', 'required': False, 'width': 20, 'example': 'مسلم'},
        {'id': 'blood_group', 'label': 'فصيلة الدم', 'required': False, 'width': 14, 'example': 'O+'},
        {'id': 'stage_name', 'label': 'المرحلة الدراسية', 'required': False, 'width': 22, 'example': 'مرحلة الأساس'},
        {'id': 'grade_name', 'label': 'الصف الدراسي *', 'required': True, 'width': 22, 'example': 'الصف الأول'},
        {'id': 'section_name', 'label': 'الفصل / الشعبة', 'required': False, 'width': 18, 'example': 'شعبة (أ)'},
        {'id': 'guardian_name', 'label': 'اسم ولي الأمر رباعي *', 'required': True, 'width': 30, 'example': 'دفع الله الفاتح بابكر عثمان'},
        {'id': 'guardian_relation', 'label': 'صلة القرابة * (أب/أم/ولي أمر)', 'required': True, 'width': 24, 'example': 'أب'},
        {'id': 'guardian_phone', 'label': 'رقم هاتف ولي الأمر * (09/01)', 'required': True, 'width': 24, 'example': '0912345678'},
        {'id': 'guardian_email', 'label': 'البريد الإلكتروني لولي الأمر', 'required': False, 'width': 26, 'example': 'dafallah@example.com'},
        {'id': 'guardian_job', 'label': 'مهنة ولي الأمر', 'required': False, 'width': 20, 'example': 'معلم / مهندس'},
        {'id': 'medical_notes', 'label': 'ملاحظات طبية أو حساسية', 'required': False, 'width': 25, 'example': 'سليم / لا توجد'},
        {'id': 'address', 'label': 'العنوان / السكن', 'required': False, 'width': 25, 'example': 'الخرطوم بحري - الصافية'},
        {'id': 'total_fees', 'label': 'الرسوم المدرسية (ج.س)', 'required': False, 'width': 22, 'example': '1100'},
        {'id': 'paid_amount', 'label': 'المدفوع (ج.س)', 'required': False, 'width': 20, 'example': '300'},
        {'id': 'remaining_amount', 'label': 'المتبقي (ج.س)', 'required': False, 'width': 20, 'example': '800'},
        {'id': 'receipt_number', 'label': 'رقم الإيصال / السند', 'required': False, 'width': 22, 'example': '284'},
        {'id': 'enrollment_type', 'label': 'نوع القيد (جديد / تجديد تسجيل)', 'required': False, 'width': 26, 'example': 'جديد'},
        {'id': 'documents_status', 'label': 'المستندات المستلمة', 'required': False, 'width': 26, 'example': 'وطني - نتائج'},
        {'id': 'finance_notes', 'label': 'ملاحظات الأقساط والتسجيل', 'required': False, 'width': 28, 'example': 'مقابلة الطالب - أقساط 9-10-11'},
    ]

    SAMPLE_ROWS = [
        {
            'arabic_name': 'عثمان دفع الله الفاتح بابكر',
            'english_name': 'Osman Dafallah Elfatih',
            'gender': 'ذكر',
            'date_of_birth': '2015-05-14',
            'national_id': '11204987112',
            'nationality': 'سوداني',
            'religion': 'مسلم',
            'blood_group': 'O+',
            'grade_name': 'الصف الأول',
            'section_name': 'شعبة (أ)',
            'guardian_name': 'دفع الله الفاتح بابكر',
            'guardian_relation': 'أب',
            'guardian_phone': '0912345678',
            'guardian_email': 'dafallah.f@gmail.com',
            'guardian_job': 'مهندس معماري',
            'medical_notes': 'لا توجد',
            'address': 'الخرطوم - الرياض',
            'total_fees': '1100',
            'paid_amount': '300',
            'remaining_amount': '800',
            'receipt_number': '284',
            'enrollment_type': 'جديد',
            'documents_status': 'وطني - نتائج',
            'finance_notes': 'مقابلة الطالب - أقساط 9-10-11',
        },
        {
            'arabic_name': 'إخلاص نزار المجذوب إبراهيم',
            'english_name': 'Ikhlas Nizar Elmagzoub',
            'gender': 'أنثى',
            'date_of_birth': '2016-08-20',
            'national_id': '21405891334',
            'nationality': 'سوداني',
            'religion': 'مسلم',
            'blood_group': 'A+',
            'grade_name': 'الصف الأول',
            'section_name': 'شعبة (ب)',
            'guardian_name': 'نزار المجذوب إبراهيم',
            'guardian_relation': 'أب',
            'guardian_phone': '0123456789',
            'guardian_email': '',
            'guardian_job': 'محاسب مالي',
            'medical_notes': 'حساسية صدرية خفيفة',
            'address': 'أم درمان - الملازمين',
            'total_fees': '1000',
            'paid_amount': '250',
            'remaining_amount': '750',
            'receipt_number': '286',
            'enrollment_type': 'تجديد تسجيل',
            'documents_status': 'صور - وطني',
            'finance_notes': 'أقساط 9-10-11',
        },
        {
            'arabic_name': 'مزمل الكباشي التاج محمد',
            'english_name': 'Muzammil Kabashi Eltaj',
            'gender': 'ذكر',
            'date_of_birth': '2014-11-03',
            'national_id': '11003487556',
            'nationality': 'سوداني',
            'religion': 'مسلم',
            'blood_group': 'B+',
            'grade_name': 'الصف الثاني',
            'section_name': 'شعبة (أ)',
            'guardian_name': 'فاطمة البدوي مصطفى',
            'guardian_relation': 'أم',
            'guardian_phone': '0923456781',
            'guardian_email': 'fatima.badawi@gmail.com',
            'guardian_job': 'أستاذة جامعية',
            'medical_notes': 'ضعف نظر بسيط - يستخدم نظارات',
            'address': 'بحري - الشعبية',
            'total_fees': '1300',
            'paid_amount': '800',
            'remaining_amount': '500',
            'receipt_number': '292',
            'enrollment_type': 'جديد',
            'documents_status': 'صور - وطني - شهاده',
            'finance_notes': 'مكتمل الملف ومسدد الدفعة الأولى',
        }
    ]

    @classmethod
    def generate_excel_template(cls, tenant_id: uuid.UUID) -> io.BytesIO:
        """
        توليد مصنف إكسل رسمي (.xlsx) متكامل ومحدث تلقائياً بمراحل وصفوف مدرستك:
        1. كشف الطلاب: ترويسة احترافية، حقول إلزامية، أمثلة واقعية من صفوف المدرسة، وقوائم منسدلة مربوطة ديناميكياً.
        2. دليل الخيارات والصفوف والمراحل المتاحة: يسرد كافة المراحل المعتمدة وصفوفها وشعبها بالمدرسة ونظام التقييم.
        """
        import openpyxl  # type: ignore
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side  # type: ignore
        from openpyxl.utils import get_column_letter  # type: ignore

        Workbook = openpyxl.Workbook
        wb = Workbook()
        
        # --- الورقة الأولى: كشف الطلاب ---
        ws = wb.active
        if ws is None:
            ws = wb.create_sheet('كشف الطلاب')
        assert ws is not None
        ws.title = 'كشف الطلاب'
        ws.sheet_view.rightToLeft = True

        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        
        # الألوان
        primary_teal = PatternFill('solid', fgColor='0F766E')  # لون الترويسة الرئيسي
        required_fill = PatternFill('solid', fgColor='134E4A')  # ترويسة الحقول الإلزامية
        optional_fill = PatternFill('solid', fgColor='0D9488')  # ترويسة الحقول الاختيارية
        sample_fill = PatternFill('solid', fgColor='F8FAFC')
        alt_sample_fill = PatternFill('solid', fgColor='F1F5F9')

        center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
        right_align = Alignment(horizontal='right', vertical='center')

        # جلب المراحل والصفوف الحالية للمستأجر
        stages_qs = list(Stage.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).order_by('order'))
        grades_qs = list(Grade.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).select_related('stage').prefetch_related('sections').order_by('stage__order', 'order'))

        # عنوان ورئيسية النموذج
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(cls.TEMPLATE_COLUMNS))
        title_cell = ws.cell(row=1, column=1, value='نظام نبراس لإدارة المدارس - نموذج كشف استيراد الطلاب الأكاديمي المعتمد')
        title_cell.font = Font(name='Arial', size=14, bold=True, color='134E4A')
        title_cell.alignment = center_align

        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(cls.TEMPLATE_COLUMNS))
        sub_cell = ws.cell(
            row=2, column=1,
            value='تنبيه: الحقول التي تحتوي علامة (*) إلزامية. يتم تحديث خيارات المراحل والصفوف تلقائياً من نظام مدرستك. يرجى حذف الأسطر التوضيحية قبل الرفع.'
        )
        sub_cell.font = Font(name='Arial', size=10, bold=False, color='64748B')
        sub_cell.alignment = center_align

        # كتابة ترويسة الأعمدة (Row 4)
        for col_idx, col_def in enumerate(cls.TEMPLATE_COLUMNS, start=1):
            cell = ws.cell(row=4, column=col_idx, value=col_def['label'])
            cell.font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
            cell.fill = required_fill if col_def['required'] else optional_fill
            cell.alignment = center_align
            cell.border = thin_border
            ws.column_dimensions[get_column_letter(col_idx)].width = col_def['width']

        # تجهيز أسطر العينات التوضيحية مع تكييفها ديناميكياً مع المراحل والصفوف المسجلة
        dynamic_samples = []
        base_samples = list(cls.SAMPLE_ROWS)
        for i, s_row in enumerate(base_samples):
            row_copy = dict(s_row)
            if grades_qs:
                target_grade = grades_qs[i % len(grades_qs)]
                row_copy['grade_name'] = target_grade.name
                row_copy['stage_name'] = target_grade.stage.name if target_grade.stage else (stages_qs[0].name if stages_qs else 'مرحلة الأساس')
                sec_list = [s.name for s in target_grade.sections.filter(deleted_at__isnull=True)]
                row_copy['section_name'] = sec_list[0] if sec_list else 'شعبة (أ)'
            else:
                row_copy['stage_name'] = stages_qs[0].name if stages_qs else 'المرحلة الابتدائية'
                row_copy['grade_name'] = 'الصف الأول'
                row_copy['section_name'] = 'شعبة (أ)'
            dynamic_samples.append(row_copy)

        # تعبئة الأسطر النموذجية التوضيحية (الصفوف 5 و 6 و 7)
        for row_idx, sample in enumerate(dynamic_samples, start=5):
            for col_idx, col_def in enumerate(cls.TEMPLATE_COLUMNS, start=1):
                col_key = str(col_def.get('id', ''))
                val = sample.get(col_key, '')
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = Font(name='Arial', size=10, color='334155', italic=True)
                cell.fill = sample_fill if row_idx % 2 == 1 else alt_sample_fill
                cell.alignment = right_align if isinstance(val, str) and not val.startswith('20') else center_align
                cell.border = thin_border

        # --- الورقة الثانية: دليل الخيارات والصفوف والمراحل المتاحة بالمستأجر ---
        ws_guide = wb.create_sheet(title='دليل الخيارات والصفوف المتاحة')
        ws_guide.sheet_view.rightToLeft = True

        # ترويسة جدول الصفوف المتاحة (A إلى D)
        ws_guide.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)
        g_title = ws_guide.cell(row=1, column=1, value='دليل خيارات الصفوف والشعب المعتمدة في مدرستك')
        g_title.font = Font(name='Arial', size=12, bold=True, color='134E4A')
        g_title.alignment = center_align

        guide_headers = ['الصف الدراسي المتاح', 'رمز الصف', 'الشعب والفصول التابعة', 'المرحلة التابع لها']
        for c_idx, h in enumerate(guide_headers, start=1):
            c = ws_guide.cell(row=3, column=c_idx, value=h)
            c.font = Font(name='Arial', size=10.5, bold=True, color='FFFFFF')
            c.fill = primary_teal
            c.alignment = center_align
            c.border = thin_border
            ws_guide.column_dimensions[get_column_letter(c_idx)].width = 24

        # ترويسة جدول المراحل الدراسية المعتمدة (F إلى H)
        ws_guide.merge_cells(start_row=1, start_column=6, end_row=1, end_column=8)
        s_title = ws_guide.cell(row=1, column=6, value='دليل المراحل الدراسية المعتمدة في مدرستك')
        s_title.font = Font(name='Arial', size=12, bold=True, color='134E4A')
        s_title.alignment = center_align

        stage_headers = ['المرحلة الدراسية المعتمدة', 'رمز المرحلة', 'نظام التقييم ونسبة النجاح']
        for s_idx, sh in enumerate(stage_headers, start=6):
            c = ws_guide.cell(row=3, column=s_idx, value=sh)
            c.font = Font(name='Arial', size=10.5, bold=True, color='FFFFFF')
            c.fill = primary_teal
            c.alignment = center_align
            c.border = thin_border
            ws_guide.column_dimensions[get_column_letter(s_idx)].width = 25

        # تعبئة الصفوف والشعب الحالية للمستأجر
        r_counter = 4
        grades_count = 0
        if grades_qs:
            for g in grades_qs:
                sections_list = [s.name for s in g.sections.filter(deleted_at__isnull=True)]
                sections_str = '، '.join(sections_list) if sections_list else 'عام'
                stage_name = g.stage.name if g.stage else '—'

                ws_guide.cell(row=r_counter, column=1, value=g.name).alignment = right_align
                ws_guide.cell(row=r_counter, column=2, value=g.code).alignment = center_align
                ws_guide.cell(row=r_counter, column=3, value=sections_str).alignment = right_align
                ws_guide.cell(row=r_counter, column=4, value=stage_name).alignment = center_align

                for c_idx in range(1, 5):
                    ws_guide.cell(row=r_counter, column=c_idx).font = Font(name='Arial', size=10)
                    ws_guide.cell(row=r_counter, column=c_idx).border = thin_border
                r_counter += 1
                grades_count += 1
        else:
            ws_guide.cell(row=4, column=1, value='لم يتم تعريف صفوف بعد، يرجى تهيئة المراحل والصفوف.').alignment = right_align

        # تعبئة المراحل الدراسية الحالية للمستأجر
        stg_counter = 4
        stages_count = 0
        if stages_qs:
            for stg in stages_qs:
                is_kg = bool(stg.name and 'روض' in stg.name)
                if is_kg:
                    eval_system = 'مرحلة رياض أطفال (تقييم وصفي)'
                else:
                    eval_system = f'سن القبول: {stg.minimum_age} - {stg.maximum_age} سنة'

                ws_guide.cell(row=stg_counter, column=6, value=stg.name).alignment = right_align
                ws_guide.cell(row=stg_counter, column=7, value=stg.code).alignment = center_align
                ws_guide.cell(row=stg_counter, column=8, value=eval_system).alignment = center_align

                for c_idx in range(6, 9):
                    ws_guide.cell(row=stg_counter, column=c_idx).font = Font(name='Arial', size=10)
                    ws_guide.cell(row=stg_counter, column=c_idx).border = thin_border
                stg_counter += 1
                stages_count += 1

        # إضافة جدول القيم المسموح بها في الأعمدة الحصرية
        tbl_row = max(r_counter, stg_counter) + 2
        ws_guide.cell(row=tbl_row, column=1, value='الحقل').font = Font(bold=True)
        ws_guide.cell(row=tbl_row, column=2, value='القيم المقبولة المدعومة').font = Font(bold=True)
        for ci in range(1, 3):
            ws_guide.cell(row=tbl_row, column=ci).fill = PatternFill('solid', fgColor='E2E8F0')
            ws_guide.cell(row=tbl_row, column=ci).border = thin_border
        tbl_row += 1

        allowed_values = [
            ('الجنس', 'ذكر أو أنثى'),
            ('تاريخ الميلاد', 'صيغة تاريخ قياسية مثل: 2015-05-14 أو 14/05/2015'),
            ('المرحلة الدراسية', 'المراحل المعتمدة بالمدرسة الموضحة في الجدول أعلاه'),
            ('الصف الدراسي', 'الصفوف المعتمدة بالمدرسة الموضحة في الجدول أعلاه'),
            ('صلة القرابة', 'أب، أم، ولي أمر، كفيل، شقيق'),
            ('فصيلة الدم', 'O+, O-, A+, A-, B+, B-, AB+, AB-'),
            ('رقم هاتف ولي الأمر', 'رقم سوداني (يبدأ بـ 09 أو 01 ويتكون من 10 أرقام)'),
            ('نوع القيد', 'جديد أو تجديد تسجيل'),
        ]
        for field, vals in allowed_values:
            ws_guide.cell(row=tbl_row, column=1, value=field).border = thin_border
            ws_guide.cell(row=tbl_row, column=2, value=vals).border = thin_border
            tbl_row += 1

        # --- تطبيق القوائم المنسدلة (Data Validation) لمنع الإدخال الخاطئ نهائياً ---
        # 1. الجنس (العمود C)
        dv_gender = DataValidation(
            type="list",
            formula1='"ذكر,أنثى"',
            allow_blank=True,
            promptTitle="تحديد الجنس",
            prompt="يرجى اختيار الجنس (ذكر / أنثى) من القائمة المنسدلة.",
            errorTitle="قيمة غير صالحة",
            error="يرجى اختيار قيمة صحيحة للجنس (ذكر أو أنثى) من القائمة المنسدلة."
        )
        ws.add_data_validation(dv_gender)
        dv_gender.add("C5:C1000")

        # 2. الجنسية (العمود F)
        dv_nationality = DataValidation(
            type="list",
            formula1='"سوداني,أخرى"',
            allow_blank=True,
            promptTitle="الجنسية",
            prompt="يرجى اختيار الجنسية من القائمة.",
            errorTitle="قيمة غير صالحة",
            error="يرجى اختيار الجنسية من القائمة المنسدلة."
        )
        ws.add_data_validation(dv_nationality)
        dv_nationality.add("F5:F1000")

        # 3. الديانة (العمود G)
        dv_religion = DataValidation(
            type="list",
            formula1='"مسلم,مسيحي"',
            allow_blank=True,
            promptTitle="الديانة",
            prompt="يرجى اختيار الديانة من القائمة.",
            errorTitle="قيمة غير صالحة",
            error="يرجى اختيار الديانة (مسلم أو مسيحي) من القائمة."
        )
        ws.add_data_validation(dv_religion)
        dv_religion.add("G5:G1000")

        # 4. فصيلة الدم (العمود H)
        dv_blood = DataValidation(
            type="list",
            formula1='"O+,A+,B+,AB+,O-,A-,B-,AB-"',
            allow_blank=True,
            promptTitle="فصيلة الدم",
            prompt="يرجى اختيار فصيلة دم الطالب.",
            errorTitle="قيمة غير صالحة",
            error="يرجى اختيار إحدى فصائل الدم المعيارية (O+, A+, B+, AB+, إلخ)."
        )
        ws.add_data_validation(dv_blood)
        dv_blood.add("H5:H1000")

        # 5. المرحلة الدراسية (العمود I)
        if stages_count > 0:
            stage_formula = f"='دليل الخيارات والصفوف المتاحة'!$F$4:$F${3 + stages_count}"
            dv_stage = DataValidation(
                type="list",
                formula1=stage_formula,
                allow_blank=True,
                promptTitle="المرحلة الدراسية",
                prompt="يرجى اختيار المرحلة الدراسية المعتمدة من القائمة المنسدلة.",
                errorTitle="مرحلة غير معتمدة",
                error="يرجى اختيار إحدى المراحل الدراسية المعتمدة بمدرستك من القائمة."
            )
            ws.add_data_validation(dv_stage)
            dv_stage.add("I5:I1000")

        # 6. الصف الدراسي (العمود J)
        if grades_count > 0:
            grade_formula = f"='دليل الخيارات والصفوف المتاحة'!$A$4:$A${3 + grades_count}"
            dv_grade = DataValidation(
                type="list",
                formula1=grade_formula,
                allow_blank=True,
                promptTitle="الصف الدراسي",
                prompt="يرجى اختيار الصف الدراسي المعتمد من القائمة المنسدلة.",
                errorTitle="صف غير معتمد",
                error="يرجى اختيار أحد الصفوف الدراسية المعتمدة بالمدرسة من القائمة المنسدلة."
            )
            ws.add_data_validation(dv_grade)
            dv_grade.add("J5:J1000")

        # 7. صلة القرابة (العمود M)
        dv_relation = DataValidation(
            type="list",
            formula1='"أب,أم,ولي أمر,كفيل,شقيق"',
            allow_blank=True,
            promptTitle="صلة القرابة",
            prompt="يرجى اختيار صلة القرابة بولي الأمر.",
            errorTitle="صلة قرابة غير صالحة",
            error="يرجى اختيار صلة القرابة من القائمة المنسدلة."
        )
        ws.add_data_validation(dv_relation)
        dv_relation.add("M5:M1000")

        # 8. نوع القيد والتسجيل (العمود W)
        dv_enrollment = DataValidation(
            type="list",
            formula1='"جديد,تجديد تسجيل"',
            allow_blank=True,
            promptTitle="نوع القيد",
            prompt="يرجى اختيار نوع قيد الطالب (جديد أو تجديد تسجيل).",
            errorTitle="قيمة غير صالحة",
            error="يرجى اختيار نوع القيد من القائمة المنسدلة."
        )
        ws.add_data_validation(dv_enrollment)
        dv_enrollment.add("W5:W1000")

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @classmethod
    def parse_uploaded_file(cls, uploaded_file) -> list:
        """
        قراءة الملف المرفوع سواء كان .xlsx أو .xls أو .csv وتحويله إلى قائمة قواميس منظمة.
        """
        filename = getattr(uploaded_file, 'name', 'template.xlsx').lower()
        rows = []

        if filename.endswith('.csv'):
            csv_text = io.TextIOWrapper(uploaded_file.file, encoding='utf-8-sig', errors='replace')
            reader = csv.DictReader(csv_text)
            for r in reader:
                rows.append({k.strip(): (v.strip() if v else '') for k, v in r.items() if k})
        else:
            # استخدام openpyxl لقراءة الإكسل
            import openpyxl  # type: ignore
            wb = openpyxl.load_workbook(uploaded_file, data_only=True)
            ws = wb.active
            if ws is None and wb.worksheets:
                ws = wb.worksheets[0]
            if ws is None:
                raise BusinessException("لا توجد ورقة عمل صالحة داخل ملف الإكسل المرفوع.")

            header_row_idx = None
            headers = []

            for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
                clean_vals = [str(c).strip() if c is not None else '' for c in row]
                # البحث عن سطر الترويسة الذي يحتوي على اسم الطالب أو الاسم
                if any('اسم الطالب' in val or 'الاسم' in val for val in clean_vals):
                    header_row_idx = r_idx
                    headers = clean_vals
                    break

            if not headers:
                # محاولة استخدام أول سطر غير فارغ كترويسة
                for r_idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
                    clean_vals = [str(c).strip() if c is not None else '' for c in row]
                    if any(clean_vals):
                        header_row_idx = r_idx
                        headers = clean_vals
                        break

            if not headers or header_row_idx is None:
                raise BusinessException("لم يتم العثور على ترويسة صالحة داخل ملف الإكسل المرفوع.")

            # قراءة البيانات بعد الترويسة
            for r_idx, row in enumerate(ws.iter_rows(min_row=header_row_idx + 1, values_only=True), start=header_row_idx + 1):
                clean_vals = [c if c is not None else '' for c in row]
                if not any(str(c).strip() for c in clean_vals):
                    continue # تخطي الأسطر الفارغة بالكامل

                # مطابقة القيم مع الترويسة
                row_dict = {}
                for h_idx, h_name in enumerate(headers):
                    if h_idx < len(clean_vals) and h_name:
                        val = clean_vals[h_idx]
                        if isinstance(val, (datetime.date, datetime.datetime)):
                            val = val.strftime('%Y-%m-%d')
                        elif isinstance(val, float) and val.is_integer():
                            val = str(int(val))
                        else:
                            val = str(val).strip()
                        row_dict[h_name] = val
                row_dict['_row_number'] = r_idx
                rows.append(row_dict)

        return rows

    @classmethod
    def _normalize_row_keys(cls, raw_row: dict) -> dict:
        """
        مطابقة مسميات الأعمدة المتنوعة إلى المفاتيح البرمجية الثابتة.
        """
        mapping = {
            'arabic_name': ['اسم الطالب رباعي', 'اسم الطالب', 'الاسم بالعربي', 'الاسم', 'arabic_name'],
            'english_name': ['اسم الطالب بالإنجليزية', 'الاسم بالإنجليزي', 'english_name'],
            'gender': ['الجنس', 'النوع', 'gender'],
            'date_of_birth': ['تاريخ الميلاد', 'الميلاد', 'date_of_birth', 'dob'],
            'national_id': ['الرقم الوطني', 'شهادة الميلاد', 'الهوية', 'national_id'],
            'nationality': ['الجنسية', 'nationality'],
            'religion': ['الديانة', 'religion'],
            'blood_group': ['فصيلة الدم', 'الفصيلة', 'blood_group'],
            'stage_name': ['المرحلة الدراسية', 'المرحلة التعليمية', 'المرحلة', 'اسم المرحلة', 'stage_name', 'stage'],
            'grade_name': ['الصف الدراسي', 'اسم الصف', 'الصف', 'grade_name', 'grade'],
            'section_name': ['الفصل', 'الشعبة', 'اسم الفصل', 'الفصل / الشعبة', 'section_name', 'section'],
            'guardian_name': ['اسم ولي الأمر رباعي', 'اسم ولي الأمر', 'ولي الأمر', 'guardian_name'],
            'guardian_relation': ['صلة القرابة', 'الصلة', 'القرابة', 'guardian_relation'],
            'guardian_phone': ['رقم هاتف ولي الأمر', 'هاتف ولي الأمر', 'رقم الهاتف', 'الهاتف', 'الموبايل', 'guardian_phone'],
            'guardian_email': ['البريد الإلكتروني لولي الأمر', 'بريد ولي الأمر', 'guardian_email'],
            'guardian_job': ['مهنة ولي الأمر', 'وظيفة ولي الأمر', 'guardian_job'],
            'medical_notes': ['ملاحظات طبية أو حساسية', 'الملاحظات الطبية', 'الحساسية', 'medical_notes'],
            'address': ['العنوان / السكن', 'العنوان', 'السكن', 'address'],
            'total_fees': ['الرسوم المدرسية (ج.س)', 'الرسوم المدرسية', 'الرسوم', 'رسوم', 'المبلغ الإجمالي', 'total_fees', 'fees'],
            'paid_amount': ['المدفوع (ج.س)', 'المبلغ المدفوع', 'المدفوع', 'المسدد', 'الدفعة الأولى', 'paid_amount', 'paid'],
            'remaining_amount': ['المتبقي (ج.س)', 'المبلغ المتبقي', 'المتبقي', 'الباقي', 'remaining_amount', 'remaining'],
            'receipt_number': ['رقم الإيصال / السند', 'رقم الإيصال', 'رقم الايصال', 'رقم السند', 'سند القبض', 'receipt_number', 'receipt_no'],
            'enrollment_type': ['نوع القيد (جديد / تجديد تسجيل)', 'نوع القيد', 'القيد', 'نوع التسجيل', 'التسجيل', 'enrollment_type'],
            'documents_status': ['المستندات المستلمة', 'المستندات', 'الأوراق', 'الملف', 'documents_status', 'documents'],
            'finance_notes': ['ملاحظات الأقساط والتسجيل', 'ملاحظات الأقساط', 'الأقساط', 'ملاحظات التسجيل', 'finance_notes', 'notes'],
        }

        normalized = {'_row_number': raw_row.get('_row_number', 0)}
        for standard_key, aliases in mapping.items():
            found = ''
            for raw_k, raw_v in raw_row.items():
                if raw_k == '_row_number':
                    continue
                clean_k = str(raw_k).strip()
                if any(clean_k.startswith(alias) or alias in clean_k for alias in aliases):
                    found = str(raw_v).strip()
                    break
            normalized[standard_key] = found

        return normalized

    @staticmethod
    def _normalize_arabic(text: str) -> str:
        """
        تطبيع النصوص العربية لتوحيد الهمزات والألف والياء والتاء المربوطة والمسافات الزائدة
        لضمان دقة المطابقة وتجنب رفض المدخلات بسبب اختلافات كتابة الألف (أ / إ / آ / ا) أو (ى / ي) أو (ة / ه).
        """
        if not text:
            return ""
        t = text.strip().lower()
        # إزالة التشكيل
        t = re.sub(r'[\u064B-\u065F\u0670]', '', t)
        # توحيد الألفات
        t = re.sub(r'[إأآا]', 'ا', t)
        # توحيد الياء والألف المقصورة
        t = re.sub(r'[ىي]', 'ي', t)
        # توحيد التاء المربوطة والهاء في نهايات الكلمات
        t = re.sub(r'ة\b', 'ه', t)
        # إزالة المسافات المكررة
        t = re.sub(r'\s+', ' ', t).strip()
        return t

    @classmethod
    def _match_grade(cls, input_grade_name: str, grades_dict: dict, input_stage_name: str = ''):
        """
        مطابقة ذكية للصف الدراسي بين ما أدخله المستخدم والصفوف المسجلة بالمستأجر.
        يدعم التصفية بالمرحلة الدراسية لتفادي تشابه أسماء الصفوف، المطابقة الدقيقة،
        التطبيع العربي، وتجريد "الـ" التعريفية.
        """
        if not input_grade_name or not grades_dict:
            return None

        # 1. إذا تم تحديد مرحلة، حاول أولاً البحث ضمن صفوف هذه المرحلة لتفادي تشابه الأسماء
        if input_stage_name:
            norm_stg = cls._normalize_arabic(input_stage_name)
            stg_filtered_dict = {
                k: g for k, g in grades_dict.items()
                if g.stage and (
                    cls._normalize_arabic(g.stage.name) == norm_stg or
                    norm_stg in cls._normalize_arabic(g.stage.name) or
                    cls._normalize_arabic(g.stage.name) in norm_stg
                )
            }
            if stg_filtered_dict:
                matched = cls._match_grade_internal(input_grade_name, stg_filtered_dict)
                if matched:
                    return matched

        # 2. البحث في كافة الصفوف
        return cls._match_grade_internal(input_grade_name, grades_dict)

    @classmethod
    def _match_grade_internal(cls, input_grade_name: str, grades_dict: dict):
        raw = input_grade_name.strip()
        if raw in grades_dict:
            return grades_dict[raw]

        norm_input = cls._normalize_arabic(raw)

        # 1. مطابقة بعد التطبيع المباشر
        for g_name, g_obj in grades_dict.items():
            if cls._normalize_arabic(g_name) == norm_input:
                return g_obj

        # 2. تفكيك الكلمات ومقارنة المعنى بعد تجريد "ال" التعريف
        def clean_tokens(text):
            tokens = cls._normalize_arabic(text).split()
            cleaned = []
            for tok in tokens:
                if tok.startswith('ال') and len(tok) > 2:
                    tok = tok[2:]
                cleaned.append(tok)
            return sorted(cleaned)

        input_tokens = clean_tokens(raw)
        for g_name, g_obj in grades_dict.items():
            g_tokens = clean_tokens(g_name)
            if input_tokens == g_tokens:
                return g_obj
            # فحص إذا كانت جميع كلمات أحدهما موجودة بالكامل في الآخر
            if all(t in g_tokens for t in input_tokens) or all(t in input_tokens for t in g_tokens):
                return g_obj

        return None

    @classmethod
    def validate_and_preview(cls, uploaded_file, tenant_id: uuid.UUID) -> dict:
        """
        فحص ملف الإكسل سطر بسطر في الذاكرة دون حفظه، وإرجاع تقرير تفصيلي بالصفوف الصالحة والأخطاء.
        """
        raw_rows = cls.parse_uploaded_file(uploaded_file)
        if not raw_rows:
            return {
                'total_rows': 0,
                'valid_count': 0,
                'error_count': 0,
                'rows': [],
                'errors_summary': ['الملف المرفوع فارغ ولا يحتوي على أي بيانات للطلاب.']
            }

        # جلب الطلاب والصفوف والشعب المتاحة للتحقق السريع ومنع التكرار
        existing_grades = {g.name.strip(): g for g in Grade.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).select_related('stage')}
        
        existing_profiles = StudentProfile.objects.filter(
            tenant_id=tenant_id, student__deleted_at__isnull=True
        ).values('arabic_name', 'national_id', 'student__student_number')

        existing_national_ids = {
            str(p['national_id']).strip(): p['student__student_number']
            for p in existing_profiles if p.get('national_id')
        }
        existing_names = {
            cls._normalize_arabic(p['arabic_name']): (p['arabic_name'], p['student__student_number'])
            for p in existing_profiles if p.get('arabic_name')
        }

        analyzed_rows = []
        valid_count = 0
        error_count = 0
        file_national_ids = set()
        file_names = set()

        # أرقام الهواتف السودانية تبدأ بـ 09 أو 01 وتتكون من 10 أرقام (أو 9 بدون الصفر)
        sudan_phone_regex = re.compile(r'^(0?(9|1)[0-9]{8})$')

        for idx, raw in enumerate(raw_rows, start=1):
            row = cls._normalize_row_keys(raw)
            row_num = row['_row_number'] or (idx + 4)
            row_errors = []
            row_warnings = []

            # 1. فحص الاسم العربي ومنع التكرار بالاسم
            name = row.get('arabic_name', '')
            if not name:
                row_errors.append("اسم الطالب رباعي إلزامي.")
            else:
                norm_name = cls._normalize_arabic(name)
                if norm_name in existing_names:
                    orig_name, std_num = existing_names[norm_name]
                    row_errors.append(f"الطالب «{orig_name}» مسجل مسبقاً في النظام بالرقم الأكاديمي ({std_num}). تم الرفض لتفادي التكرار.")
                elif norm_name in file_names:
                    row_errors.append(f"اسم الطالب «{name}» مكرر أكثر من مرة في نفس ملف الكشف.")
                else:
                    file_names.add(norm_name)

                if len(name.split()) < 2:
                    row_warnings.append("يُفضل كتابة الاسم كاملاً (ثلاثي أو رباعي).")

            # 2. فحص الجنس مع التطبيع الذكي (يقبل أنثى، انثى، أنثي، ذكر، ولد، إلخ)
            gender_raw = row.get('gender', '').strip()
            norm_gender = cls._normalize_arabic(gender_raw)
            if not gender_raw:
                row_errors.append("حقل الجنس إلزامي (ذكر أو أنثى).")
            elif norm_gender in ['ذكر', 'ولد', 'بنين', 'male', 'm']:
                row['gender'] = 'male'
                row['gender_label'] = 'ذكر'
            elif norm_gender in ['انثي', 'انثى', 'بنت', 'بنات', 'female', 'f']:
                row['gender'] = 'female'
                row['gender_label'] = 'أنثى'
            else:
                row_errors.append(f"قيمة الجنس «{gender_raw}» غير صالحة. يرجى اختيار (ذكر / أنثى).")

            # 3. فحص تاريخ الميلاد
            dob_str = row.get('date_of_birth', '')
            parsed_dob = None
            if not dob_str:
                row_errors.append("تاريخ الميلاد إلزامي.")
            else:
                # محاولة فك الصيغ المختلفة للتاريخ
                for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d', '%d-%m-%Y', '%m/%d/%Y'):
                    try:
                        parsed_dob = datetime.datetime.strptime(dob_str.split('T')[0], fmt).date()
                        break
                    except (ValueError, IndexError):
                        continue
            if not parsed_dob:
                row_errors.append(f"صيغة تاريخ الميلاد «{dob_str}» غير صالحة (الصيغة المطلوبة: YYYY-MM-DD).")
            else:
                age_years = (datetime.date.today() - parsed_dob).days // 365
                if age_years < 3 or age_years > 25:
                    row_warnings.append(f"عمر الطالب المقدر ({age_years} سنة) قد يكون خارج النطاق المدرسي المعتاد.")
                row['date_of_birth'] = parsed_dob.strftime('%Y-%m-%d')

            # 4. فحص الرقم الوطني ومنع التكرار بالرقم الوطني
            nat_id = str(row.get('national_id', '')).strip()
            if nat_id:
                if nat_id in existing_national_ids:
                    std_num = existing_national_ids[nat_id]
                    row_errors.append(f"الرقم الوطني «{nat_id}» مسجل مسبقاً لطالب آخر ({std_num}) في النظام.")
                elif nat_id in file_national_ids:
                    row_errors.append(f"الرقم الوطني «{nat_id}» مكرر أكثر من مرة في نفس الملف.")
                else:
                    file_national_ids.add(nat_id)

            # 5. فحص ولي الأمر وصلة القرابة
            g_name = row.get('guardian_name', '')
            if not g_name:
                row_errors.append("اسم ولي الأمر إلزامي.")

            g_rel = row.get('guardian_relation', '').strip()
            norm_rel = cls._normalize_arabic(g_rel)
            if not g_rel:
                row['guardian_relation'] = 'أب' # افتراضي
                row['guardian_relation_code'] = 'father'
            else:
                if norm_rel in ['اب', 'والد', 'father']:
                    row['guardian_relation_code'] = 'father'
                elif norm_rel in ['ام', 'والده', 'mother']:
                    row['guardian_relation_code'] = 'mother'
                elif norm_rel in ['ولي امر', 'وصي', 'كفيل', 'guardian', 'sponsor']:
                    row['guardian_relation_code'] = 'guardian'
                elif norm_rel in ['اخ', 'شقيق', 'brother', 'sibling']:
                    row['guardian_relation_code'] = 'sibling'
                else:
                    row['guardian_relation_code'] = 'guardian'

            # 6. فحص هاتف ولي الأمر (سياق سوداني)
            g_phone = row.get('guardian_phone', '').strip().replace(' ', '').replace('-', '')
            if not g_phone:
                row_errors.append("رقم هاتف ولي الأمر إلزامي للتواصل والإشعارات.")
            else:
                # إزالة مفتاح السودان إن وجد +249 أو 00249
                clean_phone = re.sub(r'^(\+249|00249)', '0', g_phone)
                if not sudan_phone_regex.match(clean_phone):
                    row_warnings.append(f"رقم الهاتف «{g_phone}» قد لا يطابق شبكات الاتصال السودانية (09/01).")
                row['guardian_phone'] = clean_phone

            # 7. فحص ومطابقة الصف الدراسي والمرحلة بذكاء
            stage_name = row.get('stage_name', '').strip()
            grade_name = row.get('grade_name', '').strip()
            if not grade_name:
                row_errors.append("الصف الدراسي إلزامي لتسكين الطالب.")
            elif existing_grades:
                matching_grade = cls._match_grade(grade_name, existing_grades, input_stage_name=stage_name)
                if matching_grade:
                    row['matched_grade_id'] = str(matching_grade.id)
                    row['matched_grade_name'] = matching_grade.name
                    row['matched_stage_name'] = matching_grade.stage.name if matching_grade.stage else ''
                    if stage_name and matching_grade.stage:
                        norm_input_stg = cls._normalize_arabic(stage_name)
                        norm_actual_stg = cls._normalize_arabic(matching_grade.stage.name)
                        if norm_input_stg != norm_actual_stg and norm_input_stg not in norm_actual_stg and norm_actual_stg not in norm_input_stg:
                            row_warnings.append(f"الصف «{matching_grade.name}» يتبع لمرحلة «{matching_grade.stage.name}» بينما تم تحديد «{stage_name}».")
                else:
                    row_warnings.append(f"لم يتم العثور على صف مطابق تماماً لـ «{grade_name}» في المدرسة.")

            # 8. استخراج وتدقيق البيانات المالية والتسجيلية والأقساط
            raw_fees = str(row.get('total_fees', '')).replace(',', '').strip()
            try:
                total_fees = float(raw_fees) if raw_fees else 0.0
            except ValueError:
                total_fees = 0.0
            row['total_fees'] = total_fees

            raw_paid = str(row.get('paid_amount', '')).replace(',', '').strip()
            try:
                paid_amount = float(raw_paid) if raw_paid else 0.0
            except ValueError:
                paid_amount = 0.0
            row['paid_amount'] = paid_amount

            raw_rem = str(row.get('remaining_amount', '')).replace(',', '').strip()
            try:
                remaining_amount = float(raw_rem) if raw_rem else max(0.0, total_fees - paid_amount)
            except ValueError:
                remaining_amount = max(0.0, total_fees - paid_amount)
            row['remaining_amount'] = remaining_amount

            row['receipt_number'] = str(row.get('receipt_number', '')).strip()

            raw_enr_type = cls._normalize_arabic(str(row.get('enrollment_type', '')))
            if 'تجديد' in raw_enr_type or 'returning' in raw_enr_type:
                row['enrollment_type'] = 'returning'
                row['enrollment_type_label'] = 'تجديد تسجيل'
            else:
                row['enrollment_type'] = 'new'
                row['enrollment_type_label'] = 'جديد'

            row['documents_status'] = str(row.get('documents_status', '')).strip()
            row['finance_notes'] = str(row.get('finance_notes', '')).strip()

            # الجنسية الافتراضية
            if not row.get('nationality'):
                row['nationality'] = 'سوداني'

            is_valid = len(row_errors) == 0
            if is_valid:
                valid_count += 1
            else:
                error_count += 1

            analyzed_rows.append({
                'row_number': row_num,
                'data': row,
                'is_valid': is_valid,
                'errors': row_errors,
                'warnings': row_warnings,
            })

        return {
            'total_rows': len(analyzed_rows),
            'valid_count': valid_count,
            'error_count': error_count,
            'rows': analyzed_rows
        }

    @classmethod
    def execute_bulk_import(cls, rows_data: list, tenant_id: uuid.UUID, user_id: uuid.UUID, academic_year_id: uuid.UUID | None = None) -> dict:
        """
        تنفيذ استيراد الطلاب الفعلي وحفظهم في قاعدة البيانات داخل معاملة ذرية.
        يتم التحقق من حدود خطة الاشتراك وحفظ الكيانات المتصلة وتسكين الطلاب.
        """
        if not rows_data:
            raise BusinessException("لا توجد بيانات طلاب صالحة للاستيراد.")

        # 1. فحص حد الطلاب المتاح لخطة اشتراك المستأجر
        cls._enforce_plan_limit_for_batch(tenant_id, len(rows_data))

        # 2. تحديد العام الأكاديمي الحالي إن لم يتم تمريره
        if not academic_year_id:
            active_year = AcademicYear.objects.filter(
                tenant_id=tenant_id, current_flag=True, deleted_at__isnull=True
            ).first() or AcademicYear.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).first()
            if active_year:
                academic_year_id = active_year.id

        # كاش الفصول والصفوف لتقليل الاستعلامات
        grades_map = {str(g.id): g for g in Grade.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).select_related('stage')}
        grades_by_name = {g.name.strip(): g for g in grades_map.values()}
        sections_map = {str(s.id): s for s in Section.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)}
        sections_by_name = {s.name.strip(): s for s in sections_map.values()}

        # كاش الفروع وطرق الدفع وخطط الأقساط مسبقاً لمنع استنزاف زمن الاتصال السحابي بـ Neon
        from apps.finance.domain.models import PaymentMethod
        default_plan = InstallmentPlan.objects.filter(tenant_id=tenant_id, is_active=True).first()
        if not default_plan:
            try:
                default_plan = InstallmentPlan.objects.create(
                    tenant_id=tenant_id,
                    name='خطة الأقساط المعتمدة',
                    number_of_installments=1,
                    grace_period_days=7,
                    is_active=True,
                    created_by=user_id
                )
            except Exception:
                default_plan = InstallmentPlan.objects.filter(tenant_id=tenant_id).first()

        pm = PaymentMethod.objects.filter(tenant_id=tenant_id, name_ar__icontains='بنكك').first() or PaymentMethod.objects.filter(tenant_id=tenant_id).first()
        cached_payment_method_id = pm.id if pm else uuid.uuid4()

        branch_male = resolve_branch_for_gender(tenant_id, 'male')
        branch_female = resolve_branch_for_gender(tenant_id, 'female')

        # جلب الطلاب الحاليين لتفادي التكرار بالاسم والرقم الوطني
        existing_profiles_qs = StudentProfile.objects.filter(
            tenant_id=tenant_id, student__deleted_at__isnull=True
        ).values('arabic_name', 'national_id')
        existing_names_set = {cls._normalize_arabic(p['arabic_name']) for p in existing_profiles_qs if p.get('arabic_name')}
        existing_nat_ids_set = {str(p['national_id']).strip() for p in existing_profiles_qs if p.get('national_id')}

        imported_students = []
        skipped_count = 0
        errors = []

        current_student_count = Student.objects.filter(tenant_id=tenant_id).count()
        base_timestamp = timezone.now().strftime('%y%m%d%H%M')

        for idx, row in enumerate(rows_data, start=1):
            try:
                with typing.cast(typing.Any, transaction.atomic)():
                    row_data = row.get('data', row)
                    arabic_name = row_data.get('arabic_name', '').strip()
                    if not arabic_name:
                        skipped_count += 1
                        continue

                    # فحص منع التكرار بالاسم
                    norm_name = cls._normalize_arabic(arabic_name)
                    if norm_name in existing_names_set:
                        errors.append(f"السطر {idx}: الطالب «{arabic_name}» مسجل مسبقاً في المدرسة، تم تخطيه لمنع التكرار.")
                        skipped_count += 1
                        continue

                    # فحص منع التكرار بالرقم الوطني
                    nat_id_val = str(row_data.get('national_id') or '').strip()
                    if nat_id_val and nat_id_val in existing_nat_ids_set:
                        errors.append(f"السطر {idx}: الرقم الوطني «{nat_id_val}» مسجل مسبقاً لطالب آخر، تم تخطيه لمنع التكرار.")
                        skipped_count += 1
                        continue

                    gender = row_data.get('gender', 'male')
                    if gender not in ['male', 'female']:
                        gender = 'male'

                    dob = row_data.get('date_of_birth') or '2014-01-01'

                    # توليد الرقم الأكاديمي الموحد للطالب
                    current_student_count += 1
                    student_number = StudentNumberGenerator.generate(
                        tenant_id=tenant_id,
                        branch_code="BR",
                        academic_year_code="2026",
                        sequence_num=current_student_count
                    )

                    # إنشاء الكيان الجذري للطالب
                    student = Student.objects.create(
                        student_number=student_number,
                        status='active',
                        tenant_id=tenant_id,
                        created_by=user_id
                    )

                    # دمج العناوين والمستندات وملاحظات الأقساط
                    notes_parts = []
                    if row_data.get('address'):
                        notes_parts.append(f"العنوان: {row_data['address']}")
                    if row_data.get('documents_status'):
                        notes_parts.append(f"المستندات: {row_data['documents_status']}")
                    if row_data.get('finance_notes'):
                        notes_parts.append(f"ملاحظات الأقساط: {row_data['finance_notes']}")
                    profile_notes = " | ".join(notes_parts)

                    # إنشاء الملف الشخصي
                    StudentProfile.objects.create(
                        student=student,
                        arabic_name=arabic_name,
                        english_name=row_data.get('english_name', ''),
                        gender=gender,
                        date_of_birth=dob,
                        nationality=row_data.get('nationality') or 'سوداني',
                        national_id=row_data.get('national_id') or None,
                        religion=row_data.get('religion') or 'مسلم',
                        blood_group=row_data.get('blood_group') or '',
                        notes=profile_notes,
                        tenant_id=tenant_id,
                        created_by=user_id
                    )
                    existing_names_set.add(norm_name)
                    if nat_id_val:
                        existing_nat_ids_set.add(nat_id_val)

                    # إنشاء الملف الطبي وملف العيادة
                    StudentMedicalProfile.objects.create(
                        student=student,
                        tenant_id=tenant_id,
                        created_by=user_id
                    )

                    # إنشاء علاقة ولي الأمر
                    g_name = row_data.get('guardian_name') or f"ولي أمر {arabic_name}"
                    g_phone = row_data.get('guardian_phone') or ''
                    g_rel = row_data.get('guardian_relation_code') or 'father'

                    StudentFamilyRelation.objects.create(
                        student=student,
                        relationship=g_rel,
                        full_name=g_name,
                        phone=g_phone,
                        email=row_data.get('guardian_email') or None,
                        occupation=row_data.get('guardian_job') or None,
                        emergency_contact=True,
                        tenant_id=tenant_id,
                        created_by=user_id
                    )

                    # التسكين الأكاديمي بالصف والشعبة إن وجدا
                    grade_obj = None
                    matched_gid = row_data.get('matched_grade_id')
                    if matched_gid and matched_gid in grades_map:
                        grade_obj = grades_map[matched_gid]
                    elif row_data.get('grade_name'):
                        stg_input = row_data.get('stage_name', '')
                        grade_obj = cls._match_grade(row_data['grade_name'], grades_by_name, input_stage_name=stg_input)

                    section_obj = None
                    sec_name = row_data.get('section_name', '').strip()
                    if sec_name and sec_name in sections_by_name:
                        section_obj = sections_by_name[sec_name]

                    # نوع القيد والتسجيل (جديد / تجديد تسجيل)
                    enr_type = row_data.get('enrollment_type') or 'new'
                    if enr_type not in ['new', 'returning', 'transfer']:
                        enr_type = 'new'

                    if grade_obj and academic_year_id:
                        branch = branch_female if gender == 'female' else branch_male
                        StudentEnrollment.objects.create(
                            tenant_id=tenant_id,
                            student=student,
                            academic_year_id=academic_year_id,
                            grade_id=grade_obj.id,
                            section_id=section_obj.id if section_obj else None,
                            branch_id=branch.id if branch else None,
                            enrollment_date=datetime.date.today(),
                            enrollment_type=enr_type,
                            status='active',
                            created_by=user_id
                        )

                    # الربط المالي الآلي مع موديول مالية الطلاب (Student Finance)
                    try:
                        raw_f = str(row_data.get('total_fees') or 0).replace('-', '0').replace('—', '0').strip()
                        raw_p = str(row_data.get('paid_amount') or 0).replace('-', '0').replace('—', '0').strip()
                        fees_val = Decimal(raw_f or '0')
                        paid_val = Decimal(raw_p or '0')
                        rem_val = Decimal(str(row_data.get('remaining_amount') or max(0, fees_val - paid_val)))
                        rcp_no = str(row_data.get('receipt_number') or '').strip()

                        # 1. فتح أو جلب حساب فوترة الطالب دائماً لضمان توفر كشف الحساب فور الاستيراد
                        billing_acc, _ = StudentBillingAccount.objects.get_or_create(
                            tenant_id=tenant_id,
                            student_id=student.id,
                            defaults={
                                'account_number': f"ACC-ST-{base_timestamp}-{idx:03d}-{student_number[-4:]}",
                                'opening_balance': Decimal('0.0'),
                                'current_balance': rem_val,
                                'outstanding_balance': rem_val,
                                'credit_balance': Decimal('0.0'),
                                'created_by': user_id
                            }
                        )

                        # 2. إنشاء فاتورة الرسوم الدراسية إذا كان هناك رسوم مستحقة
                        if fees_val > 0:
                            candidate_inv = f"INV-{base_timestamp}-{idx:03d}-{student_number[-4:]}"
                            invoice = StudentInvoice.objects.create(
                                tenant_id=tenant_id,
                                student_billing_account=billing_acc,
                                invoice_number=candidate_inv,
                                issue_date=datetime.date.today(),
                                due_date=datetime.date.today() + datetime.timedelta(days=30),
                                status='posted',
                                total_amount=fees_val,
                                paid_amount=paid_val,
                                outstanding_amount=rem_val,
                                created_by=user_id
                            )

                            if default_plan:
                                Installment.objects.create(
                                    tenant_id=tenant_id,
                                    student_billing_account=billing_acc,
                                    invoice=invoice,
                                    installment_plan=default_plan,
                                    due_date=invoice.due_date,
                                    amount=fees_val,
                                    paid_amount=paid_val,
                                    status='paid' if rem_val <= 0 else 'pending',
                                    created_by=user_id
                                )

                        # 3. إنشاء إيصال التحصيل
                        if paid_val > 0:
                            candidate_rcp = rcp_no if rcp_no else f"RCP-{base_timestamp}-{idx:03d}-{student_number[-4:]}"
                            Receipt.objects.create(
                                tenant_id=tenant_id,
                                student_billing_account=billing_acc,
                                receipt_number=candidate_rcp,
                                payment_date=datetime.date.today(),
                                amount=paid_val,
                                payment_method_id=cached_payment_method_id,
                                status='posted',
                                created_by=user_id
                            )

                        # تحديث رصيد حساب الفوترة
                        billing_acc.outstanding_balance = rem_val
                        billing_acc.current_balance = rem_val
                        billing_acc.save(update_fields=['outstanding_balance', 'current_balance'])
                    except Exception as fin_err:
                        import logging
                        logging.getLogger('nebras.students').warning(f"تعذر إتمام الربط المالي للسطر {idx}: {fin_err}")

                    imported_students.append({
                        'id': str(student.id),
                        'student_number': student_number,
                        'name': arabic_name,
                        'grade': grade_obj.name if grade_obj else '—'
                    })

            except Exception as e:
                errors.append(f"السطر {idx}: {str(e)}")

        # نشر حدث مجمع واحد للدفعة كاملة لتجنب استنزاف وقت الاستجابة
        if imported_students:
            try:
                DomainEventPublisher.publish("StudentBulkImportCompleted", {
                    "count": len(imported_students),
                    "tenant_id": str(tenant_id),
                    "user_id": str(user_id)
                })
            except Exception:
                pass

        return {
            'imported_count': len(imported_students),
            'skipped_count': skipped_count,
            'students': imported_students,
            'errors': errors
        }

    @staticmethod
    def _enforce_plan_limit_for_batch(tenant_id: uuid.UUID, new_count: int):
        """فحص سقف خطة الاشتراك للمستأجر قبل استيراد الدفعة كاملة"""
        from apps.saas_billing.application.limits import ensure_can_add, PlanLimitExceeded
        try:
            ensure_can_add(tenant_id, 'students', adding=new_count)
        except PlanLimitExceeded as exc:
            raise BusinessException(
                f"لا يمكن استيراد {new_count} طالب: ستتجاوز الحد الأقصى المسموح به في خطة اشتراك مدرستك. ({str(exc)})",
                code="plan_limit_exceeded"
            )
