import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart' hide TextDirection;

import '../../../core/theme/app_theme.dart';
import '../application/parent_providers.dart';

/// وسائط شاشة السداد.
class PayArgs {
  const PayArgs({
    required this.billingAccountId,
    required this.studentId,
    required this.childName,
    required this.outstanding,
  });

  final String billingAccountId;
  final String studentId;
  final String childName;
  final double outstanding;
}

/// شاشة سداد رسوم بتحويل بنكي (يُرفَع الإيصال ويبقى الطلب للمراجعة).
class PayPage extends ConsumerStatefulWidget {
  const PayPage({super.key, required this.args});

  final PayArgs args;

  @override
  ConsumerState<PayPage> createState() => _PayPageState();
}

class _PayPageState extends ConsumerState<PayPage> {
  final _formKey = GlobalKey<FormState>();
  final _amount = TextEditingController();
  final _bank = TextEditingController(text: 'بنك الخرطوم');
  final _reference = TextEditingController();
  final _sender = TextEditingController();
  final _note = TextEditingController();
  DateTime _transferDate = DateTime.now();
  XFile? _receipt;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    if (widget.args.outstanding > 0) {
      _amount.text = widget.args.outstanding.toStringAsFixed(0);
    }
  }

  @override
  void dispose() {
    _amount.dispose();
    _bank.dispose();
    _reference.dispose();
    _sender.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickReceipt() async {
    final picker = ImagePicker();
    final img = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (img != null) setState(() => _receipt = img);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      await ref.read(parentRepositoryProvider).submitPayment(
            billingAccountId: widget.args.billingAccountId,
            studentId: widget.args.studentId,
            amount: double.parse(_amount.text),
            bankName: _bank.text.trim(),
            transferReference: _reference.text.trim(),
            transferDate: DateFormat('yyyy-MM-dd').format(_transferDate),
            senderName: _sender.text.trim(),
            note: _note.text.trim(),
            receiptPath: _receipt?.path,
          );
      ref.invalidate(myPaymentsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('أُرسل طلب السداد للمراجعة.')),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: NebrasTheme.danger),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.rtl,
      child: Scaffold(
        appBar: AppBar(title: Text('سداد رسوم ${widget.args.childName}')),
        body: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _field(_amount, 'المبلغ المحوّل', keyboard: TextInputType.number,
                  validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'أدخل مبلغاً صحيحاً' : null),
              _field(_bank, 'اسم البنك'),
              _field(_reference, 'الرقم المرجعي للتحويل',
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'أدخل الرقم المرجعي' : null),
              _field(_sender, 'اسم صاحب الحساب المُحوِّل'),
              const SizedBox(height: 4),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.calendar_today, color: NebrasTheme.accent),
                title: Text('تاريخ التحويل: ${DateFormat('yyyy/MM/dd').format(_transferDate)}',
                    style: GoogleFonts.tajawal(fontSize: 14)),
                trailing: const Icon(Icons.edit, size: 18),
                onTap: () async {
                  final d = await showDatePicker(
                    context: context,
                    initialDate: _transferDate,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (d != null) setState(() => _transferDate = d);
                },
              ),
              _field(_note, 'ملاحظة (اختياري)', maxLines: 2),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: _pickReceipt,
                icon: const Icon(Icons.attach_file),
                label: Text(_receipt == null ? 'إرفاق إيصال التحويل' : 'تم اختيار الإيصال ✓'),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _saving ? null : _submit,
                  child: _saving
                      ? const SizedBox(
                          width: 22, height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text('إرسال طلب السداد',
                          style: GoogleFonts.tajawal(fontSize: 16, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {TextInputType? keyboard, int maxLines = 1, String? Function(String?)? validator}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        controller: c,
        keyboardType: keyboard,
        maxLines: maxLines,
        decoration: InputDecoration(labelText: label),
        validator: validator,
      ),
    );
  }
}
