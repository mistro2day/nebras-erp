// نماذج بيانات بوابة ولي الأمر.

double _toDouble(dynamic v) {
  if (v == null) return 0;
  if (v is num) return v.toDouble();
  return double.tryParse(v.toString()) ?? 0;
}

class ChildSummary {
  ChildSummary({
    required this.studentId,
    required this.studentNumber,
    required this.name,
    required this.status,
    required this.gradeLevel,
    required this.outstandingBalance,
    required this.billingAccountId,
  });

  final String studentId;
  final String studentNumber;
  final String name;
  final String status;
  final String? gradeLevel;
  final double outstandingBalance;
  final String? billingAccountId;

  factory ChildSummary.fromJson(Map<String, dynamic> j) => ChildSummary(
        studentId: j['student_id']?.toString() ?? '',
        studentNumber: j['student_number']?.toString() ?? '',
        name: j['name']?.toString() ?? 'طالب',
        status: j['status']?.toString() ?? '',
        gradeLevel: j['grade_level']?.toString(),
        outstandingBalance: _toDouble(j['outstanding_balance']),
        billingAccountId: j['billing_account_id']?.toString(),
      );
}

class ChildFinance {
  ChildFinance({
    required this.outstandingBalance,
    required this.creditBalance,
    required this.invoices,
    required this.receipts,
    required this.onlinePayments,
    required this.billingAccountId,
  });

  final double outstandingBalance;
  final double creditBalance;
  final List<Map<String, dynamic>> invoices;
  final List<Map<String, dynamic>> receipts;
  final List<Map<String, dynamic>> onlinePayments;
  final String? billingAccountId;

  factory ChildFinance.fromJson(Map<String, dynamic> j) => ChildFinance(
        outstandingBalance: _toDouble(j['outstanding_balance']),
        creditBalance: _toDouble(j['credit_balance']),
        billingAccountId: j['billing_account_id']?.toString(),
        invoices: _list(j['invoices']),
        receipts: _list(j['receipts']),
        onlinePayments: _list(j['online_payments']),
      );

  static List<Map<String, dynamic>> _list(dynamic v) =>
      (v as List? ?? []).map((e) => (e as Map).cast<String, dynamic>()).toList();
}

class ChildDetail {
  ChildDetail({
    required this.studentId,
    required this.studentNumber,
    required this.status,
    required this.gradeLevel,
    required this.profile,
    required this.finance,
    required this.familyRelations,
  });

  final String studentId;
  final String studentNumber;
  final String status;
  final String? gradeLevel;
  final Map<String, dynamic> profile;
  final ChildFinance finance;
  final List<Map<String, dynamic>> familyRelations;

  String get name {
    // الخادم يُرجع الاسم العربي في profile['name']؛ نُبقي بدائل احتياطية.
    final direct = (profile['name'] ?? profile['full_name'] ?? '').toString().trim();
    if (direct.isNotEmpty && direct != '—') return direct;
    final fn = profile['first_name'] ?? '';
    final ln = profile['last_name'] ?? '';
    final joined = [fn, ln].where((e) => '$e'.isNotEmpty).join(' ').trim();
    return joined.isNotEmpty ? joined : 'طالب $studentNumber';
  }

  factory ChildDetail.fromJson(Map<String, dynamic> j) => ChildDetail(
        studentId: j['student_id']?.toString() ?? '',
        studentNumber: j['student_number']?.toString() ?? '',
        status: j['status']?.toString() ?? '',
        gradeLevel: j['grade_level']?.toString(),
        profile: (j['profile'] as Map?)?.cast<String, dynamic>() ?? {},
        finance: ChildFinance.fromJson(
            (j['finance'] as Map?)?.cast<String, dynamic>() ?? {}),
        familyRelations: (j['family_relations'] as List? ?? [])
            .map((e) => (e as Map).cast<String, dynamic>())
            .toList(),
      );
}

class Announcement {
  Announcement({required this.title, required this.body, required this.date});

  final String title;
  final String body;
  final String? date;

  factory Announcement.fromJson(Map<String, dynamic> j) => Announcement(
        title: j['title']?.toString() ?? '',
        body: (j['body'] ?? j['content'] ?? '').toString(),
        date: (j['published_at'] ?? j['created_at'])?.toString(),
      );
}
