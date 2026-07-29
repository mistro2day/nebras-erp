"""توليد فاتورة رسوم الطالب كملف PDF عربي لبوابتَي ولي الأمر والطالب.

يعيد استخدام أدوات التعريب (Amiri + reshaper + bidi) من موديول التقارير.
"""
import io
from django.core.exceptions import PermissionDenied

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
)

from apps.reporting.application.exporters import ar, _register_fonts  # تعريب + خطوط

_BRAND = colors.HexColor('#0f766e')
_HEADER_BG = colors.HexColor('#0f766e')
_MUTED = colors.HexColor('#64748b')
_ROW_ALT = colors.HexColor('#f1f5f9')


def _tenant_name(tenant_id):
    try:
        from apps.tenants.domain.models import Tenant
        t = Tenant.objects.filter(id=tenant_id).first()
        return t.name_ar or t.name if t else 'نبراس'
    except Exception:
        return 'نبراس'


def _resolve_invoice(tenant_id, invoice_id):
    from apps.student_finance.domain.models import StudentInvoice
    return (StudentInvoice.objects
            .filter(id=invoice_id, tenant_id=tenant_id, deleted_at__isnull=True)
            .select_related('student_billing_account').first())


def _check_access(user, invoice):
    """يتحقّق أن المستخدم (ولي أمر/طالب) يملك حقّ رؤية فاتورة هذا الطالب."""
    from apps.portal.domain.models import PortalUser
    from apps.portal.application.services import PortalAccessRuleService
    student_id = str(invoice.student_billing_account.student_id)
    try:
        pu = PortalUser.objects.get(user=user)
    except PortalUser.DoesNotExist:
        raise PermissionDenied('المستخدم غير مسجّل ببوابة الخدمات الرقمية.')

    if pu.user_type == 'parent':
        PortalAccessRuleService.validate_parent_student_access(pu, student_id)
    elif pu.user_type == 'student':
        own = getattr(getattr(pu, 'profile', None), 'student_profile', None)
        if not own or str(getattr(own, 'student_id', '')) != student_id:
            raise PermissionDenied('لا تملك صلاحية لعرض هذه الفاتورة.')
    else:
        raise PermissionDenied('لا تملك صلاحية لعرض هذه الفاتورة.')
    return student_id


def build_invoice_pdf(tenant_id, user, invoice_id, student_name=None):
    """يُرجع (اسم الملف، bytes) أو يرفع PermissionDenied/ValueError."""
    invoice = _resolve_invoice(tenant_id, invoice_id)
    if not invoice:
        raise ValueError('الفاتورة غير موجودة.')
    _check_access(user, invoice)
    _register_fonts()

    acc = invoice.student_billing_account
    from apps.student_finance.domain.models import InvoiceItem
    items = list(InvoiceItem.objects.filter(invoice_id=invoice.id, deleted_at__isnull=True)
                 .select_related('fee_type'))

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm, title=invoice.invoice_number)
    title = ParagraphStyle('t', fontName='Amiri-Bold', fontSize=18, textColor=_BRAND,
                           alignment=2, spaceAfter=2)
    sub = ParagraphStyle('s', fontName='Amiri', fontSize=10.5, textColor=_MUTED, alignment=2)
    cell = ParagraphStyle('c', fontName='Amiri', fontSize=10, textColor=colors.HexColor('#0f172a'), alignment=2)
    head = ParagraphStyle('h', fontName='Amiri-Bold', fontSize=10, textColor=colors.white, alignment=2)

    story = [
        Paragraph(ar(_tenant_name(tenant_id)), title),
        Paragraph(ar('فاتورة رسوم دراسية'), sub),
        Spacer(1, 10),
    ]

    # بيانات الفاتورة والطالب
    meta = [
        [Paragraph(ar(f'رقم الفاتورة: {invoice.invoice_number}'), cell),
         Paragraph(ar(f'الطالب: {student_name or "-"}'), cell)],
        [Paragraph(ar(f'تاريخ الإصدار: {invoice.issue_date}'), cell),
         Paragraph(ar(f'رقم القيد المالي: {acc.account_number or "-"}'), cell)],
        [Paragraph(ar(f'تاريخ الاستحقاق: {invoice.due_date}'), cell),
         Paragraph(ar(f'الحالة: {invoice.status}'), cell)],
    ]
    mt = Table(meta, colWidths=['50%', '50%'])
    mt.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                            ('BOTTOMPADDING', (0, 0), (-1, -1), 5)]))
    story += [mt, Spacer(1, 12)]

    # بنود الفاتورة
    data = [[Paragraph(ar('المبلغ'), head), Paragraph(ar('البيان'), head), Paragraph(ar('#'), head)]]
    if items:
        for i, it in enumerate(items, 1):
            label = it.description or (it.fee_type.name_ar if it.fee_type_id else 'بند')
            data.append([
                Paragraph(ar(f'{float(it.amount):,.0f}'), cell),
                Paragraph(ar(label), cell),
                Paragraph(ar(str(i)), cell),
            ])
    else:
        data.append([Paragraph(ar(f'{float(invoice.total_amount):,.0f}'), cell),
                     Paragraph(ar('إجمالي رسوم الفاتورة'), cell), Paragraph(ar('1'), cell)])

    tbl = Table(data, colWidths=['30%', '55%', '15%'])
    style = [
        ('BACKGROUND', (0, 0), (-1, 0), _HEADER_BG),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for r in range(1, len(data)):
        if r % 2 == 0:
            style.append(('BACKGROUND', (0, r), (-1, r), _ROW_ALT))
    tbl.setStyle(TableStyle(style))
    story += [tbl, Spacer(1, 12)]

    # المجاميع
    tot = ParagraphStyle('tot', fontName='Amiri-Bold', fontSize=11, alignment=2)
    totals = [
        [Paragraph(ar(f'{float(invoice.total_amount):,.0f} ج.س'), tot), Paragraph(ar('الإجمالي'), tot)],
        [Paragraph(ar(f'{float(invoice.paid_amount):,.0f} ج.س'), cell), Paragraph(ar('المدفوع'), cell)],
        [Paragraph(ar(f'{float(invoice.outstanding_amount):,.0f} ج.س'), tot), Paragraph(ar('المتبقّي'), tot)],
    ]
    tt = Table(totals, colWidths=['30%', '70%'])
    tt.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                            ('LINEABOVE', (0, 0), (-1, 0), 0.5, colors.HexColor('#e2e8f0')),
                            ('TOPPADDING', (0, 0), (-1, -1), 5)]))
    story.append(tt)

    doc.build(story)
    buf.seek(0)
    return f'{invoice.invoice_number}.pdf', buf.getvalue()
