import uuid
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

from apps.approval_center.domain.models import ApprovalCategory
from apps.approval_center.application.services import ApprovalDelegationService


class ApprovalDelegationServiceTests(TestCase):
    def setUp(self):
        self.tenant_id = uuid.uuid4()
        self.category = ApprovalCategory.objects.create(
            tenant_id=self.tenant_id, name_ar='إجازة', name_en='Leave', code='LEAVE'
        )
        self.user_id = uuid.uuid4()
        self.delegate_id = uuid.uuid4()

    def test_create_delegation_without_feature_flag_configured_is_allowed(self):
        delegation = ApprovalDelegationService.create_delegation(
            self.tenant_id, self.user_id, self.delegate_id,
            timezone.now() - timedelta(days=1), timezone.now() + timedelta(days=1),
            category_id=self.category.id, reason='إجازة سنوية',
        )
        self.assertTrue(delegation.is_active)

    def test_overlapping_delegation_rejected(self):
        start = timezone.now() - timedelta(days=1)
        end = timezone.now() + timedelta(days=1)
        ApprovalDelegationService.create_delegation(
            self.tenant_id, self.user_id, self.delegate_id, start, end, category_id=self.category.id,
        )
        with self.assertRaises(ValidationError):
            ApprovalDelegationService.create_delegation(
                self.tenant_id, self.user_id, uuid.uuid4(), start, end, category_id=self.category.id,
            )

    def test_get_active_delegate_within_window(self):
        ApprovalDelegationService.create_delegation(
            self.tenant_id, self.user_id, self.delegate_id,
            timezone.now() - timedelta(hours=1), timezone.now() + timedelta(hours=1),
        )
        delegate = ApprovalDelegationService.get_active_delegate(self.tenant_id, self.user_id)
        self.assertEqual(delegate, self.delegate_id)

    def test_get_active_delegate_outside_window_returns_none(self):
        ApprovalDelegationService.create_delegation(
            self.tenant_id, self.user_id, self.delegate_id,
            timezone.now() - timedelta(days=5), timezone.now() - timedelta(days=3),
        )
        delegate = ApprovalDelegationService.get_active_delegate(self.tenant_id, self.user_id)
        self.assertIsNone(delegate)

    def test_deactivate_delegation(self):
        delegation = ApprovalDelegationService.create_delegation(
            self.tenant_id, self.user_id, self.delegate_id,
            timezone.now() - timedelta(hours=1), timezone.now() + timedelta(hours=1),
        )
        deactivated = ApprovalDelegationService.deactivate_delegation(self.tenant_id, delegation.id, self.user_id)
        self.assertFalse(deactivated.is_active)
        self.assertIsNone(ApprovalDelegationService.get_active_delegate(self.tenant_id, self.user_id))
