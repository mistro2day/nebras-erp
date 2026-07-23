"""
إسقاط جداول تطبيق `teachers` المهجور بعد حذفه من المنصة.

يوضَع هذا التنظيف في `faculty` لأن تطبيق `teachers` أُزيل بالكامل من
`INSTALLED_APPS`، فلم يعد لديه سلسلة ترحيلات تُطبَّق على البيئات الأخرى.
بدونه تبقى الجداول يتيمة في الإنتاج وأي بيئة لم تُحدَّث.

خلفية الحذف: `TeacherProfile` و`TeacherAssignment` في `teachers` كانا نسخة
أقدم وأفقر من نظيريهما في `faculty` (الذي يضيف academic_year_id و term_id
و weekly_hours). تحقّقنا قبل الحذف أن أزواج (المادة، الشعبة) البالغة 423
مغطّاة بالكامل ضمن 596 في `faculty.TeacherAssignment` — صفر بيانات مفقودة.
ولم يكن التطبيق مربوطاً بأي مسار API ولا يشير إليه أي تطبيق آخر.

مصدر الحقيقة المعتمد: employees.Employee (الشخص) + faculty.FacultyMember (الدور الأكاديمي).

العملية idempotent (IF EXISTS) فتعمل بأمان على البيئات التي أسقطت الجداول سلفاً.
غير قابلة للعكس — البيانات مغطّاة في faculty.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('faculty', '0003_alter_facultymember_joining_date'),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "DROP TABLE IF EXISTS teacher_assignments CASCADE;",
                "DROP TABLE IF EXISTS teacher_profiles CASCADE;",
            ],
            reverse_sql=migrations.RunSQL.noop,
        ),
        # إزالة أثر التطبيق المحذوف من سجل الترحيلات حتى لا يظهر كتطبيق غامض
        migrations.RunSQL(
            sql="DELETE FROM django_migrations WHERE app = 'teachers';",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
