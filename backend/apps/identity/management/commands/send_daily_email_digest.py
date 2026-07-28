import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from apps.identity.domain.models import User

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'إرسال ملخص الإشعارات اليومي البريدي للمستخدمين المفعلين لخيار email_digest'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='طباعة الملخص البريدي دون إرساله فعلياً',
        )
        parser.add_argument(
            '--user-email',
            type=str,
            help='تحديد بريد مستخدم معين فقط للاختبار',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry-run', False)
        target_email = options.get('user_email')

        self.stdout.write(self.style.SUCCESS('[START] بدء عملية إرسال ملخص الإشعارات اليومي البريدي...'))

        users_qs = User.objects.filter(is_active=True, deleted_at__isnull=True)
        if target_email:
            users_qs = users_qs.filter(email=target_email)

        # تصفية المستخدمين الذين لديهم تفضيل email_digest = true
        digest_users = []
        for user in users_qs:
            prefs = user.preferences or {}
            digest_enabled = prefs.get('email_digest')
            if digest_enabled in (True, 'true', 'True', 1, '1') or target_email:
                digest_users.append(user)

        self.stdout.write(f'[INFO] عدد المستخدمين المؤهلين لاستلام الملخص: {len(digest_users)}')

        since_time = timezone.now() - timedelta(days=1)
        sent_count = 0

        # محاولة جلب نماذج الإشعارات من الباك اند
        NotificationModel = None
        try:
            from apps.communications.domain.models import Notification as CommNotification
            NotificationModel = CommNotification
        except ImportError:
            try:
                from apps.platform.domain.models import Notification as PlatNotification
                NotificationModel = PlatNotification
            except ImportError:
                pass

        for user in digest_users:
            user_notifications = []
            if NotificationModel:
                try:
                    user_notifications = list(
                        NotificationModel.objects.filter(
                            user_id=user.id,
                            created_at__gte=since_time
                        ).order_by('-created_at')[:10]
                    )
                except Exception as e:
                    logger.warning(f"تعذر جلب الإشعارات للمستخدم {user.email}: {e}")

            # إنشاء نص ومحتوى البريد الإلكتروني
            full_name = f"{user.first_name} {user.last_name}".strip() or user.email
            notif_count = len(user_notifications)

            subject = f"ملخص إشعاراتك اليومي في نبراس OS ({notif_count} إشعار جديد)"

            # تجميع محتوى الإشعارات
            notif_html_items = ""
            notif_text_items = ""

            if user_notifications:
                for n in user_notifications:
                    title = getattr(n, 'title', 'إشعار جديد')
                    body = getattr(n, 'body', '')
                    created_at = getattr(n, 'created_at', timezone.now()).strftime('%H:%M')

                    notif_html_items += f"""
                    <div style="background:#f8fafc; border-right:4px solid #4f46e5; border-radius:6px; padding:12px 16px; margin-bottom:10px;">
                        <div style="font-weight:700; color:#0f172a; font-size:14px;">{title} <span style="font-size:11px; color:#64748b; font-weight:normal;">({created_at})</span></div>
                        <div style="color:#475569; font-size:13px; margin-top:4px;">{body}</div>
                    </div>
                    """
                    notif_text_items += f"- {title}: {body}\n"
            else:
                notif_html_items = """
                <div style="background:#f1f5f9; border-radius:6px; padding:16px; text-align:center; color:#64748b; font-size:13px;">
                    لا توجد إشعارات جديدة خلال الـ 24 ساعة الماضية. حسابك آمن ومحدث كلياً!
                </div>
                """
                notif_text_items = "لا توجد إشعارات جديدة خلال 24 ساعة الماضية.\n"

            html_content = f"""
            <div dir="rtl" style="font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color:#f1f5f9; padding:30px 15px; color:#0f172a;">
                <div style="max-width:580px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); border:1px solid #e2e8f0;">
                    <!-- الهيدر -->
                    <div style="background:linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding:24px; text-align:center; color:#ffffff;">
                        <h1 style="margin:0; font-size:22px; font-weight:800; letter-spacing:-0.5px;">نبراس OS</h1>
                        <p style="margin:6px 0 0; font-size:13px; opacity:0.9;">ملخص الإشعارات اليومية والتنبيهات المباشرة</p>
                    </div>

                    <!-- محتوى الرسالة -->
                    <div style="padding:28px 24px;">
                        <h2 style="font-size:16px; color:#0f172a; margin-top:0;">أهلاً بك، {full_name} 👋</h2>
                        <p style="color:#475569; font-size:13.5px; line-height:1.6;">
                            إليك ملخص سريع بأهم التحديثات والإشعارات التي تلقتها محطتك في نظام نبراس خلال الـ 24 ساعة الماضية:
                        </p>

                        <div style="margin:20px 0;">
                            {notif_html_items}
                        </div>

                        <div style="text-align:center; margin-top:30px;">
                            <a href="http://localhost:4200/dashboard" style="display:inline-block; background:#2563eb; color:#ffffff; font-weight:700; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:13.5px;">
                                الانتقال لنظام نبراس OS
                            </a>
                        </div>
                    </div>

                    <!-- الفوتر -->
                    <div style="background:#f8fafc; border-top:1px solid #f1f5f9; padding:16px 24px; text-align:center; font-size:11.5px; color:#94a3b8;">
                        وصلتك هذه الرسالة لأنك قمت بتفعيل خيار "ملخص الإشعارات البريدي" في إعدادات حسابك.<br/>
                        مجموعة مدارس ومؤسسات النبراس الأهلية © {timezone.now().year}
                    </div>
                </div>
            </div>
            """

            text_content = f"أهلاً {full_name}\n\nملخص إشعاراتك اليومية في نبراس OS:\n\n{notif_text_items}\n\nللدخول للنظام: http://localhost:4200"

            if dry_run:
                self.stdout.write(self.style.NOTICE(f"[DRY-RUN] البريد الموجّه لـ {user.email}:\n{text_content}"))
                sent_count += 1
            else:
                try:
                    msg = EmailMultiAlternatives(
                        subject=subject,
                        body=text_content,
                        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'نبراس OS <notifications@nebras-erp.local>'),
                        to=[user.email]
                    )
                    msg.attach_alternative(html_content, "text/html")
                    msg.send(fail_silently=False)
                    sent_count += 1
                    self.stdout.write(self.style.SUCCESS(f"[SUCCESS] تم إرسال الملخص البريدي بنجاح إلى: {user.email}"))
                except Exception as e:
                    self.stderr.write(self.style.ERROR(f"[ERROR] فشل إرسال البريد إلى {user.email}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"[DONE] اكتملت العملية. إجمالي الرسائل المرسلة: {sent_count}"))
