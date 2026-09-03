/// أدوار المستخدم في التطبيق (تُشتقّ من نوع مستخدم البوابة أو الصلاحيات).
enum UserRole { parent, student, teacher, admin, unknown }

UserRole roleFromUserData(Map<String, dynamic>? user) {
  if (user == null) return UserRole.unknown;
  final portalType = user['portal_user_type']?.toString();
  if (portalType == 'parent') return UserRole.parent;
  if (portalType == 'student') return UserRole.student;

  final userType = user['user_type']?.toString().toLowerCase();
  final roleCodes = (user['role_codes'] as List?)?.map((e) => e.toString().toLowerCase()).toList() ?? [];
  final isSuper = user['is_superuser'] == true;
  final isStaff = user['is_staff'] == true;

  // 1. فحص المعلم أولاً
  if (userType == 'teacher' ||
      roleCodes.contains('teacher') ||
      roleCodes.contains('faculty')) {
    return UserRole.teacher;
  }

  // 2. فحص المدير والإدارة
  if (userType == 'admin' ||
      roleCodes.contains('administrator') ||
      roleCodes.contains('admin') ||
      roleCodes.contains('principal') ||
      roleCodes.contains('manager') ||
      isSuper) {
    return UserRole.admin;
  }

  // 3. أي كادر آخر إن لم يكن مديراً
  if (isStaff) {
    return UserRole.teacher;
  }

  return UserRole.unknown;
}

UserRole roleFromPortalType(String? portalType, {bool isStaff = false}) {
  switch (portalType) {
    case 'parent':
      return UserRole.parent;
    case 'student':
      return UserRole.student;
  }
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
