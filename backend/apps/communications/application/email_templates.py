# -*- coding: utf-8 -*-
"""
قالب البريد الإلكتروني الرسمي بهوية منصة نبراس التعليمية وبيانات المدرسة (المستأجر).

`wrap_branded_html` يلفّ نص الرسالة العادي داخل قالب HTML متجاوب بالهوية
(ترويسة بلون المدرسة + شعارها + بطاقة بيضاء + زر دخول + تذييل بمعلومات المدرسة).
يُستخدم تلقائياً لكل رسائل قناة البريد.

`build_brand_context` يجلب بيانات المستأجر (الاسم، الشعار، اللون، التواصل).

مصمّم للتوافق مع عملاء البريد: تخطيط جداول + أنماط مضمّنة (inline) + الخط المعتمد Cairo.
"""
import re
import logging

logger = logging.getLogger('nebras.communications')

# ألوان الهوية الافتراضية لنبراس (تُستخدم إن لم يكن للمستأجر لون مخصص)
_DEFAULT_PRIMARY = '#3F51B5'
_TEXT = '#1f2937'
_MUTED = '#64748b'

# الخط المعتمد في منصة نبراس
_FONT_STACK = "'Cairo','Segoe UI',Tahoma,Arial,sans-serif"
_FONT_IMPORT = (
    "https://fonts.googleapis.com/css2?"
    "family=Cairo:wght@400;600;700;800&display=swap"
)

_URL_RE = re.compile(r'(https?://[^\s<>"]+)')


def _darken(hex_color: str, factor: float = 0.82) -> str:
    """يعيد درجة أغمق من اللون لعمل تدرّج الترويسة."""
    try:
        h = hex_color.lstrip('#')
        if len(h) == 3:
            h = ''.join(c * 2 for c in h)
        r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
        r, g, b = (max(0, int(c * factor)) for c in (r, g, b))
        return f'#{r:02X}{g:02X}{b:02X}'
    except Exception:
        return _DEFAULT_PRIMARY


def build_brand_context(tenant_id):
    """يجلب بيانات علامة المستأجر (المدرسة) لبناء رسالة البريد.

    يعيد dict فيه: name, logo_url (مطلق أو None), color, phone, email, address.
    آمن: يعيد قيماً افتراضية بهوية نبراس عند غياب المستأجر.
    """
    brand = {
        'name': 'منصة نبراس التعليمية',
        'logo_url': None,
        'color': _DEFAULT_PRIMARY,
        'phone': None,
        'email': None,
        'address': None,
    }
    if not tenant_id:
        return brand
    try:
        from django.conf import settings
        from apps.tenants.domain.models import Tenant

        tenant = Tenant.objects.filter(id=tenant_id).first()
        if not tenant:
            return brand

        brand['name'] = tenant.name_ar or tenant.name or brand['name']
        if tenant.primary_color:
            brand['color'] = tenant.primary_color
        brand['phone'] = tenant.phone_number
        brand['email'] = tenant.email
        brand['address'] = tenant.address

        base = getattr(settings, 'PUBLIC_BASE_URL', '') or ''
        if tenant.logo and base:
            try:
                brand['logo_url'] = base + tenant.logo.url
            except Exception:
                brand['logo_url'] = None
    except Exception as e:
        logger.warning(f"تعذّر جلب بيانات علامة المستأجر للبريد: {e}")
    return brand


def _format_body(body_text: str) -> str:
    """يحوّل النص العادي إلى فقرات HTML آمنة مع تمييز أسطر «المفتاح: القيمة»."""
    from html import escape

    lines = [ln.strip() for ln in (body_text or '').split('\n')]
    html_parts = []
    for ln in lines:
        if not ln:
            continue
        safe = escape(ln)
        is_credential = (
            ':' in ln and not ln.startswith('http')
            and _URL_RE.sub('', ln).count(':') >= 1
        )
        if is_credential:
            html_parts.append(
                f'<div style="background:#f1f5f9;border-radius:8px;'
                f'padding:10px 14px;margin:6px 0;color:{_TEXT};font-size:15px;'
                f'font-weight:600;direction:rtl;font-family:{_FONT_STACK};">{safe}</div>'
            )
        else:
            html_parts.append(
                f'<p style="margin:0 0 12px;color:{_TEXT};font-size:15px;'
                f'line-height:1.9;font-family:{_FONT_STACK};">{safe}</p>'
            )
    return '\n'.join(html_parts)


def _brand_header(brand: dict) -> str:
    """ترويسة الرسالة: شعار المدرسة (أو أيقونة) + اسمها بلونها."""
    color = brand.get('color') or _DEFAULT_PRIMARY
    dark = _darken(color)
    name = brand.get('name') or 'منصة نبراس التعليمية'
    logo_url = brand.get('logo_url')

    if logo_url:
        emblem = (
            f'<div style="display:inline-block;background:#ffffff;padding:8px 14px;'
            f'border-radius:12px;">'
            f'<img src="{logo_url}" alt="{name}" '
            f'style="max-height:52px;max-width:180px;display:block;" /></div>'
        )
    else:
        emblem = (
            '<div style="display:inline-block;background:rgba(255,255,255,0.15);'
            'width:60px;height:60px;line-height:60px;border-radius:14px;'
            'font-size:30px;">🎓</div>'
        )

    return f'''
        <tr><td style="background:linear-gradient(135deg,{color} 0%,{dark} 100%);
                       padding:30px 28px;text-align:center;">
          {emblem}
          <h1 style="margin:14px 0 2px;color:#ffffff;font-size:22px;font-weight:800;
                     font-family:{_FONT_STACK};">{name}</h1>
          <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;
                    font-family:{_FONT_STACK};">منصة نبراس التعليمية</p>
        </td></tr>'''


def _brand_footer(brand: dict) -> str:
    """تذييل الرسالة مع بيانات تواصل المدرسة إن وُجدت."""
    name = brand.get('name') or 'منصة نبراس التعليمية'
    contact_bits = []
    if brand.get('phone'):
        contact_bits.append(f'📞 {brand["phone"]}')
    if brand.get('email'):
        contact_bits.append(f'✉️ {brand["email"]}')
    if brand.get('address'):
        contact_bits.append(f'📍 {brand["address"]}')
    contact_line = ''
    if contact_bits:
        contact_line = (
            f'<p style="margin:0 0 8px;color:{_MUTED};font-size:12px;'
            f'font-family:{_FONT_STACK};direction:rtl;">'
            + ' &nbsp;•&nbsp; '.join(contact_bits) + '</p>'
        )

    return f'''
        <tr><td style="background:#f8fafc;padding:18px 28px;text-align:center;
                       border-top:1px solid #e2e8f0;">
          {contact_line}
          <p style="margin:0 0 4px;color:{_MUTED};font-size:12px;font-family:{_FONT_STACK};">
            هذه رسالة آلية — يُرجى عدم الرد عليها مباشرة.
          </p>
          <p style="margin:0;color:#94a3b8;font-size:11px;font-family:{_FONT_STACK};">
            © {name} — بواسطة منصة نبراس التعليمية
          </p>
        </td></tr>'''


def wrap_branded_html(body_text: str, subject: str = None, brand: dict = None) -> str:
    """يعيد رسالة HTML كاملة بهوية المدرسة (المستأجر) تحيط بنص الرسالة."""
    brand = brand or {}
    color = brand.get('color') or _DEFAULT_PRIMARY
    inner = _format_body(body_text or '')
    title = subject or brand.get('name') or 'منصة نبراس التعليمية'

    cta_match = _URL_RE.search(body_text or '')
    cta_html = ''
    if cta_match:
        cta_html = f'''
        <tr><td align="center" style="padding:4px 32px 24px;">
          <a href="{cta_match.group(1)}" target="_blank"
             style="display:inline-block;background:{color};color:#ffffff;
                    text-decoration:none;font-weight:700;font-size:15px;
                    padding:13px 34px;border-radius:10px;font-family:{_FONT_STACK};">
            الدخول إلى المنصة
          </a>
        </td></tr>'''

    return f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link href="{_FONT_IMPORT}" rel="stylesheet">
<style>
  @import url('{_FONT_IMPORT}');
  body, table, td, p, h1, h2, a, div {{ font-family: {_FONT_STACK}; }}
</style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:{_FONT_STACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;
                    overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,0.12);">

        {_brand_header(brand)}

        <!-- المحتوى -->
        <tr><td style="padding:30px 32px 8px;">
          <h2 style="margin:0 0 16px;color:{_darken(color)};font-size:18px;font-weight:700;
                     direction:rtl;text-align:right;font-family:{_FONT_STACK};">{title}</h2>
          {inner}
        </td></tr>

        {cta_html}

        <!-- تنبيه أمني -->
        <tr><td style="padding:0 32px 24px;">
          <div style="border-inline-start:4px solid {color};background:#f1f5f9;
                      padding:12px 14px;border-radius:8px;color:{_MUTED};font-size:13px;
                      line-height:1.8;direction:rtl;text-align:right;font-family:{_FONT_STACK};">
            🔒 لأمان حسابك، يُرجى تغيير كلمة المرور المؤقتة بعد أول تسجيل دخول،
            وعدم مشاركة بيانات الدخول مع أي شخص.
          </div>
        </td></tr>

        {_brand_footer(brand)}

      </table>
    </td></tr>
  </table>
</body>
</html>'''
