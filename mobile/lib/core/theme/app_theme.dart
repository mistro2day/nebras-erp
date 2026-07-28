import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NebrasTheme {
  // Brand Tokens from Google Stitch Design System
  static const Color primary = Color(0xFF1E1B4B);       // Midnight Navy
  static const Color secondary = Color(0xFF6366F1);     // Sapphire Violet
  static const Color accent = Color(0xFF4F46E5);        // Royal Indigo
  static const Color success = Color(0xFF10B981);       // Emerald Green
  static const Color warning = Color(0xFFF59E0B);       // Warm Amber
  static const Color danger = Color(0xFFEF4444);        // Coral Red
  static const Color background = Color(0xFFF8FAFC);    // Soft Off-White
  static const Color cardBg = Colors.white;
  static const Color textDark = Color(0xFF0F172A);
  static const Color textMuted = Color(0xFF64748B);

  static ThemeData get lightTheme {
    final baseText = GoogleFonts.tajawalTextTheme();

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: secondary,
        surface: cardBg,
        error: danger,
      ),
      textTheme: baseText.copyWith(
        displayLarge: GoogleFonts.tajawal(fontSize: 32, fontWeight: FontWeight.bold, color: textDark),
        headlineMedium: GoogleFonts.tajawal(fontSize: 22, fontWeight: FontWeight.bold, color: textDark),
        titleLarge: GoogleFonts.tajawal(fontSize: 18, fontWeight: FontWeight.w600, color: textDark),
        bodyLarge: GoogleFonts.tajawal(fontSize: 16, color: textDark),
        bodyMedium: GoogleFonts.tajawal(fontSize: 14, color: textMuted),
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 2,
        shadowColor: primary.withAlpha(20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: GoogleFonts.tajawal(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
      ),
    );
  }
}
