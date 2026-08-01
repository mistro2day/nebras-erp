import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:printing/printing.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/ui/format.dart';
import '../application/parent_providers.dart';
import '../domain/models.dart';
import 'pay_page.dart';

/// الوضع المالي لابن: الرصيد + الفواتير (تفاصيل + PDF) + سندات القبض + السداد.
class ChildFinancePage extends ConsumerWidget {
  const ChildFinancePage({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(childDetailProvider(studentId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('الوضع المالي')),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(e.toString(),
                  textAlign: TextAlign.center,
                  style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
            ),
          ),
          data: (child) => RefreshIndicator(
            onRefresh: () async => ref.invalidate(childDetailProvider(studentId)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(child.name,
                    style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                _financeCard(context, child),
                const SizedBox(height: 16),
                _sectionTitle('الفواتير'),
                ..._invoices(context, ref, child.name, child.finance.invoices),
                const SizedBox(height: 12),
                _sectionTitle('سندات القبض'),
                ..._receipts(child.finance.receipts),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _financeCard(BuildContext context, ChildDetail c) {
    final f = c.finance;
    final hasDebt = f.outstandingBalance > 0;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: hasDebt
              ? [NebrasTheme.danger, const Color(0xFFB91C1C)]
              : [NebrasTheme.success, const Color(0xFF047857)],
        ),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(hasDebt ? 'المتبقّي على الطالب' : 'لا توجد مستحقّات',
              style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 6),
          Text(money(f.outstandingBalance),
              style: GoogleFonts.tajawal(
                  color: Colors.white, fontSize: 26, fontWeight: FontWeight.w800)),
          if (f.creditBalance > 0)
            Text('رصيد دائن: ${money(f.creditBalance)}',
                style: GoogleFonts.tajawal(color: Colors.white70, fontSize: 12)),
          if (hasDebt && f.billingAccountId != null) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: NebrasTheme.danger,
                ),
                onPressed: () => context.push('/parent/pay',
                    extra: PayArgs(
                      billingAccountId: f.billingAccountId!,
                      studentId: c.studentId,
                      childName: c.name,
                      outstanding: f.outstandingBalance,
                    )),
                icon: const Icon(Icons.payment),
                label: Text('سداد الرسوم',
                    style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Text(t, style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
      );

  List<Widget> _invoices(
      BuildContext context, WidgetRef ref, String childName, List<Map<String, dynamic>> items) {
    if (items.isEmpty) return [_empty('لا توجد فواتير.')];
    return items.map((i) {
      final total = i['total'] ?? i['total_amount'] ?? i['amount'];
      return Card(
        child: ListTile(
          leading: const Icon(Icons.receipt_long, color: NebrasTheme.accent),
          title: Text(i['invoice_number']?.toString() ?? i['number']?.toString() ?? 'فاتورة',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text(prettyDate(i['issue_date']?.toString() ?? i['created_at']?.toString()),
              style: GoogleFonts.tajawal(fontSize: 12)),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(money(num.tryParse('$total') ?? 0),
                  style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
              const SizedBox(width: 4),
              const Icon(Icons.chevron_left, color: NebrasTheme.textMuted, size: 20),
            ],
          ),
          onTap: () => _showInvoiceSheet(context, ref, childName, i),
        ),
      );
    }).toList();
  }

  void _showInvoiceSheet(
      BuildContext context, WidgetRef ref, String childName, Map<String, dynamic> inv) {
    final id = inv['id']?.toString();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Directionality(
        textDirection: TextDirection.rtl,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(inv['invoice_number']?.toString() ?? 'فاتورة',
                  style: GoogleFonts.tajawal(fontSize: 17, fontWeight: FontWeight.w800)),
              Text(childName,
                  style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
              const SizedBox(height: 14),
              _row('تاريخ الإصدار', prettyDate(inv['issue_date']?.toString())),
              _row('تاريخ الاستحقاق', prettyDate(inv['due_date']?.toString())),
              _row('الإجمالي', money(num.tryParse('${inv['total_amount'] ?? inv['total']}') ?? 0)),
              _row('المدفوع', money(num.tryParse('${inv['paid_amount'] ?? 0}') ?? 0)),
              _row('المتبقّي',
                  money(num.tryParse('${inv['outstanding_amount'] ?? 0}') ?? 0), strong: true),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                onPressed: id == null
                    ? null
                    : () async {
                        Navigator.pop(ctx);
                        await _openInvoicePdf(context, ref, id);
                      },
                icon: const Icon(Icons.picture_as_pdf),
                label: Text('عرض / طباعة PDF',
                    style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openInvoicePdf(BuildContext context, WidgetRef ref, String invoiceId) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );
    try {
      final bytes = await ref.read(parentRepositoryProvider).invoicePdf(invoiceId);
      if (context.mounted) Navigator.of(context).pop();
      await Printing.layoutPdf(onLayout: (_) async => Uint8List.fromList(bytes));
    } catch (e) {
      if (context.mounted) Navigator.of(context).pop();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: NebrasTheme.danger),
        );
      }
    }
  }

  Widget _row(String label, String value, {bool strong = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 5),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
            Text(value,
                style: GoogleFonts.tajawal(
                    fontSize: strong ? 15 : 13,
                    fontWeight: strong ? FontWeight.w800 : FontWeight.w600,
                    color: strong ? NebrasTheme.danger : NebrasTheme.textDark)),
          ],
        ),
      );

  List<Widget> _receipts(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return [_empty('لا توجد سندات قبض.')];
    return items.map((r) {
      final amt = r['amount'] ?? r['total'];
      return Card(
        child: ListTile(
          leading: const Icon(Icons.check_circle, color: NebrasTheme.success),
          title: Text(r['receipt_number']?.toString() ?? r['number']?.toString() ?? 'سند قبض',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text(prettyDate(r['payment_date']?.toString() ?? r['created_at']?.toString()),
              style: GoogleFonts.tajawal(fontSize: 12)),
          trailing: Text(money(num.tryParse('$amt') ?? 0),
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w700, color: NebrasTheme.success)),
        ),
      );
    }).toList();
  }

  Widget _empty(String t) => Padding(
        padding: const EdgeInsets.all(12),
        child: Text(t, style: GoogleFonts.tajawal(color: NebrasTheme.textMuted, fontSize: 13)),
      );
}
