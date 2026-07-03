from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.shared.domain.base import (
    EntityId, BaseEntity, AggregateRoot, ValueObject,
    DomainEvent, BusinessRule, Result, Specification
)
from apps.shared.domain.validators import (
    validate_saudi_phone, validate_national_id,
    validate_future_date, validate_past_date
)
from apps.shared.domain.exceptions import (
    ValidationException, BusinessException,
    AuthorizationException, NotFoundException
)
from apps.shared.domain.constants import Gender, AcademicStatus, WorkflowStatus
from apps.shared.application.utils import StringUtils, CodeGenerator
from django.utils import timezone
from datetime import timedelta
import uuid


class DomainBaseTest(TestCase):
    """اختبارات كلاسات النطاق الأساسية (DDD Base Classes)"""

    def test_entity_id_creation(self):
        eid = EntityId()
        self.assertIsInstance(eid.value, uuid.UUID)

    def test_entity_equality(self):
        shared_id = EntityId()
        e1 = BaseEntity(id=shared_id)
        e2 = BaseEntity(id=shared_id)
        self.assertEqual(e1, e2)

    def test_aggregate_root_events(self):
        agg = AggregateRoot()
        evt = DomainEvent()
        agg.add_domain_event(evt)
        self.assertEqual(len(agg.get_domain_events()), 1)
        agg.clear_domain_events()
        self.assertEqual(len(agg.get_domain_events()), 0)

    def test_value_object_equality(self):
        class Money(ValueObject):
            def __init__(self, amount, currency):
                self.amount = amount
                self.currency = currency

        m1 = Money(100, "SAR")
        m2 = Money(100, "SAR")
        m3 = Money(200, "SAR")
        self.assertEqual(m1, m2)
        self.assertNotEqual(m1, m3)

    def test_result_pattern_success(self):
        r = Result.success(42)
        self.assertTrue(r.is_success)
        self.assertEqual(r.value, 42)

    def test_result_pattern_fail(self):
        r = Result.fail("خطأ في التحقق")
        self.assertFalse(r.is_success)
        self.assertEqual(r.error, "خطأ في التحقق")
        with self.assertRaises(ValueError):
            _ = r.value

    def test_specification_pattern(self):
        is_positive = Specification(lambda x: x > 0)
        is_even = Specification(lambda x: x % 2 == 0)
        positive_and_even = is_positive.and_spec(is_even)

        self.assertTrue(positive_and_even.is_satisfied_by(4))
        self.assertFalse(positive_and_even.is_satisfied_by(3))
        self.assertFalse(positive_and_even.is_satisfied_by(-2))


class ValidatorsTest(TestCase):
    """اختبارات أدوات التحقق من المدخلات"""

    def test_valid_saudi_phone(self):
        validate_saudi_phone("0512345678")
        validate_saudi_phone("+966512345678")

    def test_invalid_saudi_phone(self):
        with self.assertRaises(ValidationError):
            validate_saudi_phone("123")

    def test_valid_national_id(self):
        validate_national_id("1234567890")
        validate_national_id("2098765432")

    def test_invalid_national_id(self):
        with self.assertRaises(ValidationError):
            validate_national_id("999")

    def test_future_date_valid(self):
        validate_future_date(timezone.now().date() + timedelta(days=1))

    def test_future_date_invalid(self):
        with self.assertRaises(ValidationError):
            validate_future_date(timezone.now().date() - timedelta(days=1))

    def test_past_date_valid(self):
        validate_past_date(timezone.now().date() - timedelta(days=1))

    def test_past_date_invalid(self):
        with self.assertRaises(ValidationError):
            validate_past_date(timezone.now().date() + timedelta(days=1))


class ExceptionsTest(TestCase):
    """اختبارات الاستثناءات المشتركة"""

    def test_validation_exception(self):
        exc = ValidationException("حقل مطلوب")
        self.assertEqual(exc.status_code, 422)
        self.assertEqual(exc.message, "حقل مطلوب")

    def test_not_found_exception(self):
        exc = NotFoundException()
        self.assertEqual(exc.status_code, 404)

    def test_authorization_exception(self):
        exc = AuthorizationException()
        self.assertEqual(exc.status_code, 403)


class ConstantsTest(TestCase):
    """اختبارات الثوابت الموحدة"""

    def test_gender_choices(self):
        self.assertEqual(Gender.MALE, 'M')
        self.assertEqual(len(Gender.CHOICES), 2)

    def test_academic_status_choices(self):
        self.assertIn(('active', 'نشط'), AcademicStatus.CHOICES)
        self.assertEqual(AcademicStatus.GRADUATED, 'graduated')

    def test_workflow_status_choices(self):
        self.assertEqual(WorkflowStatus.DRAFT, 'draft')
        self.assertEqual(len(WorkflowStatus.CHOICES), 4)


class UtilitiesTest(TestCase):
    """اختبارات الأدوات المساعدة"""

    def test_random_string_length(self):
        s = StringUtils.generate_random_string(16)
        self.assertEqual(len(s), 16)

    def test_slug_generation(self):
        slug = StringUtils.generate_slug("Hello World Test")
        self.assertEqual(slug, "hello-world-test")

    def test_serial_code_generator(self):
        code = CodeGenerator.generate_serial_code("STU", 42)
        self.assertEqual(code, "STU-000042")

    def test_serial_code_custom_length(self):
        code = CodeGenerator.generate_serial_code("INV", 7, length=4)
        self.assertEqual(code, "INV-0007")