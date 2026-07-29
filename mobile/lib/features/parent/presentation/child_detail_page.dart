import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/ui/format.dart';
import '../application/parent_providers.dart';
import '../domain/models.dart';
import 'pay_page.dart';

/// تفاصيل ابن: البيانات الأساسية + الوضع المالي (فواتير/إيصالات) + زر السداد.
class ChildDetailPage extends ConsumerWidget {
  const ChildDetailPage({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(childDetailProvider(studentId));
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: const Text('ملف الطالب')),
        body: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => _ErrorView(
            message: e.toString(),
            onRetry: () => ref.invalidate(childDetailProvider(studentId)),
          ),
          data: (child) => RefreshIndicator(
            onRefresh: () async => ref.invalidate(childDetailProvider(studentId)),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _header(child),
                const SizedBox(height: 16),
                _financeCard(context, child),
                const SizedBox(height: 16),
                _sectionTitle('الفواتير'),
                ..._invoices(child.finance.invoices),
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

  Widget _header(ChildDetail c) {
    return Row(
      children: [
        CircleAvatar(
          radius: 30,
          backgroundColor: NebrasTheme.accent.withAlpha(30),
          child: const Icon(Icons.person, color: NebrasTheme.accent, size: 32),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(c.name,
                  style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w800)),
              Text('رقم القيد: ${c.studentNumber}',
                  style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
              if (c.gradeLevel != null)
                Text('الصف: ${c.gradeLevel}',
                    style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
            ],
          ),
        ),
      ],
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

  List<Widget> _invoices(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return [_empty('لا توجد فواتير.')];
    return items.map((i) {
      final total = i['total'] ?? i['total_amount'] ?? i['amount'];
      return Card(
        child: ListTile(
          leading: const Icon(Icons.receipt_long, color: NebrasTheme.accent),
          title: Text(i['number']?.toString() ?? i['invoice_number']?.toString() ?? 'فاتورة',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text(prettyDate(i['issue_date']?.toString() ?? i['created_at']?.toString()),
              style: GoogleFonts.tajawal(fontSize: 12)),
          trailing: Text(money(num.tryParse('$total') ?? 0),
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
        ),
      );
    }).toList();
  }

  List<Widget> _receipts(List<Map<String, dynamic>> items) {
    if (items.isEmpty) return [_empty('لا توجد سندات قبض.')];
    return items.map((r) {
      final amt = r['amount'] ?? r['total'];
      return Card(
        child: ListTile(
          leading: const Icon(Icons.check_circle, color: NebrasTheme.success),
          title: Text(r['number']?.toString() ?? r['receipt_number']?.toString() ?? 'سند قبض',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text(prettyDate(r['date']?.toString() ?? r['created_at']?.toString()),
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

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: NebrasTheme.danger),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: GoogleFonts.tajawal(fontSize: 14, color: NebrasTheme.textMuted)),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('إعادة المحاولة')),
          ],
        ),
      ),
    );
  }
}
