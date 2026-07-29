import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/ui/format.dart';
import '../../application/parent_providers.dart';

/// تبويب المدفوعات: طلبات السداد التي أرسلها ولي الأمر وحالتها.
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
    final async = ref.watch(myPaymentsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('طلبات السداد')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Text(e.toString(),
              style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
        ),
        data: (items) {
          if (items.isEmpty) {
            return Center(
              child: Text('لا توجد طلبات سداد بعد.',
                  style: GoogleFonts.tajawal(color: NebrasTheme.textMuted)),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(myPaymentsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(14),
              itemCount: items.length,
              itemBuilder: (c, i) {
                final p = items[i];
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
              },
            ),
          );
        },
      ),
    );
  }
}
