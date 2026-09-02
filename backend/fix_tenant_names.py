# -*- coding: utf-8 -*-
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.tenants.domain.models import Tenant

tenants = Tenant.objects.all()
for t in tenants:
    t.name = "مدارس المورد الأهلية"
    t.name_ar = "مدارس المورد الأهلية النموذجية"
    t.name_en = "Al-Mawrid Model Private Schools"
    t.save()
    print(f"Updated Tenant ID: {t.id} -> {t.name_ar}")
