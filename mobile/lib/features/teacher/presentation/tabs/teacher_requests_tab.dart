import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../../core/providers.dart';
import '../../../auth/application/auth_controller.dart';

/// تبويب طلبات المعلم الذاتية:
/// 1. طلب تصحيح بصمة (CorrectionRequest)
/// 2. طلب إجازة مرضية أو اعتيادية (MedicalLeave)
/// 3. طلب سلفة مالية بالجنيه السوداني (EmployeeAdvance)
class TeacherRequestsTab extends ConsumerStatefulWidget {
  const TeacherRequestsTab({super.key});

  @override
  ConsumerState<TeacherRequestsTab> createState() => _TeacherRequestsTabState();
}

class _TeacherRequestsTabState extends ConsumerState<TeacherRequestsTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  String? _employeeId;

  List<Map<String, dynamic>> _corrections = [];
  List<Map<String, dynamic>> _leaves = [];
  List<Map<String, dynamic>> _advances = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    final api = ref.read(apiServiceProvider);
    final session = ref.read(authControllerProvider);
    final userEmail = session?.email ?? '';

    try {
      // 1. تحديد معرّف الموظف
      final empRes = await api.get('/employees/employees/?search=$userEmail');
      final empList = (empRes is Map && empRes['data'] is Map && empRes['data']['results'] != null)
          ? empRes['data']['results']
          : (empRes is Map && empRes['results'] != null)
              ? empRes['results']
              : (empRes is Map && empRes['data'] is List)
                  ? empRes['data']
                  : [];

      if (empList is List && empList.isNotEmpty) {
        _employeeId = empList.first['id']?.toString();
      }
      _employeeId ??= '30eb8610-4410-462b-94ef-ab128b0ad491';

      // 2. جلب طلبات تصحيح البصمة
      try {
        final corrRes = await api.get('/attendance/corrections/?employee=$_employeeId');
        final corrData = (corrRes is Map && corrRes['data'] is List)
            ? corrRes['data']
            : (corrRes is List ? corrRes : []);
        _corrections = List<Map<String, dynamic>>.from(corrData);
      } catch (_) {}

      // 3. جلب طلبات الإجازات
      try {
        final leaveRes = await api.get('/clinic/medical-leaves/?patient_user_id=$_employeeId');
        final leaveData = (leaveRes is Map && leaveRes['data'] is List)
            ? leaveRes['data']
            : (leaveRes is List ? leaveRes : []);
        _leaves = List<Map<String, dynamic>>.from(leaveData);
      } catch (_) {}

      // 4. جلب طلبات السلفيات
      try {
        final advRes = await api.get('/employees/advances/?employee=$_employeeId');
        final advData = (advRes is Map && advRes['data'] is List)
            ? advRes['data']
            : (advRes is List ? advRes : []);
        _advances = List<Map<String, dynamic>>.from(advData);
      } catch (_) {}
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ==========================================
  // نافذة طلب تصحيح بصمة جديدة
  // ==========================================
  void _openCreateCorrectionModal() {
    final dateController = TextEditingController(text: DateTime.now().toString().split(' ')[0]);
    final checkInController = TextEditingController(text: '07:30');
    final checkOutController = TextEditingController(text: '14:30');
    final reasonController = TextEditingController();
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Directionality(
          textDirection: TextDirection.rtl,
          child: Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('طلب تصحيح دوام / بصمة',
                        style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 16)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 8),
                TextField(
                  controller: dateController,
                  decoration: const InputDecoration(
                    labelText: 'تاريخ اليوم المراد تصحيحه',
                    hintText: 'YYYY-MM-DD',
                    prefixIcon: Icon(Icons.calendar_today),
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: checkInController,
                        decoration: const InputDecoration(labelText: 'وقت الحضور الفعلي', hintText: '07:30'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: checkOutController,
                        decoration: const InputDecoration(labelText: 'وقت الانصراف الفعلي', hintText: '14:30'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'مبرر الاستدراك / سبب عدم التمكن من البصمة',
                    hintText: 'مثال: عطل في شبكة الهاتف أثناء الدخول، تكليف بحصة إشراف خارجي...',
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B4D3E),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: submitting
                        ? null
                        : () async {
                            if (reasonController.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('يرجى كتابة سبب طلب التصحيح')),
                              );
                              return;
                            }
                            setSheet(() => submitting = true);
                            try {
                              final api = ref.read(apiServiceProvider);
                              await api.post('/attendance/corrections/', data: {
                                'employee': _employeeId,
                                'date': dateController.text.trim(),
                                'requested_check_in': checkInController.text.trim(),
                                'requested_check_out': checkOutController.text.trim(),
                                'reason': reasonController.text.trim(),
                                'status': 'pending',
                              });
                              if (!mounted) return;
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('تم إرسال طلب تصحيح البصمة إلى مركز الموافقات بنجاح.'),
                                  backgroundColor: Color(0xFF10B981),
                                ),
                              );
                              _loadAllData();
                            } catch (e) {
                              setSheet(() => submitting = false);
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('فشل الإرسال: $e'), backgroundColor: Colors.red),
                              );
                            }
                          },
                    child: submitting
                        ? const SizedBox(
                            width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('إرسال الطلب للاعتماد'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // نافذة طلب إجازة جديدة
  // ==========================================
  void _openCreateLeaveModal() {
    final startController = TextEditingController(text: DateTime.now().toString().split(' ')[0]);
    final endController = TextEditingController(text: DateTime.now().add(const Duration(days: 1)).toString().split(' ')[0]);
    final reasonController = TextEditingController();
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Directionality(
          textDirection: TextDirection.rtl,
          child: Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('طلب إجازة جديدة (مرضية / اعتيادية)',
                        style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 16)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: startController,
                        decoration: const InputDecoration(labelText: 'تاريخ البدء', hintText: 'YYYY-MM-DD'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: endController,
                        decoration: const InputDecoration(labelText: 'تاريخ الانتهاء', hintText: 'YYYY-MM-DD'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'سبب ونوع الإجازة',
                    hintText: 'مثال: عارض صحي طارئ ومراجعة المركز الصحي، ظرف عائلي قاهر...',
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B4D3E),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: submitting
                        ? null
                        : () async {
                            if (reasonController.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('يرجى توضيح سبب الإجازة')),
                              );
                              return;
                            }
                            setSheet(() => submitting = true);
                            try {
                              final api = ref.read(apiServiceProvider);
                              await api.post('/clinic/medical-leaves/', data: {
                                'patient_user_id': _employeeId,
                                'patient_type': 'employee',
                                'start_date': startController.text.trim(),
                                'end_date': endController.text.trim(),
                                'reason': reasonController.text.trim(),
                                'status': 'submitted',
                              });
                              if (!mounted) return;
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('تم رفع طلب الإجازة بنجاح إلى مركز الموافقات.'),
                                  backgroundColor: Color(0xFF10B981),
                                ),
                              );
                              _loadAllData();
                            } catch (e) {
                              setSheet(() => submitting = false);
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('فشل رفع الإجازة: $e'), backgroundColor: Colors.red),
                              );
                            }
                          },
                    child: submitting
                        ? const SizedBox(
                            width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('رفع طلب الإجازة للاعتماد'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ==========================================
  // نافذة طلب سلفية مالية جديدة
  // ==========================================
  void _openCreateAdvanceModal() {
    final amountController = TextEditingController(text: '50000');
    final reasonController = TextEditingController();
    int repaymentMonths = 2;
    bool submitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Directionality(
          textDirection: TextDirection.rtl,
          child: Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('طلب سلفة مالية طارئة (ج.س)',
                        style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 16)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 8),
                TextField(
                  controller: amountController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'مبلغ السلفة بالجنيه السوداني (ج.س)',
                    prefixIcon: Icon(Icons.money),
                    suffixText: 'ج.س',
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text('فترة التقسيط والخصم من الراتب:',
                        style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 12),
                    DropdownButton<int>(
                      value: repaymentMonths,
                      items: const [
                        DropdownMenuItem(value: 1, child: Text('شهر واحد')),
                        DropdownMenuItem(value: 2, child: Text('شهران (المعتمد)')),
                        DropdownMenuItem(value: 3, child: Text('3 أشهر')),
                        DropdownMenuItem(value: 4, child: Text('4 أشهر')),
                      ],
                      onChanged: (v) => setSheet(() => repaymentMonths = v ?? 2),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reasonController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'مبرر وغرض السلفة المالية',
                    hintText: 'مثال: التزامات أسرية عاجلة، علاج طارئ...',
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B4D3E),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: submitting
                        ? null
                        : () async {
                            final amt = double.tryParse(amountController.text.trim()) ?? 0;
                            if (amt <= 0) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('يرجى إدخال مبلغ سلفة صحيح')),
                              );
                              return;
                            }
                            setSheet(() => submitting = true);
                            try {
                              final api = ref.read(apiServiceProvider);
                              await api.post('/employees/employees/$_employeeId/request-advance/', data: {
                                'amount': amt,
                                'reason': reasonController.text.trim(),
                                'repayment_months': repaymentMonths,
                              });
                              if (!mounted) return;
                              Navigator.of(context).pop();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('تم إرسال طلب السلفة إلى الإدارة ومركز الموافقات بنجاح.'),
                                  backgroundColor: Color(0xFF10B981),
                                ),
                              );
                              _loadAllData();
                            } catch (e) {
                              setSheet(() => submitting = false);
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('فشل طلب السلفة: $e'), backgroundColor: Colors.red),
                              );
                            }
                          },
                    child: submitting
                        ? const SizedBox(
                            width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('تقديم طلب السلفة المالية'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('الطلبات والموافقات الذاتية'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'تصحيح البصمة', icon: Icon(Icons.fingerprint, size: 20)),
            Tab(text: 'الإجازات', icon: Icon(Icons.beach_access, size: 20)),
            Tab(text: 'السلفيات (ج.س)', icon: Icon(Icons.account_balance_wallet, size: 20)),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildCorrectionsTab(),
                _buildLeavesTab(),
                _buildAdvancesTab(),
              ],
            ),
    );
  }

  Widget _buildCorrectionsTab() {
    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildActionButton(
            label: 'تقديم طلب تصحيح بصمة جديد',
            icon: Icons.add_circle_outline,
            onPressed: _openCreateCorrectionModal,
          ),
          const SizedBox(height: 16),
          if (_corrections.isEmpty)
            _buildEmptyState('لا توجد طلبات تصحيح بصمة مسجلة لك حالياً.')
          else
            ..._corrections.map((c) => _buildCorrectionCard(c)),
        ],
      ),
    );
  }

  Widget _buildLeavesTab() {
    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildActionButton(
            label: 'تقديم طلب إجازة جديد',
            icon: Icons.add_circle_outline,
            onPressed: _openCreateLeaveModal,
          ),
          const SizedBox(height: 16),
          if (_leaves.isEmpty)
            _buildEmptyState('لا توجد طلبات إجازة مسجلة لك حالياً.')
          else
            ..._leaves.map((l) => _buildLeaveCard(l)),
        ],
      ),
    );
  }

  Widget _buildAdvancesTab() {
    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildActionButton(
            label: 'تقديم طلب سلفة مالية طارئة',
            icon: Icons.add_circle_outline,
            onPressed: _openCreateAdvanceModal,
          ),
          const SizedBox(height: 16),
          if (_advances.isEmpty)
            _buildEmptyState('لا توجد طلبات سلفيات مالية مسجلة لك حالياً.')
          else
            ..._advances.map((a) => _buildAdvanceCard(a)),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required IconData icon,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      height: 48,
      child: ElevatedButton.icon(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF1B4D3E),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 1,
        ),
        icon: Icon(icon, size: 20),
        label: Text(label, style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 14)),
        onPressed: onPressed,
      ),
    );
  }

  Widget _buildEmptyState(String msg) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.inbox_outlined, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(msg, style: GoogleFonts.tajawal(color: Colors.black54, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildCorrectionCard(Map<String, dynamic> c) {
    final status = c['status']?.toString() ?? 'pending';
    final date = c['date']?.toString() ?? '';
    final reason = c['reason']?.toString() ?? '';
    final inTime = c['requested_check_in']?.toString() ?? '--:--';
    final outTime = c['requested_check_out']?.toString() ?? '--:--';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('تاريخ اليوم: $date',
                    style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 14)),
                _buildStatusBadge(status),
              ],
            ),
            const SizedBox(height: 8),
            Text('الأوقات المطلوبة: $inTime ص  -  $outTime م',
                style: GoogleFonts.tajawal(fontSize: 12, color: Colors.black87, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text('السبب: $reason', style: GoogleFonts.tajawal(fontSize: 12, color: Colors.black54)),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaveCard(Map<String, dynamic> l) {
    final status = l['status']?.toString() ?? 'submitted';
    final start = l['start_date']?.toString() ?? '';
    final end = l['end_date']?.toString() ?? '';
    final reason = l['reason']?.toString() ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('الفترة: من $start إلى $end',
                    style: GoogleFonts.tajawal(fontWeight: FontWeight.bold, fontSize: 13)),
                _buildStatusBadge(status),
              ],
            ),
            const SizedBox(height: 6),
            Text('السبب: $reason', style: GoogleFonts.tajawal(fontSize: 12, color: Colors.black54)),
          ],
        ),
      ),
    );
  }

  Widget _buildAdvanceCard(Map<String, dynamic> a) {
    final status = a['status']?.toString() ?? 'pending';
    final amount = a['amount']?.toString() ?? '0';
    final date = a['request_date']?.toString() ?? '';
    final months = a['repayment_months']?.toString() ?? '2';
    final reason = a['reason']?.toString() ?? 'سلفة مالية';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('$amount جنيه سوداني (ج.س)',
                    style: GoogleFonts.tajawal(
                        fontWeight: FontWeight.w800, fontSize: 15, color: const Color(0xFF1B4D3E))),
                _buildStatusBadge(status),
              ],
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('تاريخ الطلب: $date', style: GoogleFonts.tajawal(fontSize: 12, color: Colors.black54)),
                Text('التقسيط على: $months أشهر',
                    style: GoogleFonts.tajawal(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black87)),
              ],
            ),
            if (reason.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text('السبب: $reason', style: GoogleFonts.tajawal(fontSize: 12, color: Colors.black54)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bg = Colors.orange.withAlpha(25);
    Color text = Colors.orange.shade800;
    String label = 'قيد المراجعة';

    if (status == 'approved' || status == 'accepted') {
      bg = const Color(0xFF10B981).withAlpha(25);
      text = const Color(0xFF10B981);
      label = 'معتمد ✓';
    } else if (status == 'rejected') {
      bg = Colors.red.withAlpha(25);
      text = Colors.red;
      label = 'مرفوض ✗';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: text.withAlpha(80)),
      ),
      child: Text(
        label,
        style: GoogleFonts.tajawal(color: text, fontWeight: FontWeight.bold, fontSize: 11),
      ),
    );
  }
}
