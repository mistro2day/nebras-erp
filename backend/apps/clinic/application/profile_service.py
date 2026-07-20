"""الملف الطبي الموحّد — مصدر الحقيقة الوحيد للحقائق الطبية.

كان النظام يحمل ملفّين طبيّين متوازيين:
  - `students.StudentMedicalProfile`: حقول JSON للطلاب فقط، ويصف نفسه في
    شيفرته بأنه `Placeholder` بانتظار موديول العيادة.
  - `clinic.MedicalProfile`: يغطي الطلاب والموظفين، وتُفصّل حقائقه في جداول
    معيارية (`Allergy`, `ChronicCondition`, `Vaccination`).

مصدران للحقيقة نفسها يتباعدان حتماً: ممرضة تقرأ حساسية لم يعد الوليّ
يُقرّ بها، أو العكس. لذلك صارت العيادة هي المرجع، وتمرّ كل كتابة وقراءة
للحقائق الطبية من هنا مهما كان الموديول الطالب لها.

حقول JSON في `StudentMedicalProfile` لم تعد تُكتب ولا تُقرأ؛ أُبقيت في
قاعدة البيانات كأعمدة ميتة لأن حذفها ترحيل مدمّر يُقرَّر منفصلاً.
"""
from django.db import transaction

from apps.clinic.domain.models import (
    MedicalProfile, Allergy, ChronicCondition,
)


def get_profile(tenant_id, person_type, person_id):
    """يُرجع الملف الطبي إن وُجد — بلا إنشاء."""
    return MedicalProfile.objects.filter(
        tenant_id=tenant_id, patient_user_id=person_id, patient_type=person_type,
    ).first()


@transaction.atomic
def get_or_create_profile(tenant_id, person_type, person_id, user_id=None):
    """يضمن وجود ملف طبي للشخص — يُنشأ فارغاً عند أول حاجة إليه."""
    profile = get_profile(tenant_id, person_type, person_id)
    if profile is not None:
        return profile
    return MedicalProfile.objects.create(
        tenant_id=tenant_id,
        patient_user_id=person_id,
        patient_type=person_type,
        created_by=user_id,
    )


def read_intake(tenant_id, person_type, person_id):
    """يقرأ الحقائق الطبية بالشكل الذي تتوقّعه شاشات الطلاب.

    يُبقي عقد الواجهة كما هو (allergies / chronic_diseases / …) بينما صار
    المصدر جداول العيادة — فلا تنكسر شاشات الطالب ولا يتعدّد المصدر.
    """
    empty = {
        'allergies': [],
        'chronic_diseases': [],
        'medication': [],
        'doctor': '',
        'medical_notes': '',
        'emergency_medical_contact': {},
        'blood_group': None,
        'disabilities': '',
    }
    profile = get_profile(tenant_id, person_type, person_id)
    if profile is None:
        return empty

    return {
        'allergies': [a.allergy_source for a in profile.allergies.filter(deleted_at__isnull=True)],
        'chronic_diseases': [c.condition_name for c in profile.chronic_conditions.filter(deleted_at__isnull=True)],
        # الأدوية الموصوفة تُدار في الوصفات والصرف، لا كقائمة نصّية ثابتة
        'medication': [],
        'doctor': '',
        'medical_notes': profile.medical_alerts or '',
        'emergency_medical_contact': {},
        'blood_group': profile.blood_group,
        'disabilities': profile.disabilities or '',
    }


@transaction.atomic
def write_intake(tenant_id, person_type, person_id, data, user_id=None):
    """يكتب ما يُقرّه الوليّ عند التسجيل في سجلّات العيادة — مسار الكتابة الوحيد.

    الحساسيات والأمراض المزمنة تُخزَّن صفوفاً لا نصوصاً، فيمكن للممرضة
    إضافة أعراض كل حساسية وملاحظات كل مرض لاحقاً دون فقد ما أقرّه الوليّ.
    """
    if not data:
        return None

    profile = get_or_create_profile(tenant_id, person_type, person_id, user_id)

    if 'blood_group' in data and data.get('blood_group'):
        profile.blood_group = data['blood_group']
    if data.get('medical_notes'):
        profile.medical_alerts = data['medical_notes']
    if data.get('disabilities'):
        profile.disabilities = data['disabilities']
    profile.save()

    # المقارنة بالاسم تمنع التكرار عند إعادة الحفظ، وتُبقي ما أضافته
    # الممرضة من تفاصيل على الصفوف القائمة.
    declared_allergies = [a for a in (data.get('allergies') or []) if str(a).strip()]
    if declared_allergies:
        existing = {a.allergy_source for a in profile.allergies.all()}
        for name in declared_allergies:
            if str(name).strip() not in existing:
                Allergy.objects.create(
                    tenant_id=tenant_id, profile=profile,
                    allergy_source=str(name).strip(), created_by=user_id,
                )

    declared_conditions = [c for c in (data.get('chronic_diseases') or []) if str(c).strip()]
    if declared_conditions:
        existing = {c.condition_name for c in profile.chronic_conditions.all()}
        for name in declared_conditions:
            if str(name).strip() not in existing:
                ChronicCondition.objects.create(
                    tenant_id=tenant_id, profile=profile,
                    condition_name=str(name).strip(), created_by=user_id,
                )

    return profile
