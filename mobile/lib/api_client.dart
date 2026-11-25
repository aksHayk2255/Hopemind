import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client})
      : _client = client ?? http.Client(),
        _storage = const FlutterSecureStorage();

  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5001/api',
  );

  final http.Client _client;
  final FlutterSecureStorage _storage;
  String? _token;
  void Function()? onUnauthorized;

  Future<String?> readToken() async {
    _token ??= await _storage.read(key: 'hopemind_token');
    return _token;
  }

  Future<void> saveToken(String token) async {
    _token = token;
    await _storage.write(key: 'hopemind_token', value: token);
  }

  Future<void> clearToken() async {
    _token = null;
    await _storage.delete(key: 'hopemind_token');
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
    bool authenticated = true,
  }) async {
    final response = await _send(
      'GET',
      path,
      query: query,
      authenticated: authenticated,
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = true,
  }) async {
    final response = await _send(
      'POST',
      path,
      body: body,
      authenticated: authenticated,
    );
    return _decode(response);
  }

  Future<Map<String, dynamic>> put(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    return _decode(await _send('PUT', path, body: body));
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    return _decode(await _send('PATCH', path, body: body));
  }

  Future<Map<String, dynamic>> delete(String path) async {
    return _decode(await _send('DELETE', path));
  }

  Future<http.Response> getBytes(
    String path, {
    Map<String, String>? query,
  }) async {
    return _send('GET', path, query: query);
  }

  Future<http.Response> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
    bool authenticated = true,
  }) async {
    final normalizedBase = baseUrl.replaceFirst(RegExp(r'/+$'), '');
    final normalizedPath = path.replaceFirst(RegExp(r'^/+'), '');
    final base = Uri.parse('$normalizedBase/$normalizedPath');
    final uri = query == null ? base : base.replace(queryParameters: query);
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (authenticated) {
      final token = await readToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    late final http.Response response;
    try {
      switch (method) {
        case 'GET':
          response = await _client.get(uri, headers: headers);
          break;
        case 'POST':
          response = await _client.post(
            uri,
            headers: headers,
            body: jsonEncode(body ?? <String, dynamic>{}),
          );
          break;
        case 'PUT':
          response = await _client.put(
            uri,
            headers: headers,
            body: jsonEncode(body ?? <String, dynamic>{}),
          );
          break;
        case 'PATCH':
          response = await _client.patch(
            uri,
            headers: headers,
            body: jsonEncode(body ?? <String, dynamic>{}),
          );
          break;
        case 'DELETE':
          response = await _client.delete(uri, headers: headers);
          break;
        default:
          throw ApiException('Unsupported HTTP method: $method');
      }
    } on ApiException {
      rethrow;
    } on http.ClientException catch (error) {
      throw ApiException('Could not reach the HopeMind backend: $error');
    } on IOException catch (error) {
      throw ApiException('Could not reach the HopeMind backend: $error');
    }

    if (response.statusCode == 401) {
      await clearToken();
      onUnauthorized?.call();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      String message = 'Request failed (${response.statusCode}).';
      try {
        final payload = jsonDecode(response.body);
        if (payload is Map && payload['error'] is String) {
          message = payload['error'] as String;
        } else if (payload is Map && payload['message'] is String) {
          message = payload['message'] as String;
        }
      } on FormatException {
        // Keep the HTTP status message for non-JSON responses.
      }
      throw ApiException(message, statusCode: response.statusCode);
    }
    return response;
  }

  Map<String, dynamic> _decode(http.Response response) {
    if (response.body.isEmpty) return <String, dynamic>{};
    final value = jsonDecode(response.body);
    if (value is Map<String, dynamic>) return value;
    throw const ApiException('The backend returned an unexpected response.');
  }
}

final api = ApiClient();
