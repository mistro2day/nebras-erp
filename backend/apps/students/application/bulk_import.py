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
from apps.academics.domain.models import Grade, Section, AcademicYear
from apps.organization.domain.models import Branch
from apps.students.domain.services import StudentNumberGenerator
from apps.students.domain.events import DomainEventPublisher
from apps.students.application.services import resolve_branch_for_gender, StudentApplicationService
from apps.clinic.application import profile_service as clinic_profiles


class StudentBulkImportService:
    """
    خدمة استيراد كشوفات الطلاب دفعة واحدة وتوليد قوالب الإكسل (.xlsx) الرسمية
    المطابقة للهوية السودانية وأنظمة نبراس التعليمية.
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
        {'id': 'grade_name', 'label': 'الصف الدراسي *', 'required': True, 'width': 22, 'example': 'الصف الأول'},
        {'id': 'section_name', 'label': 'الفصل / الشعبة', 'required': False, 'width': 18, 'example': 'شعبة (أ)'},
        {'id': 'guardian_name', 'label': 'اسم ولي الأمر رباعي *', 'required': True, 'width': 30, 'example': 'دفع الله الفاتح بابكر عثمان'},
        {'id': 'guardian_relation', 'label': 'صلة القرابة * (أب/أم/ولي أمر)', 'required': True, 'width': 24, 'example': 'أب'},
        {'id': 'guardian_phone', 'label': 'رقم هاتف ولي الأمر * (09/01)', 'required': True, 'width': 24, 'example': '0912345678'},
        {'id': 'guardian_email', 'label': 'البريد الإلكتروني لولي الأمر', 'required': False, 'width': 26, 'example': 'dafallah@example.com'},
        {'id': 'guardian_job', 'label': 'مهنة ولي الأمر', 'required': False, 'width': 20, 'example': 'معلم / مهندس'},
        {'id': 'medical_notes', 'label': 'ملاحظات طبية أو حساسية', 'required': False, 'width': 25, 'example': 'سليم / لا توجد'},
        {'id': 'address', 'label': 'العنوان / السكن', 'required': False, 'width': 25, 'example': 'الخرطوم بحري - الصافية'},
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
            'guardian_job': 'طبيب بشري',
            'medical_notes': 'حساسية خفيفة من البنسلين',
            'address': 'أم درمان - المهندسين',
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
        }
    ]

    @classmethod
    def generate_excel_template(cls, tenant_id: uuid.UUID) -> io.BytesIO:
        """
        توليد مصنف إكسل رسمي (.xlsx) متكامل من ورقتين:
        1. كشف الطلاب (مع ترويسة احترافية وتلوين الحقول الإلزامية وبيانات توضيحية سودانية).
        2. دليل الإدخال والخيارات المتاحة (يسرد الصفوف والشعب الحالية بالمدرسة والقيم المقبولة).
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
        primary_teal = PatternFill('solid', fgColor='0F766E') # لون الترويسة الرئيسي
        required_fill = PatternFill('solid', fgColor='134E4A') # ترويسة الحقول الإلزامية
        optional_fill = PatternFill('solid', fgColor='0D9488') # ترويسة الحقول الاختيارية
        sample_fill = PatternFill('solid', fgColor='F8FAFC')
        alt_sample_fill = PatternFill('solid', fgColor='F1F5F9')

        center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
        right_align = Alignment(horizontal='right', vertical='center')

        # عنوان ورئيسية النموذج
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(cls.TEMPLATE_COLUMNS))
        title_cell = ws.cell(row=1, column=1, value='نظام نبراس لإدارة المدارس - نموذج كشف استيراد الطلاب الأكاديمي المعتمد')
        title_cell.font = Font(name='Arial', size=14, bold=True, color='134E4A')
        title_cell.alignment = center_align

        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(cls.TEMPLATE_COLUMNS))
        sub_cell = ws.cell(
            row=2, column=1,
            value='تنبيه: الحقول التي تحتوي علامة (*) إلزامية. يرجى ملء البيانات أو حذف الأسطر التوضيحية الثلاثة الأولى قبل الرفع.'
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

        # تعبئة الأسطر النموذجية التوضيحية (الصفوف 5 و 6 و 7)
        for row_idx, sample in enumerate(cls.SAMPLE_ROWS, start=5):
            for col_idx, col_def in enumerate(cls.TEMPLATE_COLUMNS, start=1):
                col_key = str(col_def.get('id', ''))
                val = sample.get(col_key, '')
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = Font(name='Arial', size=10, color='334155', italic=True)
                cell.fill = sample_fill if row_idx % 2 == 1 else alt_sample_fill
                cell.alignment = right_align if isinstance(val, str) and not val.startswith('20') else center_align
                cell.border = thin_border

        # --- الورقة الثانية: دليل الإدخال والخيارات المتاحة بالمستأجر ---
        ws_guide = wb.create_sheet(title='دليل الخيارات والصفوف المتاحة')
        ws_guide.sheet_view.rightToLeft = True

        ws_guide.merge_cells(start_row=1, start_column=1, end_row=1, end_column=4)
        g_title = ws_guide.cell(row=1, column=1, value='دليل خيارات الصفوف والشعب المعتمدة في مدرستك')
        g_title.font = Font(name='Arial', size=13, bold=True, color='134E4A')
        g_title.alignment = center_align

        guide_headers = ['الصف الدراسي المتاح', 'رمز الصف', 'الشعب والفصول التابعة', 'المرحلة الدراسية']
        for c_idx, h in enumerate(guide_headers, start=1):
            c = ws_guide.cell(row=3, column=c_idx, value=h)
            c.font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
            c.fill = primary_teal
            c.alignment = center_align
            c.border = thin_border
            ws_guide.column_dimensions[get_column_letter(c_idx)].width = 24

        # جلب الصفوف والشعب الحالية للمستأجر
        grades_qs = Grade.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True).prefetch_related('sections', 'stage')
        r_counter = 4
        if grades_qs.exists():
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
        else:
            ws_guide.cell(row=4, column=1, value='لم يتم تعريف صفوف بعد، يرجى تهيئة المرحلة الدراسية أو كتابة الصف في الكشف.').alignment = right_align

        # إضافة جدول القيم المسموح بها في الأعمدة الحصرية
        r_counter += 2
        ws_guide.cell(row=r_counter, column=1, value='الحقل').font = Font(bold=True)
        ws_guide.cell(row=r_counter, column=2, value='القيم المقبولة المدعومة').font = Font(bold=True)
        for ci in range(1, 3):
            ws_guide.cell(row=r_counter, column=ci).fill = PatternFill('solid', fgColor='E2E8F0')
            ws_guide.cell(row=r_counter, column=ci).border = thin_border
        r_counter += 1

        allowed_values = [
            ('الجنس', 'ذكر أو أنثى'),
            ('تاريخ الميلاد', 'صيغة تاريخ قياسية مثل: 2015-05-14 أو 14/05/2015'),
            ('صلة القرابة', 'أب، أم، ولي أمر، كفيل، شقيق'),
            ('فصيلة الدم', 'O+, O-, A+, A-, B+, B-, AB+, AB-'),
            ('رقم هاتف ولي الأمر', 'رقم سوداني (يبدأ بـ 09 أو 01 ويتكون من 10 أرقام)'),
        ]
        for field, vals in allowed_values:
            ws_guide.cell(row=r_counter, column=1, value=field).border = thin_border
            ws_guide.cell(row=r_counter, column=2, value=vals).border = thin_border
            r_counter += 1

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    @classmethod
    def parse_uploaded_file(cls, uploaded_file) -> list:
        """
        قراءة الملف المرفوع سواء كان .xlsx أو .xls أو .csv وتحويله إلى قائمة قواميس منظمة.
        """
        filename = uploaded_file.name.lower()
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
            'grade_name': ['الصف الدراسي', 'الصف', 'المرحلة', 'grade_name', 'grade'],
            'section_name': ['الفصل', 'الشعبة', 'اسم الفصل', 'الفصل / الشعبة', 'section_name', 'section'],
            'guardian_name': ['اسم ولي الأمر رباعي', 'اسم ولي الأمر', 'ولي الأمر', 'guardian_name'],
            'guardian_relation': ['صلة القرابة', 'الصلة', 'القرابة', 'guardian_relation'],
            'guardian_phone': ['رقم هاتف ولي الأمر', 'هاتف ولي الأمر', 'رقم الهاتف', 'الهاتف', 'الموبايل', 'guardian_phone'],
            'guardian_email': ['البريد الإلكتروني لولي الأمر', 'بريد ولي الأمر', 'guardian_email'],
            'guardian_job': ['مهنة ولي الأمر', 'وظيفة ولي الأمر', 'guardian_job'],
            'medical_notes': ['ملاحظات طبية أو حساسية', 'الملاحظات الطبية', 'الحساسية', 'medical_notes'],
            'address': ['العنوان / السكن', 'العنوان', 'السكن', 'address'],
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

        # جلب الصفوف والشعب المتاحة للتحقق السريع
        existing_grades = {g.name.strip(): g for g in Grade.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)}
        existing_national_ids = set(
            StudentProfile.objects.filter(
                tenant_id=tenant_id, national_id__isnull=False
            ).exclude(national_id='').values_list('national_id', flat=True)
        )

        analyzed_rows = []
        valid_count = 0
        error_count = 0
        file_national_ids = set()

        # أرقام الهواتف السودانية تبدأ بـ 09 أو 01 وتتكون من 10 أرقام (أو 9 بدون الصفر)
        sudan_phone_regex = re.compile(r'^(0?(9|1)[0-9]{8})$')

        for idx, raw in enumerate(raw_rows, start=1):
            row = cls._normalize_row_keys(raw)
            row_num = row['_row_number'] or (idx + 4)
            row_errors = []
            row_warnings = []

            # 1. فحص الاسم العربي
            name = row.get('arabic_name', '')
            if not name:
                row_errors.append("اسم الطالب رباعي إلزامي.")
            elif len(name.split()) < 2:
                row_warnings.append("يُفضل كتابة الاسم كاملاً (ثلاثي أو رباعي).")

            # 2. فحص الجنس
            gender_raw = row.get('gender', '').strip().lower()
            if not gender_raw:
                row_errors.append("حقل الجنس إلزامي (ذكر أو أنثى).")
            elif gender_raw in ['ذكر', 'ولد', 'بنين', 'male', 'm']:
                row['gender'] = 'male'
                row['gender_label'] = 'ذكر'
            elif gender_raw in ['أنثى', 'بنت', 'بنات', 'female', 'f']:
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

            # 4. فحص الرقم الوطني
            nat_id = row.get('national_id', '').strip()
            if nat_id:
                if nat_id in existing_national_ids:
                    row_errors.append(f"الرقم الوطني «{nat_id}» مسجل مسبقاً لطالب آخر في النظام.")
                elif nat_id in file_national_ids:
                    row_errors.append(f"الرقم الوطني «{nat_id}» مكرر أكثر من مرة في نفس الملف.")
                else:
                    file_national_ids.add(nat_id)

            # 5. فحص ولي الأمر وصلة القرابة
            g_name = row.get('guardian_name', '')
            if not g_name:
                row_errors.append("اسم ولي الأمر إلزامي.")

            g_rel = row.get('guardian_relation', '').strip()
            if not g_rel:
                row['guardian_relation'] = 'أب' # افتراضي
            else:
                rel_map = {'أب': 'father', 'أم': 'mother', 'ولي أمر': 'guardian', 'كفيل': 'sponsor', 'شقيق': 'sibling'}
                normalized_rel = rel_map.get(g_rel, 'guardian')
                row['guardian_relation_code'] = normalized_rel

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

            # 7. فحص الصف الدراسي
            grade_name = row.get('grade_name', '').strip()
            if grade_name and existing_grades:
                matching_grade = None
                for eg_name, eg_obj in existing_grades.items():
                    if grade_name.lower() == eg_name.lower() or grade_name in eg_name or eg_name in grade_name:
                        matching_grade = eg_obj
                        break
                if matching_grade:
                    row['matched_grade_id'] = str(matching_grade.id)
                    row['matched_grade_name'] = matching_grade.name
                else:
                    row_warnings.append(f"لم يتم العثور على صف مطابق تماماً لـ «{grade_name}» في المدرسة.")

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

        with typing.cast(typing.Any, transaction.atomic)():
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
            grades_map = {str(g.id): g for g in Grade.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)}
            grades_by_name = {g.name.strip(): g for g in grades_map.values()}
            sections_map = {str(s.id): s for s in Section.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)}
            sections_by_name = {s.name.strip(): s for s in sections_map.values()}

            imported_students = []
            skipped_count = 0
            errors = []

            current_student_count = Student.objects.filter(tenant_id=tenant_id).count()

            for idx, row in enumerate(rows_data, start=1):
                try:
                    row_data = row.get('data', row)
                    arabic_name = row_data.get('arabic_name', '').strip()
                    if not arabic_name:
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
                        notes=row_data.get('address') or '',
                        tenant_id=tenant_id,
                        created_by=user_id
                    )

                    # إنشاء الملف الطبي وملف العيادة
                    StudentMedicalProfile.objects.create(
                        student=student,
                        tenant_id=tenant_id,
                        created_by=user_id
                    )
                    if row_data.get('medical_notes'):
                        try:
                            intake_fn = getattr(clinic_profiles, 'write_intake', None)
                            if callable(intake_fn):
                                intake_fn(
                                    tenant_id=tenant_id,
                                    person_type='student',
                                    person_id=student.id,
                                    data={
                                        'medical_notes': row_data.get('medical_notes'),
                                        'blood_group': row_data.get('blood_group'),
                                    },
                                    user_id=user_id
                                )
                        except Exception:
                            pass

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
                    elif row_data.get('grade_name') and row_data['grade_name'].strip() in grades_by_name:
                        grade_obj = grades_by_name[row_data['grade_name'].strip()]

                    section_obj = None
                    sec_name = row_data.get('section_name', '').strip()
                    if sec_name and sec_name in sections_by_name:
                        section_obj = sections_by_name[sec_name]

                    if grade_obj and academic_year_id:
                        branch = resolve_branch_for_gender(tenant_id, gender)
                        StudentEnrollment.objects.create(
                            tenant_id=tenant_id,
                            student=student,
                            academic_year_id=academic_year_id,
                            grade_id=grade_obj.id,
                            section_id=section_obj.id if section_obj else None,
                            branch_id=branch.id if branch else None,
                            enrollment_date=datetime.date.today(),
                            enrollment_type='new',
                            status='active',
                            created_by=user_id
                        )

                    # نشر حدث النظام
                    DomainEventPublisher.publish("StudentCreated", {
                        "student_id": str(student.id),
                        "student_number": student_number,
                        "tenant_id": str(tenant_id)
                    })

                    imported_students.append({
                        'id': str(student.id),
                        'student_number': student_number,
                        'name': arabic_name,
                        'grade': grade_obj.name if grade_obj else '—'
                    })

                except Exception as e:
                    errors.append(f"السطر {idx}: {str(e)}")

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
