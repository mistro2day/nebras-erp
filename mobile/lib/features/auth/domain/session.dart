/// أدوار المستخدم في التطبيق (تُشتقّ من نوع مستخدم البوابة أو الصلاحيات).
enum UserRole { parent, student, teacher, admin, unknown }

UserRole roleFromPortalType(String? portalType, {bool isStaff = false}) {
  switch (portalType) {
    case 'parent':
      return UserRole.parent;
    case 'student':
      return UserRole.student;
  }
  // مستخدمو المنصّة (موظفون) يُوجَّهون لبوابة المعلّم؛ تتحقّق هي من الإسناد.
  return isStaff ? UserRole.teacher : UserRole.unknown;
}

/// جلسة مستخدم مصادَق.
class Session {
  const Session({
    required this.token,
    required this.user,
    required this.role,
  });

  final String token;
  final Map<String, dynamic> user;
  final UserRole role;

  String get displayName {
    final fn = user['first_name'] ?? user['full_name'] ?? user['name'];
    final ln = user['last_name'] ?? '';
    final joined = [fn, ln].where((e) => e != null && '$e'.isNotEmpty).join(' ').trim();
    return joined.isNotEmpty ? joined : (user['email']?.toString() ?? 'مستخدم');
  }

  String? get email => user['email']?.toString();
  String? get userId => user['id']?.toString();
}
