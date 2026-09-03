import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nebras_mobile/core/providers.dart';
import '../data/admission_repository.dart';
import '../domain/admission_models.dart';

final admissionsRepositoryProvider = Provider<AdmissionsRepository>((ref) {
  return AdmissionsRepository(ref.watch(apiServiceProvider));
});

final admissionsStatsProvider = FutureProvider<AdmissionsStats>((ref) async {
  final repo = ref.watch(admissionsRepositoryProvider);
  return repo.fetchStats();
});

class AdmissionsFilterState {
  final ApplicantStatus? status;
  final String search;

  const AdmissionsFilterState({this.status, this.search = ''});

  AdmissionsFilterState copyWith({ApplicantStatus? Function()? status, String? search}) {
    return AdmissionsFilterState(
      status: status != null ? status() : this.status,
      search: search ?? this.search,
    );
  }
}

class AdmissionsFilterNotifier extends Notifier<AdmissionsFilterState> {
  @override
  AdmissionsFilterState build() => const AdmissionsFilterState();

  void setStatus(ApplicantStatus? status) {
    state = state.copyWith(status: () => status);
  }

  void setSearch(String search) {
    state = state.copyWith(search: search);
  }
}

final admissionsFilterProvider =
    NotifierProvider<AdmissionsFilterNotifier, AdmissionsFilterState>(
  AdmissionsFilterNotifier.new,
);

final admissionsListProvider = FutureProvider<List<ApplicantModel>>((ref) async {
  final repo = ref.watch(admissionsRepositoryProvider);
  final filter = ref.watch(admissionsFilterProvider);
  return repo.fetchApplicants(
    filterStatus: filter.status,
    search: filter.search,
  );
});

final applicantDetailProvider =
    FutureProvider.family<ApplicantModel, String>((ref, id) async {
  final repo = ref.watch(admissionsRepositoryProvider);
  return repo.fetchApplicantDetail(id);
});
