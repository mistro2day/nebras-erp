class Gender:
    MALE = 'M'
    FEMALE = 'F'
    CHOICES = (
        (MALE, 'ذكر'),
        (FEMALE, 'أنثى'),
    )


class Language:
    ARABIC = 'ar'
    ENGLISH = 'en'
    CHOICES = (
        (ARABIC, 'العربية'),
        (ENGLISH, 'الانجليزية'),
    )


class AcademicStatus:
    ACTIVE = 'active'
    SUSPENDED = 'suspended'
    WITHDRAWN = 'withdrawn'
    GRADUATED = 'graduated'
    CHOICES = (
        (ACTIVE, 'نشط'),
        (SUSPENDED, 'موقوف'),
        (WITHDRAWN, 'منسحب'),
        (GRADUATED, 'خريج'),
    )


class WorkflowStatus:
    DRAFT = 'draft'
    PENDING = 'pending'
    APPROVED = 'approved'
    REJECTED = 'rejected'
    CHOICES = (
        (DRAFT, 'مسودة'),
        (PENDING, 'قيد الدراسة'),
        (APPROVED, 'مقبول'),
        (REJECTED, 'مرفوض'),
    )