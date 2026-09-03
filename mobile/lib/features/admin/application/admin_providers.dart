import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nebras_mobile/core/providers.dart';
import 'package:nebras_mobile/features/admin/data/admin_repository.dart';
import 'package:nebras_mobile/features/admin/domain/admin_models.dart';

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  return AdminRepository(ref.watch(apiServiceProvider));
});

final adminSummaryProvider = FutureProvider<AdminDashboardSummary>((ref) async {
  final repo = ref.watch(adminRepositoryProvider);
  return repo.fetchDashboardSummary();
});

class ApprovalsNotifier extends AsyncNotifier<List<ApprovalItem>> {
  @override
  Future<List<ApprovalItem>> build() async {
    final repo = ref.watch(adminRepositoryProvider);
    return repo.fetchApprovalItems();
  }

  Future<void> decide(String id, bool approve, {String? reason}) async {
    final repo = ref.read(adminRepositoryProvider);
    await repo.decideApproval(id, approve, reason: reason);
    // تحديث القائمة محلياً
    state = AsyncData(
      state.value?.where((item) => item.id != id).toList() ?? [],
    );
    // وتحديث العداد في الداشبورد
    ref.invalidate(adminSummaryProvider);
  }
}

final adminApprovalsProvider =
    AsyncNotifierProvider<ApprovalsNotifier, List<ApprovalItem>>(
  ApprovalsNotifier.new,
);

final liveAttendanceProvider =
    FutureProvider<List<LiveAttendanceItem>>((ref) async {
  final repo = ref.watch(adminRepositoryProvider);
  return repo.fetchLiveAttendance();
});
