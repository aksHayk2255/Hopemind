import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:hopemind_mobile/main.dart';

void main() {
  testWidgets('shows HopeMind sign-in screen', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: AuthScreen(onAuthenticated: (_) {}),
      ),
    );

    expect(find.text('HopeMind'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
