# -*- coding: utf-8 -*-
"""
إشارات فوترة الطلاب — تهيئة كتالوج الرسوم والإعدادات تلقائياً لكل مستأجر جديد.
تعمل بعد تهيئة المالية (finance) لتوفّر شجرة الحسابات المطلوبة للربط.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.tenants.domain.models import Tenant
from apps.student_finance.application.provisioning import provision_student_finance_defaults

logger = logging.getLogger("nebras.student_finance")


@receiver(post_save, sender=Tenant, dispatch_uid="student_finance_provision_on_tenant_create")
def provision_student_finance_on_tenant_create(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        summary = provision_student_finance_defaults(instance.id)
        logger.info("تمت تهيئة فوترة الطلاب للمستأجر %s: %s", instance.id, summary)
    except Exception:
        logger.exception("تعذّرت تهيئة فوترة الطلاب الافتراضية للمستأجر %s", instance.id)
