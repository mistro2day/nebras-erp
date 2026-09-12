import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:nebras_mobile/core/theme/app_theme.dart';
import '../application/admission_providers.dart';
import 'dialogs/admission_success_dialog.dart';

class PublicApplyPage extends ConsumerStatefulWidget {
  const PublicApplyPage({super.key});

  @override
  ConsumerState<PublicApplyPage> createState() => _PublicApplyPageState();
}

class _PublicApplyPageState extends ConsumerState<PublicApplyPage> {
  final _formKey = GlobalKey<FormState>();

  // بيانات الطالب
  final _studentNameCtrl = TextEditingController();
  final _nationalIdCtrl = TextEditingController();
  final _birthDateCtrl = TextEditingController(text: '2016-04-15');
  final _previousSchoolCtrl = TextEditingController();

  // بيانات ولي الأمر
  final _guardianNameCtrl = TextEditingController();
  final _guardianPhoneCtrl = TextEditingController(text: '+249');
  final _guardianEmailCtrl = TextEditingController();
  final _guardianAddressCtrl = TextEditingController(text: 'الخرطوم');
  final _notesCtrl = TextEditingController();

  String _gender = 'ذكر';
  String _selectedGrade = 'الصف الأول أساس';
  String _relationship = 'أب';
  bool _submitting = false;

  final List<String> _sudaneseStates = [
    'الخرطوم',
    'أم درمان',
    'بحري',
    'الجزيرة (ود مدني)',
    'البحر الأحمر (بورتسودان)',
    'نهر النيل (عطبرة/الدامر)',
    'الشمالية (دنقلا)',
    'القضارف',
    'كسلا',
    'سنار',
    'النيل الأبيض (كوستي/ربك)',
    'النيل الأزرق (الدمازين)',
  ];

  final List<String> _grades = [
    'رياض الأطفال - المستوى الأول',
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
    _guardianEmailCtrl.dispose();
    _guardianAddressCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _selectBirthDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 8, 4, 15),
      firstDate: DateTime(now.year - 20),
      lastDate: DateTime(now.year - 3),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: NebrasTheme.primary,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: NebrasTheme.textDark,
            ),
          ),
          child: Directionality(
            textDirection: TextDirection.rtl,
            child: child!,
          ),
        );
      },
    );

    if (picked != null) {
      final formatted =
          '${picked.year.toString().padLeft(4, '0')}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      setState(() {
        _birthDateCtrl.text = formatted;
      });
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'يرجى إكمال الحقول الإلزامية المطلوبة بشكل صحيح.',
            style: GoogleFonts.tajawal(),
          ),
          backgroundColor: NebrasTheme.danger,
        ),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final repo = ref.read(admissionsRepositoryProvider);
      final appNumber = await repo.submitPublicApplication(
        studentFullName: _studentNameCtrl.text.trim(),
        gender: _gender,
        dateOfBirth: _birthDateCtrl.text.trim(),
        nationalId: _nationalIdCtrl.text.trim(),
        applyingGrade: _selectedGrade,
        guardianFullName: _guardianNameCtrl.text.trim(),
        guardianRelationship: _relationship,
        guardianPhone: _guardianPhoneCtrl.text.trim(),
        guardianAddress: _guardianAddressCtrl.text.trim(),
        guardianEmail: _guardianEmailCtrl.text.trim().isEmpty ? null : _guardianEmailCtrl.text.trim(),
        previousSchool: _previousSchoolCtrl.text.trim().isEmpty ? null : _previousSchoolCtrl.text.trim(),
        notes: _notesCtrl.text.trim().isEmpty ? null : _notesCtrl.text.trim(),
      );

      if (mounted) {
        await showAdmissionSuccessModal(
          context: context,
          applicationNumber: appNumber,
          studentName: _studentNameCtrl.text.trim(),
          gradeName: _selectedGrade,
          onClose: () {
            if (mounted) {
              context.go('/login');
            }
          },
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('تعذر إرسال الطلب: $e', style: GoogleFonts.tajawal()),
            backgroundColor: NebrasTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: NebrasTheme.primary,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 20),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.go('/login');
              }
            },
            tooltip: 'العودة لصفحة الدخول',
          ),
          title: Text(
            'طلب التحاق طالب جديد',
            style: GoogleFonts.tajawal(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          centerTitle: true,
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // بطاقة الترحيب والإرشادات
                  _buildWelcomeCard(),
                  const SizedBox(height: 20),

                  // بطاقة بيانات الطالب
                  _buildStudentCard(),
                  const SizedBox(height: 20),

                  // بطاقة بيانات ولي الأمر
                  _buildGuardianCard(),
                  const SizedBox(height: 20),

                  // بطاقة الملاحظات والشروط
                  _buildNotesCard(),
                  const SizedBox(height: 28),

                  // زر الإرسال
                  SizedBox(
                    width: double.infinity,
                    height: 54,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: NebrasTheme.primary,
                        elevation: 3,
                        shadowColor: NebrasTheme.primary.withAlpha(80),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      onPressed: _submitting ? null : _handleSubmit,
                      child: _submitting
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.2),
                                ),
                                const SizedBox(width: 14),
                                Text(
                                  'جارٍ تسجيل الطلب وإصدار الرقم...',
                                  style: GoogleFonts.tajawal(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                                const SizedBox(width: 10),
                                Text(
                                  'تأكيد وإرسال طلب الالتحاق',
                                  style: GoogleFonts.tajawal(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // زر العودة لصفحة تسجيل الدخول
                  Center(
                    child: TextButton.icon(
                      onPressed: () {
                        if (context.canPop()) {
                          context.pop();
                        } else {
                          context.go('/login');
                        }
                      },
                      icon: const Icon(Icons.lock_outline_rounded, size: 18, color: NebrasTheme.secondary),
                      label: Text(
                        'لديك حساب مسجل بالفعل؟ تسجيل الدخول',
                        style: GoogleFonts.tajawal(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: NebrasTheme.secondary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1B4B), Color(0xFF312E81)],
          begin: Alignment.topRight,
          end: Alignment.bottomLeft,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1E1B4B).withAlpha(40),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withAlpha(35),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.school_rounded, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'بوابة القبول والتسجيل للعام 2026/2027',
                      style: GoogleFonts.tajawal(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'مدارس نبراس الأكاديمية النموذجية - السودان',
                      style: GoogleFonts.tajawal(
                        fontSize: 12,
                        color: Colors.white.withAlpha(200),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withAlpha(25),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(Icons.verified_user_outlined, color: Color(0xFF34D399), size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'التقديم مجاني دون الحاجة لإنشاء حساب مسبق • المقاعد محدودة حسب السعة',
                    style: GoogleFonts.tajawal(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader('بيانات الطالب الأساسية', Icons.person_rounded, const Color(0xFF4F46E5)),
          const SizedBox(height: 16),

          // اسم الطالب الرباعي
          _buildTextField(
            label: 'اسم الطالب الرباعي (باللغة العربية):',
            controller: _studentNameCtrl,
            hint: 'مثال: عمر عثمان دفع الله المهدي',
            icon: Icons.person_outline_rounded,
            validator: (v) {
              if (v == null || v.trim().isEmpty) return 'اسم الطالب مطلوب';
              final parts = v.trim().split(RegExp(r'\s+'));
              if (parts.length < 3) return 'يرجى إدخال الاسم ثلاثياً أو رباعياً على الأقل';
              return null;
            },
          ),

          // الرقم الوطني وتاريخ الميلاد
          Row(
            children: [
              Expanded(
                flex: 5,
                child: _buildTextField(
                  label: 'الرقم الوطني السوداني:',
                  controller: _nationalIdCtrl,
                  hint: '10 أو 11 رقم',
                  icon: Icons.badge_outlined,
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'الرقم الوطني مطلوب';
                    if (v.trim().length < 8) return 'رقم غير صحيح';
                    return null;
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 4,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'تاريخ الميلاد:',
                        style: GoogleFonts.tajawal(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF334155),
                        ),
                      ),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: _selectBirthDate,
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF64748B)),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  _birthDateCtrl.text.isEmpty ? 'اختر التاريخ' : _birthDateCtrl.text,
                                  style: GoogleFonts.tajawal(fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // النوع (ذكر / أنثى)
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'النوع:',
                  style: GoogleFonts.tajawal(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF334155),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _buildGenderChip('ذكر', Icons.male_rounded),
                    const SizedBox(width: 12),
                    _buildGenderChip('أنثى', Icons.female_rounded),
                  ],
                ),
              ],
            ),
          ),

          // الصف الدراسي المطلوب
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'الصف الدراسي المراد الالتحاق به:',
                  style: GoogleFonts.tajawal(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF334155),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _selectedGrade,
                      isExpanded: true,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF4F46E5)),
                      style: GoogleFonts.tajawal(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.black87,
                      ),
                      items: _grades
                          .map((g) => DropdownMenuItem(value: g, child: Text(g)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _selectedGrade = val);
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          // المدرسة السابقة
          _buildTextField(
            label: 'المدرسة السابقة (إن وجدت):',
            controller: _previousSchoolCtrl,
            hint: 'مثال: مدرسة المنار الخاصة - الخرطوم',
            icon: Icons.account_balance_outlined,
          ),
        ],
      ),
    );
  }

  Widget _buildGenderChip(String label, IconData icon) {
    final isSelected = _gender == label;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _gender = label),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            color: isSelected ? NebrasTheme.primary : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? NebrasTheme.primary : const Color(0xFFCBD5E1),
              width: 1.2,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: isSelected ? Colors.white : const Color(0xFF64748B)),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.tajawal(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? Colors.white : const Color(0xFF334155),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGuardianCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader('بيانات ولي الأمر والاتصال', Icons.family_restroom_rounded, const Color(0xFF10B981)),
          const SizedBox(height: 16),

          // اسم ولي الأمر
          _buildTextField(
            label: 'اسم ولي الأمر كاملاً:',
            controller: _guardianNameCtrl,
            hint: 'مثال: عثمان دفع الله المهدي',
            icon: Icons.person_pin_rounded,
            validator: (v) => (v == null || v.trim().isEmpty) ? 'اسم ولي الأمر مطلوب' : null,
          ),

          // صلة القرابة ورقم الهاتف
          Row(
            children: [
              Expanded(
                flex: 3,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'صلة القرابة:',
                        style: GoogleFonts.tajawal(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF334155),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _relationship,
                            isExpanded: true,
                            style: GoogleFonts.tajawal(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: Colors.black87,
                            ),
                            items: ['أب', 'أم', 'وكيل شرعي']
                                .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _relationship = val);
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 5,
                child: _buildTextField(
                  label: 'هاتف الواتساب (+249):',
                  controller: _guardianPhoneCtrl,
                  hint: '+249912345678',
                  icon: Icons.phone_android_rounded,
                  keyboardType: TextInputType.phone,
                  validator: (v) {
                    if (v == null || v.trim().isEmpty) return 'رقم الهاتف مطلوب';
                    if (v.trim().length < 9) return 'رقم هاتف غير مكتمل';
                    return null;
                  },
                ),
              ),
            ],
          ),

          // ولاية السكن
          Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'المدينة / ولاية السكن (السودان):',
                  style: GoogleFonts.tajawal(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF334155),
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _guardianAddressCtrl.text.isEmpty ? 'الخرطوم' : _guardianAddressCtrl.text,
                      isExpanded: true,
                      icon: const Icon(Icons.location_on_outlined, color: Color(0xFF10B981)),
                      style: GoogleFonts.tajawal(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.black87,
                      ),
                      items: _sudaneseStates
                          .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _guardianAddressCtrl.text = val);
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          // البريد الإلكتروني (اختياري)
          _buildTextField(
            label: 'البريد الإلكتروني (اختياري):',
            controller: _guardianEmailCtrl,
            hint: 'example@domain.sd',
            icon: Icons.email_outlined,
            keyboardType: TextInputType.emailAddress,
          ),
        ],
      ),
    );
  }

  Widget _buildNotesCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(8),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader('ملاحظات واحتياجات إضافية', Icons.note_alt_outlined, const Color(0xFFF59E0B)),
          const SizedBox(height: 14),
          _buildTextField(
            label: 'أي ملاحظات أكاديمية أو صحية أو رغبات خاصة:',
            controller: _notesCtrl,
            hint: 'يرجى كتابة أي معلومات إضافية تود إبلاغ إدارة القبول بها...',
            maxLines: 3,
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(String title, IconData icon, Color accentColor) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: accentColor.withAlpha(25),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: accentColor, size: 20),
        ),
        const SizedBox(width: 10),
        Text(
          title,
          style: GoogleFonts.tajawal(
            fontSize: 15,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required String hint,
    IconData? icon,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.tajawal(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF334155),
            ),
          ),
          const SizedBox(height: 6),
          TextFormField(
            controller: controller,
            keyboardType: keyboardType,
            maxLines: maxLines,
            validator: validator,
            style: GoogleFonts.tajawal(fontSize: 13, color: Colors.black87),
            decoration: InputDecoration(
              hintText: hint,
              hintStyle: GoogleFonts.tajawal(fontSize: 12, color: const Color(0xFF94A3B8)),
              prefixIcon: icon != null ? Icon(icon, size: 18, color: const Color(0xFF64748B)) : null,
              filled: true,
              fillColor: const Color(0xFFF8FAFC),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.8),
              ),
              errorBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.red, width: 1.2),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
