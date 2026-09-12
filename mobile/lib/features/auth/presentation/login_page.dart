import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:nebras_mobile/core/theme/app_theme.dart';
import '../application/auth_controller.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(
            _email.text.trim(),
            _password.text,
          );
      // التوجيه يتكفّل به الراوتر عبر redirect بعد تغيّر حالة المصادقة.
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        backgroundColor: NebrasTheme.primary,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 84,
                    height: 84,
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(30),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Icon(Icons.school_rounded, color: Colors.white, size: 44),
                  ),
                  Text('نبراس',
                      style: GoogleFonts.tajawal(
                          fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)),
                  const SizedBox(height: 4),
                  Text('المنصة المدرسية الموحدة',
                      style: GoogleFonts.tajawal(
                          fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white.withAlpha(220))),
                  const SizedBox(height: 2),
                  Text('تسجيل الدخول الموحد لجميع البوابات (إدارة • معلمين • أولياء أمور • طلاب)',
                      style: GoogleFonts.tajawal(
                          fontSize: 12, color: Colors.white.withAlpha(160))),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(22),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(30),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        children: [
                          if (_error != null) ...[
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: NebrasTheme.danger.withAlpha(20),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(_error!,
                                  style: GoogleFonts.tajawal(
                                      color: NebrasTheme.danger,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600)),
                            ),
                            const SizedBox(height: 14),
                          ],
                          TextFormField(
                            controller: _email,
                            keyboardType: TextInputType.emailAddress,
                            decoration: const InputDecoration(
                              labelText: 'البريد الإلكتروني',
                              prefixIcon: Icon(Icons.email_outlined),
                            ),
                            validator: (v) =>
                                (v == null || v.trim().isEmpty) ? 'أدخل البريد' : null,
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _password,
                            obscureText: _obscure,
                            decoration: InputDecoration(
                              labelText: 'كلمة المرور',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                icon: Icon(
                                    _obscure ? Icons.visibility_off : Icons.visibility),
                                onPressed: () => setState(() => _obscure = !_obscure),
                              ),
                            ),
                            validator: (v) =>
                                (v == null || v.isEmpty) ? 'أدخل كلمة المرور' : null,
                          ),
                          const SizedBox(height: 22),
                          SizedBox(
                            width: double.infinity,
                            height: 50,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: NebrasTheme.primary,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              ),
                              onPressed: _loading ? null : _submit,
                              child: _loading
                                  ? const SizedBox(
                                      width: 22,
                                      height: 22,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white))
                                  : Text('تسجيل الدخول',
                                      style: GoogleFonts.tajawal(
                                          fontSize: 16, fontWeight: FontWeight.w700)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),

                  // بطاقة تقديم طلب تسجيل طالب جديد (دون الحاجة لحساب)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white.withAlpha(25),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: Colors.white.withAlpha(45), width: 1.2),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(7),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withAlpha(40),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.how_to_reg_rounded, color: Color(0xFF34D399), size: 20),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'طالب جديد؟ انضم لصرح نبراس',
                              style: GoogleFonts.tajawal(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'تقديم طلب تسجيل والتحاق طالب جديد للعام 2026/2027\nلا يتطلب حساباً مسبقاً • تقديم فوري لمختلف المراحل',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.tajawal(
                            fontSize: 12,
                            color: Colors.white.withAlpha(200),
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 14),
                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              foregroundColor: Colors.white,
                              elevation: 2,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                            ),
                            onPressed: () => context.push('/apply'),
                            icon: const Icon(Icons.app_registration_rounded, size: 20),
                            label: Text(
                              'تقديم طلب تسجيل طالب جديد',
                              style: GoogleFonts.tajawal(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

