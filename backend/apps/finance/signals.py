# -*- coding: utf-8 -*-
"""
إشارات النظام المالي — تهيئة الدليل المحاسبي القياسي تلقائياً لكل مستأجر جديد.

عند إنشاء أي مستأجر (Tenant) جديد، تُنشأ فوراً شجرة الحسابات المعروفة لأنظمة المدارس
والبيانات المرجعية (العملات، طرق الدفع، الضرائب، الإعدادات) لتكون جاهزة للاستخدام.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.tenants.domain.models import Tenant
from apps.finance.application.provisioning import provision_finance_defaults

logger = logging.getLogger("nebras.finance")


@receiver(post_save, sender=Tenant, dispatch_uid="finance_provision_defaults_on_tenant_create")
def provision_finance_on_tenant_create(sender, instance, created, **kwargs):
    if not created:
        return
    try:
        summary = provision_finance_defaults(instance.id)
        logger.info("تمت تهيئة النظام المالي للمستأجر %s: %s", instance.id, summary)
    except Exception:
        # لا نُفشل إنشاء المستأجر إذا تعثّرت التهيئة؛ يمكن تداركها لاحقاً بأمر provision_finance
        logger.exception("تعذّرت تهيئة النظام المالي الافتراضي للمستأجر %s", instance.id)
