import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/ui/format.dart';
import '../../application/parent_providers.dart';
import '../../domain/models.dart';
import '../child_finance_page.dart';

/// المركز المالي: مالية كل ابن (فواتير/سداد/PDF) + طلبات السداد وحالتها.
class PaymentsTab extends ConsumerWidget {
  const PaymentsTab({super.key});

  ({Color color, String label}) _status(String? s) {
    switch (s) {
      case 'approved':
        return (color: NebrasTheme.success, label: 'معتمد');
      case 'rejected':
        return (color: NebrasTheme.danger, label: 'مرفوض');
      default:
        return (color: NebrasTheme.warning, label: 'قيد المراجعة');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final children = ref.watch(childrenProvider);
    final payments = ref.watch(myPaymentsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('المدفوعات')),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(childrenProvider);
          ref.invalidate(myPaymentsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(14),
          children: [
            _title('الوضع المالي للأبناء'),
            const SizedBox(height: 8),
            children.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => _msg(e.toString()),
              data: (list) => list.isEmpty
                  ? _msg('لا يوجد أبناء.')
                  : Column(children: list.map((c) => _ChildFinanceRow(child: c)).toList()),
            ),
            const SizedBox(height: 22),
            _title('طلبات السداد'),
            const SizedBox(height: 8),
            payments.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(20),
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => _msg(e.toString()),
              data: (items) => items.isEmpty
                  ? _msg('لا توجد طلبات سداد بعد.')
                  : Column(
                      children: items.map((p) {
                        final st = _status(p['status']?.toString());
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: st.color.withAlpha(28),
                              child: Icon(Icons.receipt, color: st.color),
                            ),
                            title: Text(money(num.tryParse('${p['amount']}') ?? 0),
                                style: GoogleFonts.tajawal(fontWeight: FontWeight.w700)),
                            subtitle: Text(
                              '${p['bank_name'] ?? ''} · ${prettyDate(p['transfer_date']?.toString() ?? p['created_at']?.toString())}',
                              style: GoogleFonts.tajawal(fontSize: 12),
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: st.color.withAlpha(24),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(st.label,
                                  style: GoogleFonts.tajawal(
                                      fontSize: 12, fontWeight: FontWeight.w700, color: st.color)),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _title(String t) =>
      Text(t, style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w800));

  Widget _msg(String t) => Padding(
        padding: const EdgeInsets.all(12),
        child: Text(t, style: GoogleFonts.tajawal(color: NebrasTheme.textMuted, fontSize: 13)),
      );
}

class _ChildFinanceRow extends StatelessWidget {
  const _ChildFinanceRow({required this.child});
  final ChildSummary child;

  @override
  Widget build(BuildContext context) {
    final hasDebt = child.outstandingBalance > 0;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ChildFinancePage(studentId: child.studentId),
        )),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: NebrasTheme.accent.withAlpha(24),
                child: const Icon(Icons.person, color: NebrasTheme.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(child.name,
                        style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      hasDebt ? 'متبقٍّ: ${money(child.outstandingBalance)}' : 'لا مستحقّات',
                      style: GoogleFonts.tajawal(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: hasDebt ? NebrasTheme.danger : NebrasTheme.success),
                    ),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('التفاصيل والفواتير',
                      style: GoogleFonts.tajawal(fontSize: 11.5, color: NebrasTheme.accent)),
                  const Icon(Icons.chevron_left, color: NebrasTheme.textMuted),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
