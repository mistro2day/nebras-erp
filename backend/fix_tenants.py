# -*- coding: utf-8 -*-
import os
import sys

# Ensure UTF-8 IO
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.tenants.domain.models import Tenant

for t in Tenant.objects.all():
    if t.subdomain == 'admin':
        t.name = "مدارس النبراس النموذجية الأهلية"
        t.name_ar = "مدارس النبراس النموذجية الأهلية"
        t.name_en = "Nebras Model Private Schools"
    else:
        t.name = "مدارس المورد الأهلية"
        t.name_ar = "مدارس المورد الأهلية النموذجية"
        t.name_en = "Al-Mawrid Model Schools"
    t.save()
    print(f"Updated Tenant: ID={t.id}, Subdomain={t.subdomain}, NameAr={t.name_ar}")
