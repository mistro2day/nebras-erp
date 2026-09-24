import uuid
import datetime
import io
import re
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
import openpyxl  # type: ignore
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side  # type: ignore
from openpyxl.utils import get_column_letter  # type: ignore
from openpyxl.worksheet.datavalidation import DataValidation  # type: ignore

from apps.employees.domain.models import (
    Employee,
    EmployeeDependent,
    EmployeeReference,
    EmployeePriorExperience,
)


class EmployeeBulkImportService:
    """
    خدمة استيراد كشوفات المعلمين والموظفين دفعة واحدة عبر ملفات الإكسل (.xlsx)
    المطابقة لاستمارة وعقد 2026م مع الهوية السودانية الصارمة واللائحة التنظيمية.
    """

    TEMPLATE_COLUMNS = [
        # المجموعة 1: البيانات الشخصية والسكنية
        {'id': 'full_name_ar', 'group': 'البيانات الشخصية والسكنية', 'label': 'الاسم رباعياً بالعربية *', 'required': True, 'width': 30, 'example': 'عثمان دفع الله الفاتح بابكر'},
        {'id': 'title_surname', 'group': 'البيانات الشخصية والسكنية', 'label': 'اللقب العلمي / الإداري', 'required': False, 'width': 22, 'example': 'أستاذ / خبير تربوي'},
        {'id': 'gender', 'group': 'البيانات الشخصية والسكنية', 'label': 'الجنس * (ذكر / أنثى)', 'required': True, 'width': 18, 'example': 'ذكر'},
        {'id': 'national_id', 'group': 'البيانات الشخصية والسكنية', 'label': 'الرقم الوطني / الهوية', 'required': False, 'width': 22, 'example': '11204987112'},
        {'id': 'marital_status', 'group': 'البيانات الشخصية والسكنية', 'label': 'الحالة الاجتماعية', 'required': False, 'width': 20, 'example': 'متزوج'},
        {'id': 'children_count', 'group': 'البيانات الشخصية والسكنية', 'label': 'عدد الأبناء', 'required': False, 'width': 14, 'example': '2'},
        {'id': 'city', 'group': 'البيانات الشخصية والسكنية', 'label': 'المدينة / الولاية *', 'required': True, 'width': 22, 'example': 'الخرطوم'},
        {'id': 'neighborhood', 'group': 'البيانات الشخصية والسكنية', 'label': 'الحي السكني *', 'required': True, 'width': 22, 'example': 'الرياض'},
        {'id': 'square_number', 'group': 'البيانات الشخصية والسكنية', 'label': 'رقم المربع', 'required': False, 'width': 16, 'example': 'مربع 5'},
        {'id': 'house_number', 'group': 'البيانات الشخصية والسكنية', 'label': 'رقم المنزل', 'required': False, 'width': 16, 'example': 'منزل 12'},
        {'id': 'gatekeeper_name', 'group': 'البيانات الشخصية والسكنية', 'label': 'اسم البواب', 'required': False, 'width': 20, 'example': 'إدريس'},
        {'id': 'prominent_teacher_friend', 'group': 'البيانات الشخصية والسكنية', 'label': 'أقرب معلم بارز صديق بالمدرسة', 'required': False, 'width': 30, 'example': 'أ. الفاتح بابكر'},

        # المجموعة 2: بيانات الاتصال والمعرفين
        {'id': 'phone_1', 'group': 'بيانات الاتصال والمعرفين', 'label': 'الهاتف الأساسي (1) *', 'required': True, 'width': 22, 'example': '0912345678'},
        {'id': 'whatsapp_number', 'group': 'بيانات الاتصال والمعرفين', 'label': 'رقم الواتساب المعتمد *', 'required': True, 'width': 24, 'example': '+249912345678'},
        {'id': 'phone_2', 'group': 'بيانات الاتصال والمعرفين', 'label': 'رقم هاتف ثانٍ (2)', 'required': False, 'width': 20, 'example': '0123456789'},
        {'id': 'emergency_phone_other', 'group': 'بيانات الاتصال والمعرفين', 'label': 'هاتف الطوارئ', 'required': False, 'width': 20, 'example': '0922334455'},
        {'id': 'emergency_kinship', 'group': 'بيانات الاتصال والمعرفين', 'label': 'صلة قرابة الطوارئ', 'required': False, 'width': 20, 'example': 'شقيق'},
        {'id': 'email', 'group': 'بيانات الاتصال والمعرفين', 'label': 'البريد الإلكتروني', 'required': False, 'width': 26, 'example': 'osman.teacher@gmail.com'},
        {'id': 'ref_name', 'group': 'بيانات الاتصال والمعرفين', 'label': 'اسم المعلم المرجع', 'required': False, 'width': 26, 'example': 'نزار المجذوب إبراهيم'},
        {'id': 'ref_phone', 'group': 'بيانات الاتصال والمعرفين', 'label': 'هاتف المعلم المرجع', 'required': False, 'width': 22, 'example': '0911223344'},

        # المجموعة 3: المؤهل والتكليف الأكاديمي والأنصبة
        {'id': 'university_institute', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'الجامعة / المعهد *', 'required': True, 'width': 26, 'example': 'جامعة الخرطوم'},
        {'id': 'faculty', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'الكلية *', 'required': True, 'width': 24, 'example': 'كلية التربية'},
        {'id': 'specialization', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'التخصص الدقيق *', 'required': True, 'width': 24, 'example': 'اللغة العربية'},
        {'id': 'position', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'المسمى الوظيفي', 'required': False, 'width': 22, 'example': 'معلم لغة عربية'},
        {'id': 'department', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'القسم الإداري', 'required': False, 'width': 22, 'example': 'التعليم والإشراف'},
        {'id': 'teaching_subject_1', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'المادة المكلف بها (1) *', 'required': True, 'width': 24, 'example': 'اللغة العربية'},
        {'id': 'teaching_subject_2', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'المادة (2)', 'required': False, 'width': 20, 'example': 'التربية الإسلامية'},
        {'id': 'teaching_subject_3', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'المادة (3)', 'required': False, 'width': 20, 'example': ''},
        {'id': 'weekly_lesson_quota', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'نصاب الحصص الأسبوعي', 'required': False, 'width': 20, 'example': '23'},
        {'id': 'duty_exempt', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'معفى من النوبتجية (نعم/لا)', 'required': False, 'width': 22, 'example': 'نعم'},
        {'id': 'other_tasks_activities', 'group': 'المؤهل والتكليف الأكاديمي', 'label': 'أنشطة ومهام إشرافية', 'required': False, 'width': 26, 'example': 'مشرف الإذاعة المدرسية'},

        # المجموعة 4: الأبناء والتخفيض اللائحي بالمدرسة
        {'id': 'dependent_name', 'group': 'الأبناء والتخفيض اللائحي', 'label': 'اسم الابن/القريب بالمدرسة', 'required': False, 'width': 28, 'example': 'محمد عثمان دفع الله'},
        {'id': 'dependent_relation', 'group': 'الأبناء والتخفيض اللائحي', 'label': 'صلة القرابة (ابن/قريب)', 'required': False, 'width': 22, 'example': 'ابن'},
        {'id': 'dependent_stage_grade', 'group': 'الأبناء والتخفيض اللائحي', 'label': 'المرحلة والصف للابن', 'required': False, 'width': 24, 'example': 'ابتدائي - الصف الثالث'},
        {'id': 'dependent_discount', 'group': 'الأبناء والتخفيض اللائحي', 'label': 'نسبة التخفيض المستحقة %', 'required': False, 'width': 24, 'example': '50'},

        # المجموعة 5: الخبرات المدرسية السابقة
        {'id': 'prior_school_name', 'group': 'الخبرات السابقة', 'label': 'اسم المدرسة السابقة', 'required': False, 'width': 26, 'example': 'مدارس القبس الحديثة'},
        {'id': 'prior_country', 'group': 'الخبرات السابقة', 'label': 'بلد الخبرة (السودان/مصر/أخرى)', 'required': False, 'width': 26, 'example': 'السودان'},
        {'id': 'prior_time_period', 'group': 'الخبرات السابقة', 'label': 'الفترة الزمنية', 'required': False, 'width': 20, 'example': '2020 - 2024'},

        # المجموعة 6: الهيكل المالي وعقد 2026م
        {'id': 'basic_salary', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'الراتب الأساسي (ج.س) *', 'required': True, 'width': 22, 'example': '200000'},
        {'id': 'transport_allowance', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'بدل ترحيل (ج.س)', 'required': False, 'width': 20, 'example': '80000'},
        {'id': 'communication_allowance', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'بدل اتصال وانترنت (ج.س)', 'required': False, 'width': 22, 'example': '40000'},
        {'id': 'representation_allowance', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'بدل تمثيل (ج.س)', 'required': False, 'width': 20, 'example': '30000'},
        {'id': 'deductions', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'الخصومات (ج.س)', 'required': False, 'width': 18, 'example': '0'},
        {'id': 'joining_date', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'تاريخ المباشرة (YYYY-MM-DD)', 'required': False, 'width': 26, 'example': '2026-08-01'},
        {'id': 'contract_start_date', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'تاريخ بداية العقد', 'required': False, 'width': 22, 'example': '2026-08-01'},
        {'id': 'contract_end_date', 'group': 'الهيكل المالي وعقد 2026م', 'label': 'تاريخ نهاية العقد', 'required': False, 'width': 22, 'example': '2027-07-31'},
    ]

    SAMPLE_ROWS = [
        {
            'full_name_ar': 'عثمان دفع الله الفاتح بابكر',
            'title_surname': 'أستاذ خبير',
            'gender': 'ذكر',
            'national_id': '11204987112',
            'marital_status': 'متزوج',
            'children_count': '2',
            'city': 'الخرطوم',
            'neighborhood': 'الرياض',
            'square_number': 'مربع 5',
            'house_number': 'منزل 12',
            'gatekeeper_name': 'إدريس',
            'prominent_teacher_friend': 'أ. الفاتح بابكر',
            'phone_1': '0912345678',
            'whatsapp_number': '+249912345678',
            'phone_2': '0123456789',
            'emergency_phone_other': '0922334455',
            'emergency_kinship': 'شقيق',
            'email': 'osman.dafallah@gmail.com',
            'ref_name': 'نزار المجذوب إبراهيم',
            'ref_phone': '0911223344',
            'university_institute': 'جامعة الخرطوم',
            'faculty': 'كلية التربية',
            'specialization': 'اللغة العربية',
            'position': 'معلم لغة عربية أول',
            'department': 'التعليم والإشراف',
            'teaching_subject_1': 'اللغة العربية',
            'teaching_subject_2': 'التربية الإسلامية',
            'teaching_subject_3': '',
            'weekly_lesson_quota': '23',
            'duty_exempt': 'نعم',
            'other_tasks_activities': 'رئيس شعبة اللغة العربية ومشرف النشاط الثقافي',
            'dependent_name': 'محمد عثمان دفع الله',
            'dependent_relation': 'ابن',
            'dependent_stage_grade': 'المرحلة الابتدائية - الصف الثالث',
            'dependent_discount': '50',
            'prior_school_name': 'مدارس القبس الحديثة',
            'prior_country': 'السودان',
            'prior_time_period': '2019 - 2024',
            'basic_salary': '250000',
            'transport_allowance': '80000',
            'communication_allowance': '40000',
            'representation_allowance': '30000',
            'deductions': '0',
            'joining_date': '2026-08-01',
            'contract_start_date': '2026-08-01',
            'contract_end_date': '2027-07-31',
        },
        {
            'full_name_ar': 'إخلاص ميرغني أحمد البدوي',
            'title_surname': 'أستاذة متميزة',
            'gender': 'أنثى',
            'national_id': '21405891334',
            'marital_status': 'متزوجة',
            'children_count': '1',
            'city': 'أم درمان',
            'neighborhood': 'الملازمين',
            'square_number': 'مربع 3',
            'house_number': 'منزل 44',
            'gatekeeper_name': '',
            'prominent_teacher_friend': 'أ. فاطمة البدوي',
            'phone_1': '0923456781',
            'whatsapp_number': '+249923456781',
            'phone_2': '',
            'emergency_phone_other': '0112345678',
            'emergency_kinship': 'زوج',
            'email': 'ikhlas.merghani@gmail.com',
            'ref_name': 'التاج إبراهيم مصطفى',
            'ref_phone': '0933445566',
            'university_institute': 'جامعة السودان للعلوم والتكنولوجيا',
            'faculty': 'كلية العلوم',
            'specialization': 'الرياضيات والفيزياء',
            'position': 'معلمة رياضيات',
            'department': 'التعليم والإشراف',
            'teaching_subject_1': 'الرياضيات',
            'teaching_subject_2': 'الفيزياء',
            'teaching_subject_3': '',
            'weekly_lesson_quota': '23',
            'duty_exempt': 'نعم',
            'other_tasks_activities': 'مشرفة مختبر الرياضيات والتفكير الإبداعي',
            'dependent_name': 'سارة عمر الطيب',
            'dependent_relation': 'ابنة',
            'dependent_stage_grade': 'المرحلة الابتدائية - الصف الأول',
            'dependent_discount': '50',
            'prior_school_name': 'مدارس الجزيرة الجديدة للتعليم الخاص',
            'prior_country': 'السودان',
            'prior_time_period': '2021 - 2025',
            'basic_salary': '240000',
            'transport_allowance': '80000',
            'communication_allowance': '40000',
            'representation_allowance': '30000',
            'deductions': '0',
            'joining_date': '2026-08-01',
            'contract_start_date': '2026-08-01',
            'contract_end_date': '2027-07-31',
        },
        {
            'full_name_ar': 'مزمل الكباشي التاج إبراهيم',
            'title_surname': 'دكتور',
            'gender': 'ذكر',
            'national_id': '11003487556',
            'marital_status': 'متزوج',
            'children_count': '3',
            'city': 'بحري',
            'neighborhood': 'الصافية',
            'square_number': 'مربع 1',
            'house_number': 'منزل 8',
            'gatekeeper_name': 'هارون',
            'prominent_teacher_friend': 'أ. عثمان دفع الله',
            'phone_1': '0918765432',
            'whatsapp_number': '+249918765432',
            'phone_2': '0901234567',
            'emergency_phone_other': '0944556677',
            'emergency_kinship': 'شقيق',
            'email': 'muzammil.kabashi@gmail.com',
            'ref_name': 'د. الفاتح بابكر',
            'ref_phone': '0912233889',
            'university_institute': 'جامعة الجزيرة',
            'faculty': 'كلية التربية',
            'specialization': 'اللغة الإنجليزية',
            'position': 'معلم لغة إنجليزية أول',
            'department': 'التعليم والإشراف',
            'teaching_subject_1': 'اللغة الإنجليزية',
            'teaching_subject_2': '',
            'teaching_subject_3': '',
            'weekly_lesson_quota': '23',
            'duty_exempt': 'نعم',
            'other_tasks_activities': 'منسق النادي الإنجليزي والأنشطة الدولية',
            'dependent_name': 'أحمد مزمل الكباشي',
            'dependent_relation': 'ابن',
            'dependent_stage_grade': 'المرحلة المتوسطة - الصف الأول',
            'dependent_discount': '25',
            'prior_school_name': 'مدارس النيل العالمية',
            'prior_country': 'القاهرة',
            'prior_time_period': '2018 - 2023',
            'basic_salary': '260000',
            'transport_allowance': '80000',
            'communication_allowance': '40000',
            'representation_allowance': '40000',
            'deductions': '0',
            'joining_date': '2026-08-01',
            'contract_start_date': '2026-08-01',
            'contract_end_date': '2027-07-31',
        }
    ]

    # ألوان وتنسيقات مجموعات الهيدر (Group Colors)
    GROUP_COLORS = {
        'البيانات الشخصية والسكنية': '0F766E',      # تيل داكن
        'بيانات الاتصال والمعرفين': '1E3A8A',       # أزرق كحلي
        'المؤهل والتكليف الأكاديمي': '065F46',      # أخضر زمردي
        'الأبناء والتخفيض اللائحي': '7C2D12',       # برتقالي/بني فخم
        'الخبرات السابقة': '4C1D95',               # بنفسجي داكن
        'الهيكل المالي وعقد 2026م': '14532D',       # أخضر زيتوني داكن
    }

    @classmethod
    def generate_excel_template(cls, tenant_id: uuid.UUID) -> io.BytesIO:
        """
        توليد مصنف إكسل رسمي (.xlsx) متكامل مع هيدر فخم مدمج ثنائي الأسطر وقوائم منسدلة
        ودليل إرشادي شامل لكافة المواد والأنصبة واللائحة المالية 2026م.
        """
        wb = openpyxl.Workbook()

        # --- الورقة الأولى: كشف المعلمين والموظفين ---
        ws = wb.active
        if ws is None:
            ws = wb.create_sheet('كشف المعلمين والموظفين')
        ws.title = 'كشف المعلمين والموظفين'
        ws.sheet_view.rightToLeft = True

        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        medium_border = Border(
            left=Side(style='medium', color='0F766E'),
            right=Side(style='medium', color='0F766E'),
            top=Side(style='medium', color='0F766E'),
            bottom=Side(style='medium', color='0F766E')
        )

        center_align = Alignment(horizontal='center', vertical='center', wrap_text=True)
        right_align = Alignment(horizontal='right', vertical='center')

        # 1. عنوان المصنف الرسمي (السطر 1 و 2)
        total_cols = len(cls.TEMPLATE_COLUMNS)
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
        ws.row_dimensions[1].height = 36
        title_cell = ws.cell(row=1, column=1, value='نظام نبراس لإدارة المؤسسات التعليمية - نموذج كشف استيراد وتوظيف الكادر التعليمي وعقود 2026م')
        title_cell.font = Font(name='Arial', size=14, bold=True, color='0F766E')
        title_cell.alignment = center_align

        ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=total_cols)
        ws.row_dimensions[2].height = 24
        sub_cell = ws.cell(
            row=2, column=1,
            value='تنبيه: الحقول التي تحمل علامة (*) إلزامية. صُممت الأعمدة وفق استمارة وعقد 2026م ولائحته التنظيمية. يمكن حذف الأسطر التوضيحية أو تعديل رؤوس الأعمدة بمرونة.'
        )
        sub_cell.font = Font(name='Arial', size=10, bold=False, color='64748B')
        sub_cell.alignment = center_align

        # 2. السطر 4: ترويسة المجموعات الكبرى (Grouped Header)
        ws.row_dimensions[4].height = 28
        curr_group = None
        group_start = 1
        for col_idx, col in enumerate(cls.TEMPLATE_COLUMNS, start=1):
            g = col['group']
            if curr_group is None:
                curr_group = g
                group_start = col_idx
            elif curr_group != g:
                # دمج المجموعة السابقة
                ws.merge_cells(start_row=4, start_column=group_start, end_row=4, end_column=col_idx - 1)
                g_cell = ws.cell(row=4, column=group_start, value=curr_group)
                g_color = cls.GROUP_COLORS.get(curr_group, '0F766E')
                g_cell.fill = PatternFill('solid', fgColor=g_color)
                g_cell.font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
                g_cell.alignment = center_align
                for c in range(group_start, col_idx):
                    ws.cell(row=4, column=c).border = thin_border
                curr_group = g
                group_start = col_idx

        # دمج المجموعة الأخيرة
        if curr_group:
            ws.merge_cells(start_row=4, start_column=group_start, end_row=4, end_column=total_cols)
            g_cell = ws.cell(row=4, column=group_start, value=curr_group)
            g_color = cls.GROUP_COLORS.get(curr_group, '0F766E')
            g_cell.fill = PatternFill('solid', fgColor=g_color)
            g_cell.font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
            g_cell.alignment = center_align
            for c in range(group_start, total_cols + 1):
                ws.cell(row=4, column=c).border = thin_border

        # 3. السطر 5: عناوين الأعمدة التفصيلية (Detail Header Row)
        ws.row_dimensions[5].height = 32
        req_fill = PatternFill('solid', fgColor='134E4A')
        opt_fill = PatternFill('solid', fgColor='1E293B')

        for col_idx, col_def in enumerate(cls.TEMPLATE_COLUMNS, start=1):
            cell = ws.cell(row=5, column=col_idx, value=col_def['label'])
            cell.font = Font(name='Arial', size=10, bold=True, color='FFFFFF')
            cell.fill = req_fill if col_def['required'] else opt_fill
            cell.alignment = center_align
            cell.border = thin_border
            ws.column_dimensions[get_column_letter(col_idx)].width = col_def['width']

        # 4. تعبئة الأسطر الجديدة للتعليم الخاص التوضيحية (الصفوف 6, 7, 8)
        sample_fill_1 = PatternFill('solid', fgColor='F8FAFC')
        sample_fill_2 = PatternFill('solid', fgColor='F1F5F9')
        for row_idx, sample in enumerate(cls.SAMPLE_ROWS, start=6):
            ws.row_dimensions[row_idx].height = 24
            fill = sample_fill_1 if row_idx % 2 == 0 else sample_fill_2
            for col_idx, col_def in enumerate(cls.TEMPLATE_COLUMNS, start=1):
                val = sample.get(col_def['id'], '')
                cell = ws.cell(row=row_idx, column=col_idx, value=val)
                cell.font = Font(name='Arial', size=10, color='334155', italic=True)
                cell.fill = fill
                cell.border = thin_border
                cell.alignment = center_align if str(val).isdigit() or len(str(val)) < 8 else right_align

        # 5. القوائم المنسدلة للتحقق من صحة البيانات (Data Validations)
        # الجنس
        gender_dv = DataValidation(type="list", formula1='"ذكر,أنثى"', allow_blank=True)
        gender_dv.error = 'الرجاء اختيار الجنس: ذكر أو أنثى'
        gender_dv.errorTitle = 'قيمة غير صالحة'
        ws.add_data_validation(gender_dv)
        gender_col_letter = get_column_letter(3)  # col 3: gender
        gender_dv.add(f"{gender_col_letter}6:{gender_col_letter}500")

        # الحالة الاجتماعية
        marital_dv = DataValidation(type="list", formula1='"أعزب,متزوج,غير ذلك"', allow_blank=True)
        ws.add_data_validation(marital_dv)
        marital_col = get_column_letter(5)
        marital_dv.add(f"{marital_col}6:{marital_col}500")

        # الإعفاء من النوبتجية
        duty_dv = DataValidation(type="list", formula1='"نعم,لا"', allow_blank=True)
        ws.add_data_validation(duty_dv)
        duty_col = get_column_letter(30)  # duty_exempt
        duty_dv.add(f"{duty_col}6:{duty_col}500")

        # صلة القرابة للابن
        rel_dv = DataValidation(type="list", formula1='"ابن,ابنة,قريب من الدرجة الأولى"', allow_blank=True)
        ws.add_data_validation(rel_dv)
        rel_col = get_column_letter(33)
        rel_dv.add(f"{rel_col}6:{rel_col}500")

        # --- الورقة الثانية: دليل اللائحة والأقسام والمواد 2026م ---
        ws_guide = wb.create_sheet(title='دليل اللائحة وعقد 2026م')
        ws_guide.sheet_view.rightToLeft = True

        ws_guide.merge_cells('A1:D1')
        ws_guide.row_dimensions[1].height = 30
        g_title = ws_guide.cell(row=1, column=1, value='دليل اللائحة التنظيمية، الأنصبة، والبدلات لعقد معلم 2026م')
        g_title.font = Font(name='Arial', size=13, bold=True, color='0F766E')
        g_title.alignment = center_align

        # بنود اللائحة المالية والأكاديمية
        guide_sections = [
            ("أولاً: نصاب الحصص والنوبتجية", [
                ("نصاب الحصص الأسبوعي", "23 حصة أسبوعياً كحد معتمد للمعلم الكامل"),
                ("الإعفاء من النوبتجية (Duty)", "يُعفى المعلم الذي يُسند إليه 23 حصة أسبوعياً من النوبتجية المدرسية"),
                ("المهام الإشرافية", "تكليف إشرافي أو ريادة شعبة يوثق في استمارة التوظيف")
            ]),
            ("ثانياً: لائحة خصم الرسوم لأبناء العاملين بالمدرسة", [
                ("تلميذ واحد (1)", "خصم 50% من الرسوم الدراسية المقررة"),
                ("تلميذان (2)", "خصم 30% لكل منهما من الرسوم المقررة"),
                ("ثلاثة تلاميذ (3)", "خصم 25% لكل منهم"),
                ("أربعة تلاميذ (4)", "إعفاء تلميذ واحد كلياً (100%) + تخفيض 20% للباقين"),
                ("خمسة تلاميذ (5 فأكثر)", "إعفاء تلميذين كلياً (100%) + تخفيض 20% للباقين"),
                ("أقارب الدرجة الأولى", "رسوم التسجيل + خصم 10% ثابت")
            ]),
            ("ثالثاً: الهيكل المالي وبدلات 2026م (بالجنيه السوداني ج.س)", [
                ("الراتب الأساسي", "يحدد بموجب المؤهل والخبرة والتخصص"),
                ("بدل ترحيل", "80,000 ج.س (أو بحسب المنطقة والاتفاق)"),
                ("بدل اتصال وانترنت", "40,000 ج.س"),
                ("بدل تمثيل وإشراف", "30,000 ج.س (أو بحسب التكليف)"),
                ("صافي المستحق", "يُحسب آلياً: الأساسي + البدلات - الخصومات")
            ])
        ]

        g_row = 3
        guide_head_fill = PatternFill('solid', fgColor='0F766E')
        item_head_fill = PatternFill('solid', fgColor='E2E8F0')

        for sec_title, items in guide_sections:
            ws_guide.merge_cells(start_row=g_row, start_column=1, end_row=g_row, end_column=3)
            ws_guide.row_dimensions[g_row].height = 24
            sec_cell = ws_guide.cell(row=g_row, column=1, value=sec_title)
            sec_cell.font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
            sec_cell.fill = guide_head_fill
            sec_cell.alignment = Alignment(horizontal='right', vertical='center')
            g_row += 1

            for label, desc in items:
                ws_guide.row_dimensions[g_row].height = 20
                c1 = ws_guide.cell(row=g_row, column=1, value=label)
                c1.font = Font(name='Arial', size=10, bold=True, color='1E293B')
                c1.fill = item_head_fill
                c1.border = thin_border

                ws_guide.merge_cells(start_row=g_row, start_column=2, end_row=g_row, end_column=3)
                c2 = ws_guide.cell(row=g_row, column=2, value=desc)
                c2.font = Font(name='Arial', size=10, color='334155')
                c2.border = thin_border
                ws_guide.cell(row=g_row, column=3).border = thin_border
                g_row += 1
            g_row += 1

        ws_guide.column_dimensions['A'].width = 30
        ws_guide.column_dimensions['B'].width = 35
        ws_guide.column_dimensions['C'].width = 35

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output

    # قاموس ربط المرادفات للتطابق الذكي مع رؤوس الأعمدة في الإكسل
    HEADER_SYNONYMS = {
        'full_name_ar': ['الاسم', 'اسم المعلم', 'اسم الموظف', 'الاسم رباعي', 'الاسم رباعيا', 'الاسم رباعياً بالعربية', 'name', 'full_name', 'employee_name'],
        'title_surname': ['اللقب', 'اللقب العلمي', 'اللقب الاداري', 'اللقب العلمي / الإداري', 'title', 'surname'],
        'gender': ['الجنس', 'النوع', 'gender', 'sex'],
        'national_id': ['الرقم الوطني', 'الرقم القومي', 'الهوية', 'رقم الهوية', 'national_id', 'identity_number', 'nid'],
        'marital_status': ['الحالة الاجتماعية', 'الاجتماعية', 'marital_status'],
        'children_count': ['عدد الابناء', 'عدد الأبناء', 'الابناء', 'children', 'children_count'],
        'city': ['المدينة', 'الولاية', 'المدينة / الولاية', 'city', 'state'],
        'neighborhood': ['الحي', 'الحي السكني', 'المنطقة', 'neighborhood', 'district'],
        'square_number': ['المربع', 'رقم المربع', 'square', 'square_number'],
        'house_number': ['المنزل', 'رقم المنزل', 'house', 'house_number'],
        'gatekeeper_name': ['البواب', 'اسم البواب', 'gatekeeper', 'guard'],
        'prominent_teacher_friend': ['اقرب معلم', 'أقرب معلم', 'معلم بارز', 'صديق بالمدرسة', 'معلم معرف', 'friend_teacher'],
        'phone_1': ['الهاتف', 'رقم الهاتف', 'الهاتف الاساسي', 'الهاتف الأساسي (1)', 'الموبايل', 'phone', 'mobile', 'phone_1'],
        'whatsapp_number': ['الواتساب', 'رقم الواتساب', 'رقم الواتساب المعتمد', 'whatsapp', 'wa_number'],
        'phone_2': ['هاتف 2', 'هاتف ثان', 'رقم هاتف ثان', 'phone_2'],
        'emergency_phone_other': ['طوارئ', 'هاتف الطوارئ', 'رقم الطوارئ', 'emergency_phone'],
        'emergency_kinship': ['صلة قرابة', 'صلة قرابة الطوارئ', 'emergency_kinship'],
        'email': ['البريد', 'الايميل', 'البريد الالكتروني', 'البريد الإلكتروني', 'email'],
        'ref_name': ['المعرف', 'اسم المعلم المرجع', 'المرجع', 'اسم المرجع', 'reference_name', 'ref_name'],
        'ref_phone': ['هاتف المرجع', 'هاتف المعلم المرجع', 'رقم المرجع', 'ref_phone'],
        'university_institute': ['الجامعة', 'المعهد', 'الجامعة / المعهد', 'university', 'institute'],
        'faculty': ['الكلية', 'faculty', 'college'],
        'specialization': ['التخصص', 'التخصص الدقيق', 'specialization', 'major'],
        'position': ['المسمى', 'المسمى الوظيفي', 'الوظيفة', 'position', 'job_title'],
        'department': ['القسم', 'القسم الإداري', 'الإدارة', 'department'],
        'teaching_subject_1': ['المادة', 'المادة 1', 'المادة الاولى', 'المادة المكلف بها (1)', 'subject_1', 'primary_subject'],
        'teaching_subject_2': ['المادة 2', 'المادة الثانية', 'subject_2'],
        'teaching_subject_3': ['المادة 3', 'المادة الثالثة', 'subject_3'],
        'weekly_lesson_quota': ['النصاب', 'نصاب الحصص', 'نصاب الحصص الأسبوعي', 'quota', 'lessons_quota'],
        'duty_exempt': ['نوبتجية', 'معفى من النوبتجية', 'الإعفاء من النوبتجية', 'duty', 'duty_exempt'],
        'other_tasks_activities': ['مهام اخرى', 'أنشطة ومهام إشرافية', 'مهام إضافية', 'other_tasks'],
        'dependent_name': ['اسم الابن', 'اسم الطفل', 'اسم الابن/القريب بالمدرسة', 'dependent_name'],
        'dependent_relation': ['صلة القرابة للابن', 'صلة القرابة (ابن/قريب)', 'dependent_relation'],
        'dependent_stage_grade': ['المرحلة والصف', 'المرحلة والصف للابن', 'dependent_stage_grade'],
        'dependent_discount': ['نسبة التخفيض', 'نسبة الخصم', 'نسبة التخفيض المستحقة %', 'dependent_discount'],
        'prior_school_name': ['المدرسة السابقة', 'اسم المدرسة السابقة', 'prior_school'],
        'prior_country': ['بلد الخبرة', 'بلد الخبرة (السودان/مصر/أخرى)', 'prior_country'],
        'prior_time_period': ['الفترة الزمنية', 'سنوات الخبرة', 'prior_time_period'],
        'basic_salary': ['الراتب', 'الراتب الاساسي', 'الراتب الأساسي', 'الراتب الأساسي (ج.س)', 'basic_salary', 'salary'],
        'transport_allowance': ['بدل ترحيل', 'الترحيل', 'بدل ترحيل (ج.س)', 'transport', 'transport_allowance'],
        'communication_allowance': ['بدل اتصال', 'انترنت', 'اتصال وانترنت', 'بدل اتصال وانترنت (ج.س)', 'communication_allowance'],
        'representation_allowance': ['بدل تمثيل', 'تمثيل', 'بدل تمثيل (ج.س)', 'representation_allowance'],
        'deductions': ['الخصومات', 'الاستقطاعات', 'الخصومات (ج.س)', 'deductions'],
        'joining_date': ['تاريخ المباشرة', 'المباشرة', 'joining_date', 'hire_date'],
        'contract_start_date': ['بداية العقد', 'تاريخ بداية العقد', 'contract_start_date'],
        'contract_end_date': ['نهاية العقد', 'تاريخ نهاية العقد', 'contract_end_date'],
    }

    @classmethod
    def match_column_id(cls, raw_label: str) -> str:
        """
        مطابقة ذكية لرأس العمود مع معرف الحقل حتى لو عُدلت الكلمات أو الترويسة في الإكسل
        """
        if not raw_label:
            return ''
        clean = re.sub(r'[*()/\-_\[\]]', ' ', str(raw_label)).strip().lower()
        clean = re.sub(r'\s+', ' ', clean)

        for col_id, synonyms in cls.HEADER_SYNONYMS.items():
            for syn in synonyms:
                clean_syn = re.sub(r'[*()/\-_\[\]]', ' ', syn).strip().lower()
                clean_syn = re.sub(r'\s+', ' ', clean_syn)
                if clean == clean_syn or clean_syn in clean or clean in clean_syn:
                    return col_id
        return ''

    @classmethod
    def validate_and_preview(cls, file_obj, tenant_id: uuid.UUID, custom_mapping: dict = None) -> dict:
        """
        فحص وقراءة ملف الإكسل بالذاكرة، واكتشاف خلايا الهيدر ومطابقتها،
        والتحقق من الحقول الإلزامية وتكرار الأرقام الوطنية والهواتف.
        """
        try:
            wb = openpyxl.load_workbook(file_obj, data_only=True)
        except Exception as e:
            return {
                'is_valid': False,
                'error': f'تعذر فتح وقراءة ملف الإكسل: {str(e)}',
                'rows': [],
                'header_mapping': {},
                'headers': []
            }

        ws = wb.active
        if not ws:
            return {'is_valid': False, 'error': 'ملف الإكسل لا يحتوي على أوراق صالحة.', 'rows': []}

        # العثور على سطر الهيدر الحقيقي (قد يكون في السطر 4 أو 5 أو 1 أو 2)
        header_row_idx = None
        raw_headers = []
        for r in range(1, 15):
            row_values = [ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
            str_values = [str(v).strip() for v in row_values if v is not None and str(v).strip()]
            # إذا احتوى السطر على كلمات مفتاحية مثل (الاسم، الهاتف، التخصص، الجنس...)
            matches = [v for v in str_values if any(k in v for k in ['الاسم', 'الهاتف', 'المعلم', 'الجنس', 'الراتب', 'المادة'])]
            if len(matches) >= 2:
                header_row_idx = r
                raw_headers = [str(v).strip() if v is not None else '' for v in row_values]
                break

        if not header_row_idx:
            # افتراضياً السطر الأول
            header_row_idx = 1
            raw_headers = [str(ws.cell(row=1, column=c).value or '').strip() for c in range(1, ws.max_column + 1)]

        # بناء مطابقة الأعمدة (Header Mapping)
        mapping = {}
        for col_idx, raw_title in enumerate(raw_headers, start=1):
            if not raw_title:
                continue
            # فحص التخصيص اليدوي أولاً إن وجد
            if custom_mapping and raw_title in custom_mapping:
                matched_id = custom_mapping[raw_title]
            else:
                matched_id = cls.match_column_id(raw_title)
            if matched_id:
                mapping[col_idx] = {
                    'col_idx': col_idx,
                    'raw_title': raw_title,
                    'field_id': matched_id
                }

        # أرقام الهواتف والأرقام الوطنية الحالية للتحقق من عدم التكرار
        existing_national_ids = set(
            Employee.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
            .exclude(national_id__isnull=True)
            .exclude(national_id__exact='')
            .values_list('national_id', flat=True)
        )
        existing_phones = set(
            Employee.objects.filter(tenant_id=tenant_id, deleted_at__isnull=True)
            .exclude(phone_1__isnull=True)
            .exclude(phone_1__exact='')
            .values_list('phone_1', flat=True)
        )

        seen_nids_in_file = set()
        seen_phones_in_file = set()

        processed_rows = []
        start_data_row = header_row_idx + 1

        for r_idx in range(start_data_row, ws.max_row + 1):
            # فحص هل السطر فارغ تماماً
            row_has_data = False
            for col_idx in mapping.keys():
                val = ws.cell(row=r_idx, column=col_idx).value
                if val is not None and str(val).strip():
                    row_has_data = True
                    break

            if not row_has_data:
                continue

            row_data = {}
            for col_idx, meta in mapping.items():
                cell_val = ws.cell(row=r_idx, column=col_idx).value
                field_id = meta['field_id']
                if cell_val is None:
                    row_data[field_id] = ''
                elif isinstance(cell_val, (datetime.date, datetime.datetime)):
                    row_data[field_id] = cell_val.strftime('%Y-%m-%d')
                else:
                    row_data[field_id] = str(cell_val).strip()

            # تدقيق السطر وفحص الحقول
            errors = []
            warnings = []

            # 1. الاسم رباعياً بالعربية
            name_val = row_data.get('full_name_ar', '')
            if not name_val:
                errors.append('اسم المعلم/الموظف رباعياً بالعربية إلزامي.')
            elif len(name_val.split()) < 3:
                warnings.append('يُفضل إدخال الاسم رباعياً وفق استمارة التوظيف الرسمية.')

            # 2. الجنس
            gender_val = row_data.get('gender', '')
            if not gender_val:
                errors.append('الجنس إلزامي (ذكر / أنثى).')
            elif gender_val in ['ذكر', 'male', 'ولد']:
                row_data['gender'] = 'male'
            elif gender_val in ['أنثى', 'انثى', 'female', 'بنت']:
                row_data['gender'] = 'female'

            # 3. المدينة والحي
            if not row_data.get('city'):
                errors.append('المدينة / الولاية حقل إلزامي.')
            if not row_data.get('neighborhood'):
                errors.append('الحي السكني حقل إلزامي.')

            # 4. الهاتف الأساسي
            phone_val = row_data.get('phone_1', '')
            if not phone_val:
                errors.append('رقم الهاتف الأساسي (1) إلزامي.')
            else:
                clean_phone = re.sub(r'[^0-9+]', '', phone_val)
                row_data['phone_1'] = clean_phone
                if clean_phone in existing_phones:
                    warnings.append(f'رقم الهاتف ({clean_phone}) مسجل مسبقاً لموظف آخر بالمنظومة.')
                if clean_phone in seen_phones_in_file:
                    errors.append(f'تكرار رقم الهاتف ({clean_phone}) داخل نفس كشف الإكسل.')
                seen_phones_in_file.add(clean_phone)

            # 5. الواتساب الدولي
            wa_val = row_data.get('whatsapp_number', '')
            if not wa_val:
                # توليد افتراضي من رقم الهاتف إن لم يُحدد
                if row_data.get('phone_1'):
                    ph = row_data['phone_1']
                    if ph.startswith('0'):
                        row_data['whatsapp_number'] = '+249' + ph[1:]
                    elif not ph.startswith('+'):
                        row_data['whatsapp_number'] = '+249' + ph
                    else:
                        row_data['whatsapp_number'] = ph
            else:
                clean_wa = re.sub(r'[^0-9+]', '', wa_val)
                if not clean_wa.startswith('+'):
                    clean_wa = '+249' + (clean_wa[1:] if clean_wa.startswith('0') else clean_wa)
                row_data['whatsapp_number'] = clean_wa

            # 6. الرقم الوطني
            nid_val = row_data.get('national_id', '')
            if nid_val:
                clean_nid = re.sub(r'[^0-9]', '', nid_val)
                row_data['national_id'] = clean_nid
                if clean_nid in existing_national_ids:
                    warnings.append(f'الرقم الوطني ({clean_nid}) مسجل مسبقاً لموظف آخر بالمنظومة.')
                if clean_nid in seen_nids_in_file:
                    errors.append(f'تكرار الرقم الوطني ({clean_nid}) داخل نفس كشف الإكسل.')
                seen_nids_in_file.add(clean_nid)

            # 7. المؤهل والتخصص
            if not row_data.get('university_institute'):
                errors.append('الجامعة / المعهد حقل إلزامي.')
            if not row_data.get('faculty'):
                errors.append('الكلية حقل إلزامي.')
            if not row_data.get('specialization'):
                errors.append('التخصص الدقيق حقل إلزامي.')

            # 8. المادة والتكليف
            if not row_data.get('teaching_subject_1'):
                row_data['teaching_subject_1'] = row_data.get('specialization', 'عام')

            # 9. الأنصبة والنوبتجية
            try:
                row_data['weekly_lesson_quota'] = int(row_data.get('weekly_lesson_quota') or 23)
            except (ValueError, TypeError):
                row_data['weekly_lesson_quota'] = 23

            duty_val = str(row_data.get('duty_exempt', '')).strip().lower()
            row_data['duty_exempt'] = duty_val in ['نعم', 'true', '1', 'معفى', 'yes']

            # 10. الهيكل المالي
            for num_field, default_val in [
                ('basic_salary', 200000),
                ('transport_allowance', 80000),
                ('communication_allowance', 40000),
                ('representation_allowance', 30000),
                ('deductions', 0)
            ]:
                try:
                    val_str = re.sub(r'[^0-9.]', '', str(row_data.get(num_field) or ''))
                    row_data[num_field] = float(val_str) if val_str else float(default_val)
                except (ValueError, TypeError):
                    row_data[num_field] = float(default_val)

            # حساب صافي المستحق
            basic = row_data['basic_salary']
            trans = row_data['transport_allowance']
            comm = row_data['communication_allowance']
            rep = row_data['representation_allowance']
            ded = row_data['deductions']
            row_data['net_payable'] = (basic + trans + comm + rep) - ded

            processed_rows.append({
                'row_number': r_idx,
                'data': row_data,
                'is_valid': len(errors) == 0,
                'errors': errors,
                'warnings': warnings
            })

        valid_count = sum(1 for r in processed_rows if r['is_valid'])
        invalid_count = len(processed_rows) - valid_count

        return {
            'is_valid': True,
            'total_rows': len(processed_rows),
            'valid_count': valid_count,
            'invalid_count': invalid_count,
            'header_row_index': header_row_idx,
            'headers': raw_headers,
            'header_mapping': [
                {
                    'col_idx': m['col_idx'],
                    'raw_title': m['raw_title'],
                    'field_id': m['field_id'],
                    'field_label': next((c['label'] for c in cls.TEMPLATE_COLUMNS if c['id'] == m['field_id']), m['field_id'])
                }
                for m in mapping.values()
            ],
            'rows': processed_rows
        }

    @classmethod
    def purge_mock_employees(cls, tenant_id: uuid.UUID) -> dict:
        """
        تصفير وحذف سجلات الموظفين والمعلمين التجريبيين للمستأجر بأمان،
        للبدء بسجل نظيف تماماً قبل استيراد الكشف الفعلي.
        """
        with transaction.atomic():
            # الموظفون التابعون للمستأجر
            qs = Employee.objects.filter(tenant_id=tenant_id)
            count = qs.count()
            # مسح الملحقات أولاً
            EmployeeDependent.objects.filter(tenant_id=tenant_id).delete()
            EmployeeReference.objects.filter(tenant_id=tenant_id).delete()
            EmployeePriorExperience.objects.filter(tenant_id=tenant_id).delete()
            # مسح الموظفين أنفسهم
            qs.delete()

            return {
                'purged_count': count,
                'message': f'تم تصفير وحذف {count} موظف تجريبي بنجاح.'
            }

    @classmethod
    def execute_bulk_import(
        cls,
        rows: list,
        tenant_id: uuid.UUID,
        purge_mock_employees: bool = False,
        user_id: uuid.UUID = None
    ) -> dict:
        """
        تنفيذ عملية الاستيراد وحفظ الموظفين والمعلمين دفعة واحدة مع توليد الأرقام الوظيفية
        وربط الملحقات والخبرات والأبناء بلائحة 2026م.
        """
        if purge_mock_employees:
            cls.purge_mock_employees(tenant_id=tenant_id)

        created_employees = []
        created_dependents = 0
        created_references = 0
        created_experiences = 0

        # جلب أعلى تسلسل وظيفي لبدء الترقيم الرسمي
        existing_count = Employee.objects.filter(deleted_at__isnull=True).count()

        with transaction.atomic():
            for idx, r_data in enumerate(rows, start=1):
                emp_seq = existing_count + idx
                emp_number = f"EMP-2026-{str(emp_seq).zfill(3)}"

                # إنشاء كائن الموظف الأساسي
                emp = Employee(
                    tenant_id=tenant_id,
                    employee_number=emp_number,
                    full_name_ar=r_data.get('full_name_ar', ''),
                    title_surname=r_data.get('title_surname', ''),
                    gender=r_data.get('gender', 'male'),
                    national_id=r_data.get('national_id', '') or None,
                    marital_status=r_data.get('marital_status', 'متزوج'),
                    children_count=int(r_data.get('children_count') or 0),
                    city=r_data.get('city', 'الخرطوم'),
                    neighborhood=r_data.get('neighborhood', ''),
                    square_number=r_data.get('square_number', ''),
                    house_number=r_data.get('house_number', ''),
                    gatekeeper_name=r_data.get('gatekeeper_name', ''),
                    prominent_teacher_friend=r_data.get('prominent_teacher_friend', ''),
                    phone_1=r_data.get('phone_1', ''),
                    phone_2=r_data.get('phone_2', ''),
                    emergency_phone_other=r_data.get('emergency_phone_other', ''),
                    emergency_kinship=r_data.get('emergency_kinship', ''),
                    whatsapp_number=r_data.get('whatsapp_number', ''),
                    email=r_data.get('email', '') or None,
                    university_institute=r_data.get('university_institute', ''),
                    faculty=r_data.get('faculty', ''),
                    specialization=r_data.get('specialization', ''),
                    position=r_data.get('position', 'معلم'),
                    department=r_data.get('department', 'التعليم والإشراف'),
                    teaching_subject_1=r_data.get('teaching_subject_1', ''),
                    teaching_subject_2=r_data.get('teaching_subject_2', ''),
                    teaching_subject_3=r_data.get('teaching_subject_3', ''),
                    weekly_lesson_quota=int(r_data.get('weekly_lesson_quota') or 23),
                    duty_exempt=bool(r_data.get('duty_exempt', True)),
                    other_tasks_activities=r_data.get('other_tasks_activities', ''),
                    basic_salary=Decimal(str(r_data.get('basic_salary') or 200000)),
                    transport_allowance=Decimal(str(r_data.get('transport_allowance') or 80000)),
                    communication_allowance=Decimal(str(r_data.get('communication_allowance') or 40000)),
                    representation_allowance=Decimal(str(r_data.get('representation_allowance') or 30000)),
                    deductions=Decimal(str(r_data.get('deductions') or 0)),
                    status='active',
                    agreed_to_bylaws=True,
                    school_manager_approval=True,
                    admin_manager_approval=True,
                    general_manager_approval=True
                )

                # التواريخ
                if r_data.get('joining_date'):
                    try:
                        emp.joining_date = datetime.datetime.strptime(r_data['joining_date'], '%Y-%m-%d').date()
                    except Exception:
                        pass
                if r_data.get('contract_start_date'):
                    try:
                        emp.contract_start_date = datetime.datetime.strptime(r_data['contract_start_date'], '%Y-%m-%d').date()
                    except Exception:
                        pass
                if r_data.get('contract_end_date'):
                    try:
                        emp.contract_end_date = datetime.datetime.strptime(r_data['contract_end_date'], '%Y-%m-%d').date()
                    except Exception:
                        pass

                emp.save()
                created_employees.append(emp)

                # 1. إنشاء المرجع إن وُجد
                if r_data.get('ref_name'):
                    EmployeeReference.objects.create(
                        tenant_id=tenant_id,
                        employee=emp,
                        ref_name=r_data['ref_name'],
                        ref_phone=r_data.get('ref_phone', '')
                    )
                    created_references += 1

                # 2. إنشاء الخبرة السابقة إن وُجدت
                if r_data.get('prior_school_name'):
                    EmployeePriorExperience.objects.create(
                        tenant_id=tenant_id,
                        employee=emp,
                        school_name=r_data['prior_school_name'],
                        country=r_data.get('prior_country', 'السودان'),
                        time_period=r_data.get('prior_time_period', '')
                    )
                    created_experiences += 1

                # 3. إنشاء الابن / القريب باللائحة إن وُجد
                if r_data.get('dependent_name'):
                    discount_val = Decimal(str(r_data.get('dependent_discount') or 50))
                    rel_type = 'child' if 'ابن' in r_data.get('dependent_relation', 'ابن') else 'relative'
                    EmployeeDependent.objects.create(
                        tenant_id=tenant_id,
                        employee=emp,
                        full_name=r_data['dependent_name'],
                        relation_type=rel_type,
                        academic_stage='المرحلة الابتدائية',
                        grade_level=r_data.get('dependent_stage_grade', ''),
                        discount_percentage=discount_val,
                        is_fully_exempt=(discount_val == 100),
                        notes='تم الاستيراد ضمن كشف عقد 2026م'
                    )
                    created_dependents += 1

        return {
            'success': True,
            'imported_count': len(created_employees),
            'dependents_count': created_dependents,
            'references_count': created_references,
            'experiences_count': created_experiences,
            'first_employee_number': created_employees[0].employee_number if created_employees else None,
            'last_employee_number': created_employees[-1].employee_number if created_employees else None,
            'message': f'تم استيراد واعتماد {len(created_employees)} معلم وموظف وتوليد عقود 2026م بنجاح.'
        }
