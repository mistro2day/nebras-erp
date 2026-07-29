import 'package:intl/intl.dart';

final _money = NumberFormat.decimalPattern('ar');

/// تنسيق مبلغ مالي بالجنيه السوداني.
String money(num? value) => '${_money.format(value ?? 0)} ج.س';

/// تنسيق تاريخ ISO إلى صيغة عربية مختصرة.
String prettyDate(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return iso;
  return DateFormat('yyyy/MM/dd', 'ar').format(dt);
}
