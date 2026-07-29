import 'package:dio/dio.dart';
import '../../../core/network/api_service.dart';
import '../domain/models.dart';

/// مستودع بيانات ولي الأمر — أبناؤه وتفاصيلهم وطلبات السداد والإعلانات.
class ParentRepository {
  ParentRepository(this._api);

  final ApiService _api;

  Future<List<ChildSummary>> getChildren() async {
    final res = await _api.get('/portal/parent/children/');
    final list = (res is Map ? res['children'] : res) as List? ?? [];
    return list.map((e) => ChildSummary.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<ChildDetail> getChild(String studentId) async {
    final res = await _api.get('/portal/parent/children/$studentId/');
    final data = (res is Map && res['data'] is Map) ? res['data'] : res;
    return ChildDetail.fromJson((data as Map).cast<String, dynamic>());
  }

  Future<List<Map<String, dynamic>>> getMyPayments() async {
    final res = await _api.get('/student-finance/online-payments/', query: {'mine': 'true'});
    final list = (res is Map ? (res['data'] ?? res['results'] ?? []) : res) as List? ?? [];
    return list.map((e) => (e as Map).cast<String, dynamic>()).toList();
  }

  /// إرسال طلب سداد بتحويل بنكي (مع إيصال اختياري).
  Future<void> submitPayment({
    required String billingAccountId,
    required String studentId,
    required double amount,
    required String bankName,
    required String transferReference,
    required String transferDate,
    String? senderName,
    String? note,
    String? receiptPath,
  }) async {
    final form = FormData.fromMap({
      'student_billing_account': billingAccountId,
      'student_id': studentId,
      'amount': amount,
      'bank_name': bankName,
      'transfer_reference': transferReference,
      'transfer_date': transferDate,
      if (senderName != null && senderName.isNotEmpty) 'sender_name': senderName,
      if (note != null && note.isNotEmpty) 'note': note,
      if (receiptPath != null)
        'receipt_attachment': await MultipartFile.fromFile(receiptPath),
    });
    await _api.postMultipart('/student-finance/online-payments/', form);
  }

  /// bytes فاتورة الطالب كملف PDF عربي.
  Future<List<int>> invoicePdf(String invoiceId) async {
    return _api.getBytes('/portal/invoices/$invoiceId/pdf/');
  }

  Future<List<Announcement>> getAnnouncements() async {
    final res = await _api.get('/portal/announcements/');
    final list = (res is Map ? (res['data'] ?? res['results'] ?? res['announcements'] ?? []) : res) as List? ?? [];
    return list.map((e) => Announcement.fromJson((e as Map).cast<String, dynamic>())).toList();
  }

  Future<void> contactSchool(String subject, String message) async {
    await _api.post('/portal/parent/contact/', data: {'subject': subject, 'message': message});
  }
}
