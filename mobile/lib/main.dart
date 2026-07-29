import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/application/auth_controller.dart';

void main() {
  runApp(const ProviderScope(child: NebrasMobileApp()));
}

class NebrasMobileApp extends ConsumerStatefulWidget {
  const NebrasMobileApp({super.key});

  @override
  ConsumerState<NebrasMobileApp> createState() => _NebrasMobileAppState();
}

class _NebrasMobileAppState extends ConsumerState<NebrasMobileApp> {
  late final Future<void> _bootstrap;

  @override
  void initState() {
    super.initState();
    _bootstrap = ref.read(authControllerProvider.notifier).bootstrap();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _bootstrap,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: NebrasTheme.lightTheme,
            home: const Scaffold(body: Center(child: CircularProgressIndicator())),
          );
        }
        final router = ref.watch(routerProvider);
        return MaterialApp.router(
          title: 'Nebras ERP Mobile',
          debugShowCheckedModeBanner: false,
          theme: NebrasTheme.lightTheme,
          locale: const Locale('ar', 'SA'),
          supportedLocales: const [Locale('ar', 'SA'), Locale('en', 'US')],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          routerConfig: router,
        );
      },
    );
  }
}
