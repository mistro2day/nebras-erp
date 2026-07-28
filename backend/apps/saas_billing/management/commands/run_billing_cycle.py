"""تشغيل دورة فوترة المنصّة يدوياً من سطر الأوامر.

    python manage.py run_billing_cycle
    python manage.py run_billing_cycle --date 2026-08-01
"""
from datetime import date
from django.core.management.base import BaseCommand
from apps.saas_billing.application.services import run_billing_cycle


class Command(BaseCommand):
    help = 'تشغيل دورة فوترة المنصّة: متأخرات، تجديد الاشتراكات، توليد الفواتير، تصعيد الحالة.'

    def add_arguments(self, parser):
        parser.add_argument('--date', type=str, default=None,
                            help='تاريخ التشغيل بصيغة YYYY-MM-DD (افتراضياً اليوم).')

    def handle(self, *args, **options):
        run_date = date.fromisoformat(options['date']) if options.get('date') else None
        summary = run_billing_cycle(run_date)
        self.stdout.write(self.style.SUCCESS(f'دورة الفوترة اكتملت: {summary}'))
