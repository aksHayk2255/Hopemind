import 'package:flutter/material.dart';

import 'api_client.dart';
import 'screens.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const HopeMindApp());
}

class HopeMindApp extends StatefulWidget {
  const HopeMindApp({super.key});

  @override
  State<HopeMindApp> createState() => _HopeMindAppState();
}

class _HopeMindAppState extends State<HopeMindApp> {
  Map<String, dynamic>? _user;
  bool _checkingSession = true;

  @override
  void initState() {
    super.initState();
    api.onUnauthorized = () {
      if (mounted) setState(() => _user = null);
    };
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    final token = await api.readToken();
    if (token != null) {
      try {
        final response = await api.get('/auth/me');
        final user = response['user'];
        if (user is Map<String, dynamic>) _user = user;
      } on ApiException {
        await api.clearToken();
      }
    }
    if (mounted) setState(() => _checkingSession = false);
  }

  void _onAuthenticated(Map<String, dynamic> user) {
    setState(() => _user = user);
  }

  Future<void> _logout() async {
    try {
      if (await api.readToken() != null) {
        await api.post('/auth/logout');
      }
    } on ApiException {
      // Local logout must still complete if the backend is unavailable.
    } finally {
      await api.clearToken();
      if (mounted) setState(() => _user = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    const seedColor = Color(0xFF5B4BDB);
    return MaterialApp(
      title: 'HopeMind',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: seedColor,
          surface: const Color(0xFFFFFCFA),
        ),
        scaffoldBackgroundColor: const Color(0xFFFFFCFA),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFFFFCFA),
          surfaceTintColor: Colors.transparent,
          centerTitle: false,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE0DFE9)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE0DFE9)),
          ),
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        ),
      ),
      home: _checkingSession
          ? const Scaffold(body: Center(child: CircularProgressIndicator()))
          : _user == null
              ? AuthScreen(onAuthenticated: _onAuthenticated)
              : HomeScreen(user: _user!, onLogout: _logout),
    );
  }
}

class AuthScreen extends StatefulWidget {
  const AuthScreen({required this.onAuthenticated, super.key});

  final ValueChanged<Map<String, dynamic>> onAuthenticated;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _phone = TextEditingController();
  final _infantName = TextEditingController();
  final _deliveryDate = TextEditingController();
  final _deliveryType = TextEditingController(text: 'vaginal');
  final _emergencyName = TextEditingController();
  final _emergencyPhone = TextEditingController();
  final _specialization = TextEditingController();
  final _hospital = TextEditingController();
  final _license = TextEditingController();
  String _role = 'mother';
  bool _registering = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _phone.dispose();
    _infantName.dispose();
    _deliveryDate.dispose();
    _deliveryType.dispose();
    _emergencyName.dispose();
    _emergencyPhone.dispose();
    _specialization.dispose();
    _hospital.dispose();
    _license.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final response = _registering
          ? await api.post('/auth/register',
              authenticated: false, body: _registrationPayload())
          : await api.post(
              '/auth/login',
              authenticated: false,
              body: {
                'email': _email.text.trim(),
                'password': _password.text,
              },
            );
      final token = response['access_token'];
      final user = response['user'];
      if (token is! String || user is! Map<String, dynamic>) {
        throw const ApiException('The backend returned an invalid sign-in response.');
      }
      await api.saveToken(token);
      widget.onAuthenticated(user);
    } on ApiException catch (error) {
      setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _demoLogin(String email, String password) async {
    _email.text = email;
    _password.text = password;
    await _submit();
  }

  Map<String, dynamic> _registrationPayload() {
    final payload = <String, dynamic>{
      'full_name': _name.text.trim(),
      'email': _email.text.trim(),
      'password': _password.text,
      'phone': _phone.text.trim(),
      'role': _role,
    };
    if (_role == 'mother') {
      payload['infant_name'] = _infantName.text.trim();
      payload['delivery_date'] = _deliveryDate.text.trim();
      payload['delivery_type'] = _deliveryType.text.trim();
      payload['emergency_contact_name'] = _emergencyName.text.trim();
      payload['emergency_contact_phone'] = _emergencyPhone.text.trim();
    } else {
      payload['specialization'] = _specialization.text.trim();
      payload['hospital_affiliation'] = _hospital.text.trim();
      payload['license_number'] = _license.text.trim();
    }
    return payload;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(22),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.favorite_rounded,
                      size: 44, color: Color(0xFF5B4BDB)),
                  const SizedBox(height: 10),
                  Text('HopeMind',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineMedium
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(
                    'Support for your postpartum journey',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(color: Colors.blueGrey),
                  ),
                  const SizedBox(height: 28),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              _registering ? 'Create account' : 'Welcome back',
                              style: theme.textTheme.titleLarge
                                  ?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 16),
                            if (_registering) ...[
                              TextFormField(
                                controller: _name,
                                textCapitalization: TextCapitalization.words,
                                decoration:
                                    const InputDecoration(labelText: 'Full name'),
                                validator: (value) => value == null ||
                                        value.trim().isEmpty
                                    ? 'Enter your name'
                                    : null,
                              ),
                              const SizedBox(height: 12),
                              DropdownButtonFormField<String>(
                                value: _role,
                                decoration:
                                    const InputDecoration(labelText: 'Account type'),
                                items: const [
                                  DropdownMenuItem(
                                      value: 'mother', child: Text('Mother')),
                                  DropdownMenuItem(
                                      value: 'doctor', child: Text('Doctor')),
                                ],
                                onChanged: (value) =>
                                    setState(() => _role = value ?? 'mother'),
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _phone,
                                keyboardType: TextInputType.phone,
                                decoration: const InputDecoration(
                                    labelText: 'Phone (optional)'),
                              ),
                              const SizedBox(height: 12),
                              if (_role == 'mother') ...[
                                TextFormField(
                                  controller: _infantName,
                                  decoration: const InputDecoration(
                                      labelText: 'Infant name (optional)'),
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _deliveryDate,
                                  keyboardType: TextInputType.datetime,
                                  decoration: const InputDecoration(
                                      labelText:
                                          'Delivery date (YYYY-MM-DD, optional)'),
                                  validator: (value) {
                                    final date = value?.trim() ?? '';
                                    return date.isEmpty ||
                                            (RegExp(r'^\d{4}-\d{2}-\d{2}$')
                                                    .hasMatch(date) &&
                                                DateTime.tryParse(date) != null)
                                        ? null
                                        : 'Use YYYY-MM-DD';
                                  },
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _deliveryType,
                                  decoration: const InputDecoration(
                                      labelText: 'Delivery type'),
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _emergencyName,
                                  decoration: const InputDecoration(
                                      labelText:
                                          'Emergency contact name (optional)'),
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _emergencyPhone,
                                  keyboardType: TextInputType.phone,
                                  decoration: const InputDecoration(
                                      labelText:
                                          'Emergency contact phone (optional)'),
                                ),
                                const SizedBox(height: 12),
                              ] else ...[
                                TextFormField(
                                  controller: _specialization,
                                  decoration: const InputDecoration(
                                      labelText: 'Specialization'),
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _hospital,
                                  decoration: const InputDecoration(
                                      labelText:
                                          'Hospital affiliation (optional)'),
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _license,
                                  decoration: const InputDecoration(
                                      labelText: 'License number (optional)'),
                                ),
                                const SizedBox(height: 12),
                              ],
                            ],
                            TextFormField(
                              controller: _email,
                              keyboardType: TextInputType.emailAddress,
                              autofillHints: const [AutofillHints.email],
                              decoration:
                                  const InputDecoration(labelText: 'Email'),
                              validator: (value) => value == null ||
                                      !value.contains('@')
                                  ? 'Enter a valid email'
                                  : null,
                            ),
                            const SizedBox(height: 12),
                            TextFormField(
                              controller: _password,
                              obscureText: true,
                              autofillHints: [
                                _registering
                                    ? AutofillHints.newPassword
                                    : AutofillHints.password
                              ],
                              decoration:
                                  const InputDecoration(labelText: 'Password'),
                              validator: (value) => value == null ||
                                      value.length < 6
                                  ? 'Use at least 6 characters'
                                  : null,
                            ),
                            if (_error != null) ...[
                              const SizedBox(height: 12),
                              Text(_error!,
                                  style: const TextStyle(
                                      color: Color(0xFFB42318))),
                            ],
                            const SizedBox(height: 18),
                            FilledButton(
                              onPressed: _busy ? null : _submit,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Text(_busy
                                    ? 'Please wait...'
                                    : _registering
                                        ? 'Create account'
                                        : 'Sign in'),
                              ),
                            ),
                            TextButton(
                              onPressed: _busy
                                  ? null
                                  : () => setState(() {
                                        _registering = !_registering;
                                        _error = null;
                                      }),
                              child: Text(_registering
                                  ? 'Already have an account? Sign in'
                                  : 'New to HopeMind? Create an account'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (!_registering) ...[
                    const SizedBox(height: 18),
                    Text('Local demo accounts',
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _DemoButton(
                          label: 'Mother',
                          onPressed: () => _demoLogin(
                              'priya@example.com', 'Password123!'),
                        ),
                        _DemoButton(
                          label: 'Doctor',
                          onPressed: () => _demoLogin(
                              'doctor.sharma@example.com', 'Password123!'),
                        ),
                        _DemoButton(
                          label: 'Admin',
                          onPressed: () => _demoLogin(
                              'admin@hopemind.org', 'AdminPass123!'),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 18),
                  const Text(
                    'HopeMind is an educational and research-oriented project, not a medical device or emergency service.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, color: Colors.blueGrey),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DemoButton extends StatelessWidget {
  const _DemoButton({required this.label, required this.onPressed});

  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => OutlinedButton(
        onPressed: onPressed,
        child: Text('Demo $label'),
      );
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({required this.user, required this.onLogout, super.key});

  final Map<String, dynamic> user;
  final Future<void> Function() onLogout;

  @override
  Widget build(BuildContext context) {
    final role = user['role']?.toString() ?? 'mother';
    final name = user['full_name']?.toString() ?? 'there';
    final features = _featuresFor(role);
    return Scaffold(
      appBar: AppBar(
        title: const Text('HopeMind'),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            onPressed: () => _openFeature(context, 'notifications', user),
            icon: const Icon(Icons.notifications_outlined),
          ),
          IconButton(
            tooltip: 'Emergency support',
            onPressed: () => _openFeature(context, 'emergency', user),
            icon: const Icon(Icons.emergency_outlined),
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'profile') {
                _openFeature(context, 'profile', user);
              } else if (value == 'logout') {
                await onLogout();
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'profile', child: Text('Profile & settings')),
              PopupMenuItem(value: 'logout', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      body: ListView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 28),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF312E81), Color(0xFF5B4BDB), Color(0xFFC94743)],
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Welcome, $name',
                      style: Theme.of(context)
                          .textTheme
                          .headlineSmall
                          ?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800)),
                  const SizedBox(height: 8),
                  Text(
                    role == 'mother'
                        ? 'A gentle space for your wellness, screening, and care coordination.'
                        : role == 'doctor'
                            ? 'Your patient care and coordination workspace.'
                            : 'Platform governance and system overview.',
                    style: const TextStyle(color: Colors.white, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Text('Your workspace',
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            ...features.map((feature) => _FeatureCard(
                  feature: feature,
                  onTap: () => _openFeature(context, feature.id, user),
                )),
            const SizedBox(height: 16),
            Card(
              color: const Color(0xFFFFF5F3),
              child: const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'If someone is in immediate danger, contact local emergency services. HopeMind is not an emergency service or a substitute for clinical care.',
                  style: TextStyle(height: 1.4),
                ),
              ),
            ),
          ],
        ),
    );
  }
}

class _Feature {
  const _Feature(this.id, this.title, this.subtitle, this.icon);

  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
}

List<_Feature> _featuresFor(String role) {
  if (role == 'doctor') {
    return const [
      _Feature('patients', 'Patient directory', 'Assigned patients and screening status', Icons.people_alt_outlined),
      _Feature('connections', 'Connection requests', 'Review and respond to care connections', Icons.handshake_outlined),
      _Feature('appointments', 'Appointments', 'Confirm, decline, or complete visits', Icons.calendar_month_outlined),
      _Feature('followups', 'Follow-up care', 'Schedule and update clinical follow-ups', Icons.event_note_outlined),
      _Feature('profile', 'Profile settings', 'Update your clinician profile', Icons.manage_accounts_outlined),
    ];
  }
  if (role == 'admin') {
    return const [
      _Feature('admin_overview', 'Platform overview', 'System usage and risk totals', Icons.dashboard_outlined),
      _Feature('admin_users', 'User accounts', 'Search, activate, and manage roles', Icons.people_outline),
      _Feature('admin_audit', 'Audit logs', 'Review recorded system actions', Icons.fact_check_outlined),
      _Feature('admin_model', 'Model information', 'Research model metadata', Icons.query_stats_outlined),
      _Feature('profile', 'Profile settings', 'Update your account details', Icons.manage_accounts_outlined),
    ];
  }
  return const [
    _Feature('mother_dashboard', 'Wellness dashboard', 'Screening, mood, sleep, and recent activity', Icons.dashboard_outlined),
    _Feature('assessment', 'EPDS screening', 'Complete the 10-question screening', Icons.favorite_outline),
    _Feature('history', 'Screening history', 'Review past EPDS results', Icons.history),
    _Feature('mood', 'Daily mood check-in', 'Record mood, rest, energy, tags, and journal', Icons.mood_outlined),
    _Feature('trends', 'Mood & sleep trends', 'Explore 7, 14, or 30 day trends', Icons.show_chart),
    _Feature('chat', 'HopeBot conversations', 'Private supportive chat conversations', Icons.chat_bubble_outline),
    _Feature('care_team', 'Care team & consent', 'Find clinicians and control sharing', Icons.medical_services_outlined),
    _Feature('appointments', 'Appointments', 'Request or manage clinician visits', Icons.calendar_month_outlined),
    _Feature('report', 'Weekly wellness report', 'Preview, download, or share a report', Icons.description_outlined),
    _Feature('privacy', 'Privacy & safety', 'Manage sharing, AI analysis, and contacts', Icons.shield_outlined),
    _Feature('profile', 'Profile settings', 'Update your profile and password', Icons.manage_accounts_outlined),
  ];
}

class _FeatureCard extends StatelessWidget {
  const _FeatureCard({required this.feature, required this.onTap});

  final _Feature feature;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 9),
        child: ListTile(
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
          leading: CircleAvatar(
            backgroundColor: const Color(0xFFECE9FF),
            foregroundColor: const Color(0xFF5142C7),
            child: Icon(feature.icon),
          ),
          title: Text(feature.title,
              style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(feature.subtitle),
          trailing: const Icon(Icons.chevron_right),
          onTap: onTap,
        ),
      );
}

void _openFeature(
    BuildContext context, String feature, Map<String, dynamic> user) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => FeatureScreen(feature: feature, user: user),
    ),
  );
}
