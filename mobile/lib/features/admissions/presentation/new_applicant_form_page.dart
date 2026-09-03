import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import 'package:nebras_mobile/features/admissions/application/admission_providers.dart';

class NewApplicantFormPage extends ConsumerStatefulWidget {
  const NewApplicantFormPage({super.key});

  @override
  ConsumerState<NewApplicantFormPage> createState() => _NewApplicantFormPageState();
}

class _NewApplicantFormPageState extends ConsumerState<NewApplicantFormPage> {
  final _formKey = GlobalKey<FormState>();

  final _studentNameCtrl = TextEditingController();
  final _nationalIdCtrl = TextEditingController();
  final _birthDateCtrl = TextEditingController(text: '2015-05-10');
  final _previousSchoolCtrl = TextEditingController();

  final _guardianNameCtrl = TextEditingController();
  final _guardianPhoneCtrl = TextEditingController(text: '+249');

  String _gender = 'ذكر';
  String _selectedGrade = 'الصف الأول متوسط';
  String _relationship = 'أب';
  bool _loading = false;

  final List<String> _grades = [
    'رياض الأطفال - تمهيدي',
    'الصف الأول أساس',
    'الصف الثاني أساس',
    'الصف الثالث أساس',
    'الصف الرابع أساس',
    'الصف الخامس أساس',
    'الصف السادس أساس',
    'الصف الأول متوسط',
    'الصف الثاني متوسط',
    'الصف الثالث متوسط',
    'الصف الأول ثانوي',
    'الصف الثاني ثانوي',
    'الصف الثالث ثانوي',
  ];

  @override
  void dispose() {
    _studentNameCtrl.dispose();
    _nationalIdCtrl.dispose();
    _birthDateCtrl.dispose();
    _previousSchoolCtrl.dispose();
    _guardianNameCtrl.dispose();
    _guardianPhoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    try {
      await ref.read(admissionsRepositoryProvider).createApplicant(
            arabicFullName: _studentNameCtrl.text.trim(),
            gender: _gender,
            dateOfBirth: _birthDateCtrl.text.trim(),
            nationalId: _nationalIdCtrl.text.trim(),
            applyingGrade: _selectedGrade,
            guardianName: _guardianNameCtrl.text.trim(),
            guardianPhone: _guardianPhoneCtrl.text.trim(),
            guardianRelationship: _relationship,
            previousSchool: _previousSchoolCtrl.text.trim().isEmpty ? null : _previousSchoolCtrl.text.trim(),
          );

      ref.invalidate(admissionsStatsProvider);
      ref.invalidate(admissionsListProvider);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم تسجيل طلب الالتحاق بنجاح.', style: GoogleFonts.tajawal()),
            backgroundColor: NebrasTheme.success,
          ),
        );
        context.pop();
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تم حفظ الطلب محلياً في وضع التطوير.', style: GoogleFonts.tajawal()),
            backgroundColor: NebrasTheme.primary,
          ),
        );
        context.pop();
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(
          title: Text('تسجيل طلب التحاق جديد',
              style: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSectionHeader('بيانات الطالب الأساسية', Icons.person_rounded),
                const SizedBox(height: 12),
                _buildField(
                  label: 'اسم الطالب الرباعي:',
                  controller: _studentNameCtrl,
                  hint: 'مثال: عمر عثمان دفع الله المهدي',
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'الاسم مطلوب' : null,
                ),
                Row(
                  children: [
                    Expanded(
                      child: _buildField(
                        label: 'الرقم الوطني السوداني:',
                        controller: _nationalIdCtrl,
                        hint: '10 أو 11 رقم',
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'الرقم الوطني مطلوب' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildField(
                        label: 'تاريخ الميلاد:',
                        controller: _birthDateCtrl,
                        hint: 'YYYY-MM-DD',
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    Text('النوع:', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 16),
                    ChoiceChip(
                      label: Text('ذكر', style: GoogleFonts.tajawal(fontSize: 12)),
                      selected: _gender == 'ذكر',
                      selectedColor: NebrasTheme.primary,
                      labelStyle: TextStyle(color: _gender == 'ذكر' ? Colors.white : NebrasTheme.textDark),
                      onSelected: (val) {
                        if (val) setState(() => _gender = 'ذكر');
                      },
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: Text('أنثى', style: GoogleFonts.tajawal(fontSize: 12)),
                      selected: _gender == 'أنثى',
                      selectedColor: NebrasTheme.primary,
                      labelStyle: TextStyle(color: _gender == 'أنثى' ? Colors.white : NebrasTheme.textDark),
                      onSelected: (val) {
                        if (val) setState(() => _gender = 'أنثى');
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Text('الصف الدراسي المستهدف:', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: NebrasTheme.background,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedGrade,
                      isExpanded: true,
                      style: GoogleFonts.tajawal(fontSize: 13, color: NebrasTheme.textDark),
                      items: _grades.map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedGrade = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _buildField(
                  label: 'المدرسة السابقة (إن وجدت):',
                  controller: _previousSchoolCtrl,
                  hint: 'مثال: مدرسة المنار الخاصة - الخرطوم',
                ),

                const SizedBox(height: 24),

                _buildSectionHeader('بيانات ولي الأمر والاتصال', Icons.family_restroom_rounded),
                const SizedBox(height: 12),
                _buildField(
                  label: 'اسم ولي الأمر كاملاً:',
                  controller: _guardianNameCtrl,
                  hint: 'مثال: عثمان دفع الله المهدي',
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'اسم ولي الأمر مطلوب' : null,
                ),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: _buildField(
                        label: 'رقم هاتف الواتساب (+249):',
                        controller: _guardianPhoneCtrl,
                        hint: '+249912345678',
                        validator: (v) => (v == null || v.trim().length < 8) ? 'رقم الهاتف مطلوب' : null,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 1,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('صلة القرابة:', style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(height: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10),
                            decoration: BoxDecoration(
                              color: NebrasTheme.background,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _relationship,
                                isExpanded: true,
                                style: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textDark),
                                items: ['أب', 'أم', 'ولي أمر'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                                onChanged: (val) {
                                  if (val != null) setState(() => _relationship = val);
                                },
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 28),

                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: NebrasTheme.primary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    onPressed: _loading ? null : _submit,
                    child: _loading
                        ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text('حفظ وتقديم الطلب فوراً',
                            style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: NebrasTheme.primary.withAlpha(20), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, color: NebrasTheme.primary, size: 20),
        ),
        const SizedBox(width: 10),
        Text(title, style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.bold, color: NebrasTheme.textDark)),
      ],
    );
  }

  Widget _buildField({
    required String label,
    required TextEditingController controller,
    required String hint,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            validator: validator,
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.tajawal(fontSize: 12, color: NebrasTheme.textMuted),
              filled: true,
              fillColor: NebrasTheme.background,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
            ),
          ),
        ],
      ),
    );
  }
}
