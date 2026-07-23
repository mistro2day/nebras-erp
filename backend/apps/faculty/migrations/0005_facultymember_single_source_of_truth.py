"""
سحب البيانات الشخصية المكررة من FacultyMember — مصدر واحد للحقيقة.

المشكلة قبل هذا الترحيل:
    كان FacultyMember يحمل نسخة ثانية من بيانات الشخص (الاسم، الهوية، الهاتف،
    البريد...) ويدفعها إلى Employee عند كل حفظ. فكان التعديل المباشر على
    Employee لا ينعكس على FacultyMember وتتباعد النسختان: رقم هاتف قديم في
    مكان، واسمان مختلفان في تقريرين.

بعد الترحيل:
    Employee هو المصدر الوحيد. الحقول أدناه صارت خصائص للقراءة تُفوَّض إليه،
    فبقيت `faculty_member.full_name_ar` تعمل كما كانت لكل الكود القائم
    (scheduling والواجهة) دون أي كسر.

سلامة البيانات:
    فُحصت قبل التنفيذ: 20 عضواً، جميعهم مرتبطون بموظف، وصفر فروقات بين
    النسختين في كل الحقول الأربعة عشر. فالحذف لا يفقد شيئاً.

يبقى في FacultyMember ما يخص الدور الأكاديمي وحده:
    teacher_code · branch_id · department · current_position · joining_date · status
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('faculty', '0004_drop_legacy_teachers_tables'),
        ('employees', '0006_employeedependent_linked_at_and_more'),
    ]

    operations = [
        # الرابط بالموظف صار إلزامياً — لا عضو هيئة تدريس بلا ملف موظف
        migrations.AlterField(
            model_name='facultymember',
            name='employee',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='faculty_roles',
                to='employees.employee',
            ),
        ),
        # حذف النسخة الثانية من البيانات الشخصية
        migrations.RemoveField(model_name='facultymember', name='employee_number'),
        migrations.RemoveField(model_name='facultymember', name='national_id'),
        migrations.RemoveField(model_name='facultymember', name='passport'),
        migrations.RemoveField(model_name='facultymember', name='full_name_ar'),
        migrations.RemoveField(model_name='facultymember', name='full_name_en'),
        migrations.RemoveField(model_name='facultymember', name='gender'),
        migrations.RemoveField(model_name='facultymember', name='nationality'),
        migrations.RemoveField(model_name='facultymember', name='religion'),
        migrations.RemoveField(model_name='facultymember', name='date_of_birth'),
        migrations.RemoveField(model_name='facultymember', name='marital_status'),
        migrations.RemoveField(model_name='facultymember', name='photo_url'),
        migrations.RemoveField(model_name='facultymember', name='email'),
        migrations.RemoveField(model_name='facultymember', name='mobile'),
        migrations.RemoveField(model_name='facultymember', name='address'),
    ]
