import 'package:flutter/material.dart';

import 'api_client.dart';
import 'ui_helpers.dart';

class StaffPage extends StatefulWidget {
  const StaffPage({required this.section, required this.user, super.key});

  final String section;
  final Map<String, dynamic> user;

  @override
  State<StaffPage> createState() => _StaffPageState();
}

class _StaffPageState extends State<StaffPage> {
  final _search = TextEditingController();
  bool _loading = true;
  Object? _error;
  List<Map<String, dynamic>> _records = [];
  Map<String, dynamic> _stats = {};
  Map<String, dynamic> _model = {};

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      Map<String, dynamic> result;
      switch (widget.section) {
        case 'patients':
          result = await api.get(
            '/doctor/patients',
            query: _search.text.trim().isEmpty
                ? null
                : {'q': _search.text.trim()},
          );
          _records = mapList(result['patients']);
          break;
        case 'connections':
          result = await api.get('/collaboration/connections');
          _records = mapList(result['connections']);
          break;
        case 'appointments':
          result = await api.get('/collaboration/appointments');
          _records = mapList(result['appointments']);
          break;
        case 'followups':
          result = await api.get('/doctor/follow-ups');
          _records = mapList(result['follow_ups']);
          break;
        case 'admin_users':
          result = await api.get(
            '/admin/users',
            query: _search.text.trim().isEmpty
                ? null
                : {'q': _search.text.trim()},
          );
          _records = mapList(result['users']);
          break;
        case 'admin_audit':
          result = await api.get('/admin/audit-logs');
          _records = mapList(result['audit_logs']);
          break;
        case 'admin_model':
          _model = await api.get('/ml/model-info');
          break;
        default:
          result = await api.get('/admin/stats');
          final stats = result['platform_statistics'];
          _stats = stats is Map ? Map<String, dynamic>.from(stats) : {};
          break;
      }
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  String get _title {
    switch (widget.section) {
      case 'patients':
        return 'Patient directory';
      case 'connections':
        return 'Connection requests';
      case 'appointments':
        return 'Appointments';
      case 'followups':
        return 'Follow-up care';
      case 'admin_users':
        return 'User accounts';
      case 'admin_audit':
        return 'Audit logs';
      case 'admin_model':
        return 'Model information';
      default:
        return 'Platform overview';
    }
  }

  @override
  Widget build(BuildContext context) => pageBody(
        _title,
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: _content(context),
                    ),
                  ),
      );

  List<Widget> _content(BuildContext context) {
    switch (widget.section) {
      case 'patients':
        return [
          TextField(
            controller: _search,
            decoration: InputDecoration(
              labelText: 'Search patients by name or email',
              suffixIcon: IconButton(
                icon: const Icon(Icons.search),
                onPressed: _load,
              ),
            ),
            onSubmitted: (_) => _load(),
          ),
          const SizedBox(height: 10),
          if (_records.isEmpty) const _EmptyState('No assigned patients found.'),
          ..._records
                .map((patient) => Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                            child: Icon(Icons.person_outline)),
                        title: Text(displayValue(patient['full_name'])),
                        subtitle: Text(
                          'Postpartum ${displayValue(patient['weeks_postpartum'])} weeks · ${displayValue(patient['clinical_status'])}\n'
                          'Screening: ${displayValue(patient['latest_assessment'] is Map ? (patient['latest_assessment'] as Map)['category'] : null)}',
                        ),
                        isThreeLine: true,
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.of(context).push(
                          MaterialPageRoute<void>(
                            builder: (_) => PatientDetailPage(
                              motherId: patient['mother_id'] as int,
                              patient: patient,
                            ),
                          ),
                        ),
                      ),
                    )),
        ];
      case 'connections':
        return _records.isEmpty
            ? [const _EmptyState('No connection requests yet.')]
            : _records.map((connection) {
                final pending = connection['status'] == 'pending';
                return Card(
                  child: ListTile(
                    title: Text(displayValue(connection['mother_name'], empty: 'Mother')),
                    subtitle: Text('Status: ${displayValue(connection['status'])}'),
                    trailing: pending
                        ? Wrap(
                            spacing: 4,
                            children: [
                              IconButton(
                                tooltip: 'Accept',
                                onPressed: () => _updateConnection(
                                    connection['id'] as int, 'accept'),
                                icon: const Icon(Icons.check_circle_outline,
                                    color: Colors.teal),
                              ),
                              IconButton(
                                tooltip: 'Decline',
                                onPressed: () => _updateConnection(
                                    connection['id'] as int, 'decline'),
                                icon: const Icon(Icons.cancel_outlined,
                                    color: Colors.redAccent),
                              ),
                            ],
                          )
                        : null,
                  ),
                );
              }).toList();
      case 'appointments':
        return _records.isEmpty
            ? [const _EmptyState('No appointments found.')]
            : _records.map((item) {
                final status = item['status']?.toString();
                return Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.calendar_month_outlined),
                        title: Text(displayValue(item['mother_name'], empty: 'Patient')),
                        subtitle: Text(
                          '${dateValue(item['start_time'])} · ${displayValue(item['consultation_mode'])}\n${displayValue(status)}',
                        ),
                        isThreeLine: true,
                      ),
                      if (status == 'requested')
                        ButtonBar(
                          children: [
                            TextButton(
                              onPressed: () => _updateAppointment(item['id'] as int, 'decline'),
                              child: const Text('Decline'),
                            ),
                            FilledButton(
                              onPressed: () => _updateAppointment(item['id'] as int, 'confirm'),
                              child: const Text('Confirm'),
                            ),
                          ],
                        )
                      else if (status == 'confirmed')
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: () => _updateAppointment(item['id'] as int, 'complete'),
                            child: const Text('Mark completed'),
                          ),
                        ),
                    ],
                  ),
                );
              }).toList();
      case 'followups':
        return _records.isEmpty
            ? [const _EmptyState('No follow-ups scheduled.')]
            : _records.map((item) {
                final id = item['id'] as int;
                final status = item['status']?.toString() ?? '';
                return Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.event_note_outlined),
                        title: Text(displayValue(item['reason'])),
                        subtitle: Text(
                          '${dateValue(item['scheduled_date'])} · ${displayValue(status)}\n${displayValue(item['clinical_notes'])}',
                        ),
                        isThreeLine: true,
                      ),
                      if (status == 'scheduled')
                        Align(
                          alignment: Alignment.centerRight,
                          child: Wrap(
                            children: [
                              TextButton(
                                onPressed: () => _updateFollowUp(id, 'cancelled'),
                                child: const Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () => _updateFollowUp(id, 'completed'),
                                child: const Text('Mark completed'),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                );
              }).toList();
      case 'admin_users':
        return [
          TextField(
            controller: _search,
            decoration: InputDecoration(
              labelText: 'Search by name or email',
              suffixIcon: IconButton(
                icon: const Icon(Icons.search),
                onPressed: _load,
              ),
            ),
            onSubmitted: (_) => _load(),
          ),
          const SizedBox(height: 10),
          if (_records.isEmpty) const _EmptyState('No user accounts found.'),
          ..._records.map((item) {
                final id = item['id'] as int;
                return Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: Icon(
                          item['is_active'] == true
                              ? Icons.person
                              : Icons.person_off_outlined,
                        ),
                        title: Text(displayValue(item['full_name'])),
                        subtitle: Text(
                          '${displayValue(item['email'])}\n${displayValue(item['role'])} · ${item['is_active'] == true ? 'Active' : 'Inactive'}',
                        ),
                        isThreeLine: true,
                      ),
                      ButtonBar(
                        children: [
                          OutlinedButton(
                            onPressed: () => _toggleUser(
                              id,
                              item['is_active'] != true,
                            ),
                            child: Text(item['is_active'] == true
                                ? 'Deactivate'
                                : 'Activate'),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }),
        ];
      case 'admin_audit':
        return _records.isEmpty
            ? [const _EmptyState('No audit events found.')]
            : _records
                .map((item) => infoCard(
                      '${displayValue(item['action'])} · ${displayValue(item['resource_type'])}',
                      '${dateValue(item['created_at'])}\n${displayValue(item['details'])}',
                      icon: Icons.receipt_long_outlined,
                    ))
                .toList();
      case 'admin_model':
        return _model.entries
            .map((entry) => infoCard(entry.key, _formatJson(entry.value)))
            .toList();
      default:
        return _stats.entries
            .map((entry) => infoCard(
                  _humanize(entry.key),
                  displayValue(entry.value),
                  icon: Icons.analytics_outlined,
                ))
            .toList();
    }
  }

  String _formatJson(dynamic value) {
    if (value is Map || value is List) return value.toString();
    return displayValue(value);
  }

  String _humanize(String value) => value
      .replaceAll('_', ' ')
      .split(' ')
      .map((word) => word.isEmpty
          ? word
          : '${word[0].toUpperCase()}${word.substring(1)}')
      .join(' ');

  Future<void> _updateConnection(int id, String action) async {
    await runAction(context, () async {
      await api.patch('/collaboration/connections/$id', body: {'action': action});
      await _load();
    });
  }

  Future<void> _updateAppointment(int id, String action) async {
    await runAction(context, () async {
      await api.patch('/collaboration/appointments/$id', body: {'action': action});
      await _load();
    });
  }

  Future<void> _updateFollowUp(int id, String status) async {
    await runAction(context, () async {
      await api.put('/doctor/follow-ups/$id', body: {'status': status});
      await _load();
    });
  }

  Future<void> _toggleUser(int id, bool active) async {
    await runAction(context, () async {
      await api.put('/admin/users/$id/status', body: {'is_active': active});
      await _load();
    });
  }
}

class PatientDetailPage extends StatefulWidget {
  const PatientDetailPage({
    required this.motherId,
    required this.patient,
    super.key,
  });

  final int motherId;
  final Map<String, dynamic> patient;

  @override
  State<PatientDetailPage> createState() => _PatientDetailPageState();
}

class _PatientDetailPageState extends State<PatientDetailPage> {
  bool _loading = true;
  Object? _error;
  Map<String, dynamic> _detail = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        api.get('/doctor/patients/${widget.motherId}'),
        api.get('/collaboration/notes/${widget.motherId}'),
        api.get('/collaboration/referrals'),
      ]);
      _detail = results[0];
      _detail['clinical_notes'] = results[1]['notes'];
      _detail['referrals'] = mapList(results[2]['referrals'])
          .where((item) => item['mother_id'] == widget.motherId)
          .toList();
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) => pageBody(
        displayValue(widget.patient['full_name'], empty: 'Patient'),
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _patientProfile(),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton.icon(
                                onPressed: _scheduleFollowUp,
                                icon: const Icon(Icons.event_available),
                                label: const Text('Schedule follow-up'),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _recordSection('Assessments', mapList(_detail['assessments']),
                            (item) => '${item['total_score']}/30 · ${displayValue(item['screening_category'])} · ${dateValue(item['created_at'])}'),
                        _recordSection('Mood history', mapList(_detail['mood_history']),
                            (item) => '${displayValue(item['mood'])} · sleep ${displayValue(item['sleep_hours'])} hrs · ${dateValue(item['entry_date'])}'),
                        _recordSection('Follow-ups', mapList(_detail['follow_ups']),
                            (item) => '${displayValue(item['reason'])} · ${displayValue(item['status'])} · ${dateValue(item['scheduled_date'])}'),
                        _recordSection(
                            'Clinical notes',
                            mapList(_detail['clinical_notes']),
                            (item) =>
                                '${displayValue(item['reason'])} · ${dateValue(item['created_at'])}\nObservations: ${displayValue(item['observations'])}\nCare plan: ${displayValue(item['care_plan'])}'),
                        _recordSection(
                            'Referrals',
                            mapList(_detail['referrals']),
                            (item) =>
                                '${displayValue(item['destination'])} · ${displayValue(item['reason'])}'),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _createClinicalNote,
                          icon: const Icon(Icons.note_add_outlined),
                          label: const Text('Add clinical note'),
                        ),
                        OutlinedButton.icon(
                          onPressed: _createReferral,
                          icon: const Icon(Icons.outbox_outlined),
                          label: const Text('Create referral'),
                        ),
                      ],
                    ),
                  ),
      );

  Widget _patientProfile() {
    final patient = _detail['patient'];
    final data = patient is Map ? Map<String, dynamic>.from(patient) : {};
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(displayValue(data['full_name']),
                style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(displayValue(data['email'])),
            Text('Phone: ${displayValue(data['phone'])}'),
            Text('Infant: ${displayValue(data['infant_name'])}'),
            Text('Delivery date: ${dateValue(data['delivery_date'])}'),
            Text('Weeks postpartum: ${displayValue(data['weeks_postpartum'])}'),
            const Divider(height: 24),
            const Text(
              'Journal text and HopeBot conversations are not exposed in clinician collaboration data.',
              style: TextStyle(color: Colors.blueGrey),
            ),
          ],
        ),
      ),
    );
  }

  Widget _recordSection(
    String title,
    List<Map<String, dynamic>> items,
    String Function(Map<String, dynamic>) subtitle,
  ) {
    return Card(
      child: ExpansionTile(
        title: Text('$title (${items.length})',
            style: const TextStyle(fontWeight: FontWeight.w700)),
        children: items.isEmpty
            ? const [ListTile(title: Text('No shared records available.'))]
            : items
                .map((item) => ListTile(
                      dense: true,
                      title: Text(subtitle(item)),
                      subtitle: item['clinical_action_recommended'] == null
                          ? null
                          : Text(item['clinical_action_recommended'].toString()),
                    ))
                .toList(),
      ),
    );
  }

  Future<void> _scheduleFollowUp() async {
    final reason = TextEditingController();
    final notes = TextEditingController();
    var selectedDate = DateTime.now().add(const Duration(days: 1));
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Schedule follow-up'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(dateValue(selectedDate.toIso8601String())),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                    initialDate: selectedDate,
                  );
                  if (picked != null) {
                    setDialogState(() => selectedDate = picked);
                  }
                },
              ),
              TextField(
                  controller: reason,
                  decoration: const InputDecoration(labelText: 'Reason')),
              TextField(
                  controller: notes,
                  decoration:
                      const InputDecoration(labelText: 'Clinical notes')),
            ],
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Schedule')),
          ],
        ),
      ),
    );
    if (confirmed != true) return;
    await runAction(context, () async {
      await api.post('/doctor/follow-ups', body: {
        'mother_id': widget.motherId,
        'scheduled_date': selectedDate.toIso8601String(),
        'reason': reason.text.trim(),
        'clinical_notes': notes.text.trim(),
      });
      await _load();
      if (mounted) showMessage(context, 'Follow-up scheduled.');
    });
  }

  Future<void> _createClinicalNote() async {
    final reason = TextEditingController();
    final observations = TextEditingController();
    final carePlan = TextEditingController();
    final saved = await _textFormDialog('Add clinical note', [
      ('Reason', reason),
      ('Observations', observations),
      ('Care plan', carePlan),
    ]);
    if (!saved) return;
    await runAction(context, () async {
      await api.post('/collaboration/notes', body: {
        'mother_id': widget.motherId,
        'reason': reason.text.trim(),
        'observations': observations.text.trim(),
        'care_plan': carePlan.text.trim(),
      });
      if (mounted) showMessage(context, 'Clinical note saved.');
    });
  }

  Future<void> _createReferral() async {
    final destination = TextEditingController();
    final reason = TextEditingController();
    final saved = await _textFormDialog('Create referral', [
      ('Destination', destination),
      ('Reason', reason),
    ]);
    if (!saved) return;
    await runAction(context, () async {
      await api.post('/collaboration/referrals', body: {
        'mother_id': widget.motherId,
        'destination': destination.text.trim(),
        'reason': reason.text.trim(),
      });
      if (mounted) showMessage(context, 'Referral created.');
    });
  }

  Future<bool> _textFormDialog(
    String title,
    List<(String, TextEditingController)> fields,
  ) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: fields
                .map((field) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: TextField(
                        controller: field.$2,
                        maxLines: field.$1 == 'Observations' ||
                                field.$1 == 'Care plan'
                            ? 3
                            : 1,
                        decoration: InputDecoration(labelText: field.$1),
                      ),
                    ))
                .toList(),
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Save')),
        ],
      ),
    );
    return result == true;
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState(this.message);

  final String message;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(32),
        child: Center(child: Text(message, textAlign: TextAlign.center)),
      );
}
