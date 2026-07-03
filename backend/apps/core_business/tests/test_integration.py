from django.test import TestCase
from apps.core_business.domain.models import Attachment, Tag, LookupCategory, LookupValue
from apps.core_business.application.services import UniversalNumberGeneratorService
import uuid

class CoreBusinessIntegrationTest(TestCase):
    """
    اختبارات التكامل الأساسية لمكونات الأعمال المشتركة
    """
    def setUp(self):
        self.tenant_id = uuid.uuid4()

    def test_universal_number_generation(self):
        num = UniversalNumberGeneratorService.generate_number(prefix='STD', year_suffix=True, padding=6)
        self.assertTrue(num.startswith('STD-2026-'))
        self.assertEqual(len(num.split('-')[-1]), 6)

    def test_lookup_system_creation(self):
        category = LookupCategory.objects.create(
            tenant_id=self.tenant_id,
            code='religion',
            name_ar='الديانة',
            name_en='Religion'
        )
        val = LookupValue.objects.create(
            tenant_id=self.tenant_id,
            category=category,
            code='muslim',
            value_ar='مسلم',
            value_en='Muslim'
        )
        self.assertEqual(val.category.code, 'religion')
        self.assertEqual(val.value_ar, 'مسلم')