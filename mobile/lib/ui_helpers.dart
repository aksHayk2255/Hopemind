import 'package:flutter/material.dart';

import 'api_client.dart';

Widget pageBody(String title, Widget child) {
  return Scaffold(
    appBar: AppBar(title: Text(title)),
    body: SafeArea(child: child),
  );
}

Widget loadingView() => const Center(
      child: Padding(
        padding: EdgeInsets.all(32),
        child: CircularProgressIndicator(),
      ),
    );

Widget errorView(Object error, VoidCallback retry) {
  return Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_outlined, size: 40, color: Colors.blueGrey),
          const SizedBox(height: 12),
          Text(error.toString(), textAlign: TextAlign.center),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: retry, child: const Text('Try again')),
        ],
      ),
    ),
  );
}

List<Map<String, dynamic>> mapList(dynamic value) {
  if (value is! List) return <Map<String, dynamic>>[];
  return value
      .whereType<Map>()
      .map((item) => Map<String, dynamic>.from(item))
      .toList();
}

String displayValue(dynamic value, {String empty = '—'}) {
  if (value == null || value.toString().trim().isEmpty) return empty;
  return value.toString();
}

String dateValue(dynamic value) {
  if (value == null) return '—';
  final parsed = DateTime.tryParse(value.toString());
  if (parsed == null) return value.toString();
  return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')}';
}

Widget infoCard(String title, String value, {IconData? icon}) {
  return Card(
    child: ListTile(
      leading: icon == null ? null : Icon(icon, color: const Color(0xFF5B4BDB)),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Padding(
        padding: const EdgeInsets.only(top: 5),
        child: Text(value),
      ),
    ),
  );
}

void showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

Future<void> runAction(
  BuildContext context,
  Future<void> Function() action,
) async {
  try {
    await action();
  } on ApiException catch (error) {
    if (context.mounted) showMessage(context, error.message);
  } catch (error) {
    if (context.mounted) showMessage(context, 'Action failed: $error');
  }
}
