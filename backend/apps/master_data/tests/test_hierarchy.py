from django.test import TestCase
from django.core.exceptions import ValidationError
from apps.master_data.domain.models import MasterCategory, MasterItem
from apps.master_data.application.services import HierarchyValidationService
import uuid

class MasterDataHierarchyTest(TestCase):
    """
    اختبارات قواعد الأعمال والتسلسل الهرمي للبيانات المرجعية (MDM Verification)
    """
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.category = MasterCategory.objects.create(
            tenant_id=self.tenant_id,
            code='academic_levels',
            name_ar='الصفوف الدراسية',
            name_en='Academic Levels'
        )

    def test_circular_reference_prevention(self):
        item1 = MasterItem.objects.create(
            tenant_id=self.tenant_id,
            category=self.category,
            code='level1',
            value_ar='المستوى الأول',
            value_en='Level 1'
        )
        item2 = MasterItem.objects.create(
            tenant_id=self.tenant_id,
            category=self.category,
            code='level2',
            value_ar='المستوى الثاني',
            value_en='Level 2',
            parent=item1
        )
        
        # محاكاة ربط الأب بشكل دائري: جعل level1 ابناً لـ level2
        is_circular = HierarchyValidationService.check_circular_reference(item1.id, item2.id)
        self.assertTrue(is_circular)

    def test_valid_hierarchy(self):
        item1 = MasterItem.objects.create(
            tenant_id=self.tenant_id,
            category=self.category,
            code='level1',
            value_ar='المستوى الأول',
            value_en='Level 1'
        )
        item2 = MasterItem.objects.create(
            tenant_id=self.tenant_id,
            category=self.category,
            code='level2',
            value_ar='المستوى الثاني',
            value_en='Level 2'
        )
        is_circular = HierarchyValidationService.check_circular_reference(item1.id, item2.id)
        self.assertFalse(is_circular)