import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/ui/format.dart';
import '../application/parent_providers.dart';
import '../domain/models.dart';
import 'child_finance_page.dart';

/// الملف التعريفي الكامل للطالب (كصفحة تفاصيل الطالب في لوحة الإدارة):
/// البيانات الشخصية، الأكاديمية، صلات القرابة، ورابط الوضع المالي.
class ChildDetailPage extends ConsumerWidget {
  const ChildDetailPage({super.key, required this.studentId});

  final String studentId;

  String _gender(String? g) => g == 'male'
      ? 'ذكر'
      : g == 'female'
          ? 'أنثى'
          : (g ?? '—');

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
                _financeButton(context, child),
                const SizedBox(height: 16),
                _sectionTitle('البيانات الشخصية'),
                _infoCard([
                  _kv('الاسم', child.name),
                  _kv('الاسم بالإنجليزية', child.profile['english_name']?.toString()),
                  _kv('رقم القيد', child.studentNumber),
                  _kv('الصف', child.gradeLevel),
                  _kv('الجنس', _gender(child.profile['gender']?.toString())),
                  _kv('تاريخ الميلاد', prettyDate(child.profile['date_of_birth']?.toString())),
                  _kv('الجنسية', child.profile['nationality']?.toString()),
                  _kv('الرقم الوطني', child.profile['national_id']?.toString()),
                  _kv('رقم الجواز', child.profile['passport']?.toString()),
                  _kv('الديانة', child.profile['religion']?.toString()),
                  _kv('اللغات', _joinList(child.profile['languages'])),
                  _kv('الحالة', child.status),
                ]),
                if (_hasAny(child.profile,
                    const ['special_needs', 'learning_difficulty', 'talented_program', 'notes'])) ...[
                  const SizedBox(height: 16),
                  _sectionTitle('احتياجات ومواهب'),
                  _infoCard([
                    _kv('احتياجات خاصة', child.profile['special_needs']?.toString()),
                    _kv('صعوبات تعلّم', child.profile['learning_difficulty']?.toString()),
                    _kv('برنامج الموهوبين', child.profile['talented_program']?.toString()),
                    _kv('ملاحظات', child.profile['notes']?.toString()),
                  ]),
                ],
                const SizedBox(height: 16),
                _sectionTitle('الحالة الصحية'),
                _infoCard([
                  _kv('فصيلة الدم', child.medical['blood_group']?.toString()),
                  _kv('الحساسية', _joinList(child.medical['allergies'])),
                  _kv('أمراض مزمنة', _joinList(child.medical['chronic_diseases'])),
                  _kv('أدوية', _joinList(child.medical['medication'])),
                  _kv('إعاقات', _joinList(child.medical['disabilities'])),
                  _kv('ملاحظات طبية', child.medical['medical_notes']?.toString()),
                ]),
                if (child.addresses.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  _sectionTitle('العنوان'),
                  ..._addresses(child.addresses),
                ],
                const SizedBox(height: 16),
                _sectionTitle('جهات الطوارئ'),
                ..._emergency(child.emergencyContacts),
                const SizedBox(height: 16),
                _sectionTitle('صلات القرابة'),
                ..._family(child.familyRelations),
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
          radius: 32,
          backgroundColor: NebrasTheme.accent.withAlpha(30),
          child: const Icon(Icons.person, color: NebrasTheme.accent, size: 34),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(c.name,
                  style: GoogleFonts.tajawal(fontSize: 19, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text('${c.gradeLevel ?? '—'} · ${c.studentNumber}',
                  style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _financeButton(BuildContext context, ChildDetail c) {
    final hasDebt = c.finance.outstandingBalance > 0;
    return Material(
      color: (hasDebt ? NebrasTheme.danger : NebrasTheme.success).withAlpha(20),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => ChildFinancePage(studentId: c.studentId),
        )),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(hasDebt ? Icons.account_balance_wallet : Icons.check_circle,
                  color: hasDebt ? NebrasTheme.danger : NebrasTheme.success),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('الوضع المالي',
                        style: GoogleFonts.tajawal(fontSize: 14, fontWeight: FontWeight.w700)),
                    Text(
                      hasDebt ? 'متبقٍّ: ${money(c.finance.outstandingBalance)}' : 'لا مستحقّات',
                      style: GoogleFonts.tajawal(
                          fontSize: 12,
                          color: hasDebt ? NebrasTheme.danger : NebrasTheme.success),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_left, color: NebrasTheme.textMuted),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String t) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Text(t, style: GoogleFonts.tajawal(fontSize: 15, fontWeight: FontWeight.w700)),
      );

  Widget _infoCard(List<Widget> rows) {
    final visible = rows.whereType<_KV>().where((r) => r.hasValue).toList();
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        child: Column(children: visible),
      ),
    );
  }

  Widget _kv(String label, String? value) => _KV(label: label, value: value);

  /// يحوّل قائمة (لغات/حساسية…) إلى نصّ مفصول بفواصل، أو null إن فارغة.
  String? _joinList(dynamic v) {
    if (v is List) {
      final items = v.map((e) => '$e'.trim()).where((e) => e.isNotEmpty).toList();
      return items.isEmpty ? null : items.join('، ');
    }
    final s = v?.toString().trim();
    return (s == null || s.isEmpty) ? null : s;
  }

  bool _hasAny(Map<String, dynamic> m, List<String> keys) =>
      keys.any((k) => (m[k]?.toString().trim() ?? '').isNotEmpty);

  List<Widget> _addresses(List<Map<String, dynamic>> items) {
    return items.map((a) {
      final parts = [a['line1'], a['line2'], a['city'], a['state'], a['country']]
          .where((e) => e != null && '$e'.trim().isNotEmpty)
          .join('، ');
      return Card(
        child: ListTile(
          leading: const Icon(Icons.location_on, color: NebrasTheme.accent),
          title: Text(parts.isEmpty ? '—' : parts,
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 13.5)),
          subtitle: (a['address_type']?.toString().isNotEmpty ?? false)
              ? Text(a['address_type'].toString(), style: GoogleFonts.tajawal(fontSize: 12))
              : null,
        ),
      );
    }).toList();
  }

  List<Widget> _emergency(List<Map<String, dynamic>> items) {
    if (items.isEmpty) {
      return [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Text('لا توجد جهات طوارئ مسجّلة.',
              style: GoogleFonts.tajawal(color: NebrasTheme.textMuted, fontSize: 13)),
        ),
      ];
    }
    return items.map((c) {
      return Card(
        child: ListTile(
          leading: Icon(Icons.emergency,
              color: c['is_primary'] == true ? NebrasTheme.danger : NebrasTheme.accent),
          title: Text(c['name']?.toString() ?? '—',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text(
            [c['relationship'], c['phone']].where((e) => '$e'.isNotEmpty && e != null).join(' · '),
            style: GoogleFonts.tajawal(fontSize: 12),
          ),
          trailing: c['is_primary'] == true
              ? Text('أساسي',
                  style: GoogleFonts.tajawal(
                      fontSize: 11, fontWeight: FontWeight.w700, color: NebrasTheme.danger))
              : null,
        ),
      );
    }).toList();
  }

  List<Widget> _family(List<Map<String, dynamic>> rels) {
    if (rels.isEmpty) {
      return [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Text('لا توجد بيانات صلة قرابة.',
              style: GoogleFonts.tajawal(color: NebrasTheme.textMuted, fontSize: 13)),
        ),
      ];
    }
    return rels.map((r) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.people_alt, color: NebrasTheme.accent),
          title: Text(r['full_name']?.toString() ?? '—',
              style: GoogleFonts.tajawal(fontWeight: FontWeight.w600, fontSize: 14)),
          subtitle: Text(
            [r['relationship'], r['phone']].where((e) => '$e'.isNotEmpty && e != null).join(' · '),
            style: GoogleFonts.tajawal(fontSize: 12),
          ),
        ),
      );
    }).toList();
  }
}

class _KV extends StatelessWidget {
  const _KV({required this.label, required this.value});
  final String label;
  final String? value;

  bool get hasValue => value != null && value!.trim().isNotEmpty && value != '—';

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label,
                style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textMuted)),
          ),
          Expanded(
            child: Text(value ?? '—',
                style: GoogleFonts.tajawal(fontSize: 13.5, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
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
