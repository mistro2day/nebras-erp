import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers.dart';
import '../data/parent_repository.dart';
import '../domain/models.dart';

final parentRepositoryProvider = Provider<ParentRepository>((ref) {
  return ParentRepository(ref.watch(apiServiceProvider));
});

/// قائمة أبناء ولي الأمر.
final childrenProvider = FutureProvider.autoDispose<List<ChildSummary>>((ref) {
  return ref.watch(parentRepositoryProvider).getChildren();
});

/// تفاصيل ابن محدّد.
final childDetailProvider =
    FutureProvider.autoDispose.family<ChildDetail, String>((ref, studentId) {
  return ref.watch(parentRepositoryProvider).getChild(studentId);
});

/// طلبات السداد الخاصّة بولي الأمر.
final myPaymentsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) {
  return ref.watch(parentRepositoryProvider).getMyPayments();
});

/// الإعلانات.
final announcementsProvider = FutureProvider.autoDispose<List<Announcement>>((ref) {
  return ref.watch(parentRepositoryProvider).getAnnouncements();
});
