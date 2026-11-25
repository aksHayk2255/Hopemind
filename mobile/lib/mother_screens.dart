import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import 'api_client.dart';
import 'ui_helpers.dart';

class MotherDashboardPage extends StatefulWidget {
  const MotherDashboardPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<MotherDashboardPage> createState() => _MotherDashboardPageState();
}

class _MotherDashboardPageState extends State<MotherDashboardPage> {
  bool _loading = true;
  Object? _error;
  Map<String, dynamic> _assessment = {};
  Map<String, dynamic> _mood = {};

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
        api.get('/assessments/history'),
        api.get('/moods/analytics', query: {'days': '7'}),
      ]);
      final assessments = mapList(results[0]['assessments']);
      _assessment = assessments.isEmpty ? {} : assessments.first;
      _mood = results[1];
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Wellness dashboard',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Text(
                          'Welcome, ${displayValue(widget.user['full_name']).split(' ').first}',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 4),
                        const Text('A gentle space to care for yourself, too.'),
                        const SizedBox(height: 16),
                        if (_assessment['question_10_flag'] == true ||
                            _assessment['q10_positive'] == true)
                          Card(
                            color: const Color(0xFFFFEFED),
                            child: ListTile(
                              leading: const Icon(Icons.warning_amber,
                                  color: Colors.red),
                              title: const Text('Support is available now'),
                              subtitle: const Text(
                                  'Your recent screening indicated distress. Reach out to a trusted person or local emergency support.'),
                              trailing: IconButton(
                                icon: const Icon(Icons.call),
                                onPressed: () => Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) =>
                                        EmergencyPage(user: widget.user),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        infoCard(
                          'Latest EPDS screening',
                          _assessment.isEmpty
                              ? 'No screening completed yet'
                              : '${displayValue(_assessment['total_score'])}/30 · ${displayValue(_assessment['screening_category'] ?? _assessment['risk_category'])} risk · ${dateValue(_assessment['created_at'])}',
                          icon: Icons.favorite_outline,
                        ),
                        infoCard(
                          'Mood check-ins · 7 days',
                          '${displayValue(_mood['entries_count'], empty: '0')} entries · average mood ${displayValue(_mood['average_mood_score'], empty: '0')} / 5 · average sleep ${displayValue(_mood['average_sleep_hours'], empty: '0')} hrs',
                          icon: Icons.mood_outlined,
                        ),
                        if (_assessment['clinical_action_recommended'] != null)
                          infoCard(
                            'Latest recommendation',
                            displayValue(
                              _assessment['clinical_action_recommended'] ??
                                  _assessment['clinical_recommendation'],
                            ),
                            icon: Icons.medical_information_outlined,
                          ),
                        const SizedBox(height: 8),
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: Text(
                              'Screening and any machine-learning estimate are for support and research only. They are not a diagnosis or substitute for a clinician.',
                              style: TextStyle(height: 1.4),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
      );
}

class AssessmentPage extends StatefulWidget {
  const AssessmentPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<AssessmentPage> createState() => _AssessmentPageState();
}

class _AssessmentPageState extends State<AssessmentPage> {
  bool _loading = true;
  bool _submitting = false;
  Object? _error;
  String _instructions = '';
  String _disclaimer = '';
  List<Map<String, dynamic>> _questions = [];
  List<int> _answers = [];
  int _step = 0;
  Map<String, dynamic>? _result;
  final DateTime _started = DateTime.now();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await api.get('/assessments/questions');
      _instructions = displayValue(response['instructions'], empty: '');
      _disclaimer = displayValue(response['disclaimer'], empty: '');
      _questions = mapList(response['questions']);
      _answers = List<int>.filled(_questions.length, -1);
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _submit() async {
    if (_answers.any((answer) => answer < 0)) {
      setState(() => _step = _answers.indexWhere((answer) => answer < 0));
      showMessage(context, 'Please answer every question before submitting.');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final seconds = DateTime.now().difference(_started).inSeconds.clamp(15, 3600);
      final response = await api.post('/assessments/submit', body: {
        'responses': _answers,
        'completion_time_seconds': seconds,
      });
      final assessment = response['assessment'];
      _result = <String, dynamic>{
        if (assessment is Map) ...Map<String, dynamic>.from(assessment),
        'critical_alert': response['critical_alert'],
        'ml_risk_assessment': response['ml_risk_assessment'],
      };
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _submitting = false);
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'EPDS screening',
        _loading
            ? loadingView()
            : _error != null && _questions.isEmpty
                ? errorView(_error!, _load)
                : _result != null
                    ? _resultView()
                    : _questionView(),
      );

  Widget _questionView() {
    if (_questions.isEmpty) return errorView(_error ?? 'No questions are available.', _load);
    final question = _questions[_step];
    final options = mapList(question['options']);
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        Text('Question ${_step + 1} of ${_questions.length}',
            style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        LinearProgressIndicator(value: (_step + 1) / _questions.length),
        const SizedBox(height: 20),
        Text(displayValue(question['question']),
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        ...options.map((option) {
          final index = option['index'] is int
              ? option['index'] as int
              : options.indexOf(option);
          return Card(
            child: RadioListTile<int>(
              value: index,
              groupValue: _answers[_step] < 0 ? null : _answers[_step],
              onChanged: (value) => setState(() => _answers[_step] = value!),
              title: Text(displayValue(option['text'])),
            ),
          );
        }),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(_error.toString(),
                style: const TextStyle(color: Colors.red)),
          ),
        const SizedBox(height: 16),
        Row(
          children: [
            if (_step > 0)
              OutlinedButton(
                onPressed: () => setState(() => _step--),
                child: const Text('Previous'),
              ),
            const Spacer(),
            FilledButton(
              onPressed: _submitting
                  ? null
                  : _step < _questions.length - 1
                      ? () {
                          if (_answers[_step] < 0) {
                            showMessage(context, 'Please select an answer.');
                          } else {
                            setState(() => _step++);
                          }
                        }
                      : _submit,
              child: Text(_step < _questions.length - 1
                  ? 'Next'
                  : _submitting
                      ? 'Submitting...'
                      : 'Submit screening'),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Text(_instructions, style: const TextStyle(color: Colors.blueGrey)),
        const SizedBox(height: 8),
        Text(_disclaimer,
            style: const TextStyle(fontSize: 12, color: Colors.blueGrey)),
      ],
    );
  }

  Widget _resultView() {
    final data = _result!;
    final critical = data['critical_alert'] == true ||
        data['question_10_flag'] == true;
    final category = data['screening_category'] ??
        data['risk_category'] ??
        'low';
    final ml = data['ml_risk_assessment'];
    final mlData = ml is Map ? Map<String, dynamic>.from(ml) : <String, dynamic>{};
    return ListView(
      padding: const EdgeInsets.all(18),
      children: [
        Card(
          color: critical ? const Color(0xFFFFEFED) : const Color(0xFFEFFAF4),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('EPDS score: ${displayValue(data['total_score'])} / 30',
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text('Screening category: $category'),
              ],
            ),
          ),
        ),
        if (critical)
          Card(
            color: const Color(0xFFFFEFED),
            child: ListTile(
              leading:
                  const Icon(Icons.warning_amber, color: Colors.redAccent),
              title: const Text('Immediate support is available'),
              subtitle: const Text(
                  'Please reach out to a trusted person or the emergency support resources. This app is not an emergency service.'),
              trailing: IconButton(
                icon: const Icon(Icons.call),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => EmergencyPage(user: widget.user),
                  ),
                ),
              ),
            ),
          ),
        infoCard(
          'Clinical recommendation',
          displayValue(
            data['clinical_action_recommended'] ??
                data['clinical_recommendation'],
          ),
          icon: Icons.medical_information_outlined,
        ),
        if (mlData.isNotEmpty)
          infoCard(
            'Research risk estimate',
            '${displayValue(mlData['risk_percentage'] ?? mlData['predicted_risk_score'])}\n${displayValue(mlData['guidance'])}\nNot a diagnosis; for research and decision support only.',
            icon: Icons.query_stats,
          ),
        OutlinedButton(
          onPressed: () => Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => AssessmentHistoryPage(user: widget.user),
            ),
          ),
          child: const Text('View screening history'),
        ),
      ],
    );
  }
}

class AssessmentHistoryPage extends StatefulWidget {
  const AssessmentHistoryPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<AssessmentHistoryPage> createState() => _AssessmentHistoryPageState();
}

class _AssessmentHistoryPageState extends State<AssessmentHistoryPage> {
  bool _loading = true;
  Object? _error;
  List<Map<String, dynamic>> _items = [];

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
      final response = await api.get('/assessments/history');
      _items = mapList(response['assessments']);
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _showDetail(int id) async {
    try {
      final response = await api.get('/assessments/$id');
      final item = response['assessment'];
      if (!mounted || item is! Map) return;
      final assessment = Map<String, dynamic>.from(item);
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(
              'EPDS ${displayValue(assessment['total_score'])}/30 · ${displayValue(assessment['screening_category'])}'),
          content: SizedBox(
            width: 420,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(displayValue(
                    assessment['clinical_action_recommended'] ??
                        assessment['clinical_recommendation'],
                  )),
                  const SizedBox(height: 12),
                  ...mapList(assessment['responses']).map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Text(
                          '${displayValue(item['question_text'])}\n${displayValue(item['selected_option_text'])}',
                        ),
                      )),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close')),
          ],
        ),
      );
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    }
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Screening history',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _items.isEmpty
                        ? ListView(children: const [
                            Padding(
                              padding: EdgeInsets.all(32),
                              child: Center(child: Text('No screenings yet.')),
                            )
                          ])
                        : ListView(
                            padding: const EdgeInsets.all(16),
                            children: _items.map((item) {
                              final category = item['screening_category'] ??
                                  item['risk_category'] ??
                                  'low';
                              return Card(
                                child: ListTile(
                                  leading: const Icon(Icons.favorite_outline),
                                  title: Text(
                                      'Score ${displayValue(item['total_score'])}/30 · $category risk'),
                                  subtitle: Text(
                                      '${dateValue(item['created_at'])}\n${displayValue(item['clinical_action_recommended'] ?? item['clinical_recommendation'])}'),
                                  isThreeLine: true,
                                  trailing: const Icon(Icons.chevron_right),
                                  onTap: () => _showDetail(item['id'] as int),
                                ),
                              );
                            }).toList(),
                          ),
                  ),
      );
}

class MoodCheckInPage extends StatefulWidget {
  const MoodCheckInPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<MoodCheckInPage> createState() => _MoodCheckInPageState();
}

class _MoodCheckInPageState extends State<MoodCheckInPage> {
  final _journal = TextEditingController();
  final _sleep = TextEditingController(text: '6.5');
  final List<String> _tags = const [
    'Grateful',
    'Exhausted',
    'Anxious',
    'Baby Smiles',
    'Night Feedings',
    'Crying Spells',
    'Peaceful',
    'Partner Support',
    'Lonely',
    'Bonding',
  ];
  String _mood = 'neutral';
  String _energy = 'moderate';
  final Set<String> _selectedTags = {};
  bool _saving = false;
  bool _loadingEntries = true;
  Object? _error;
  List<Map<String, dynamic>> _entries = [];

  @override
  void initState() {
    super.initState();
    _loadEntries();
  }

  @override
  void dispose() {
    _journal.dispose();
    _sleep.dispose();
    super.dispose();
  }

  Future<void> _loadEntries() async {
    try {
      final response = await api.get('/moods', query: {'limit': '30'});
      _entries = mapList(response['entries']);
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loadingEntries = false);
  }

  Future<void> _save() async {
    final sleep = double.tryParse(_sleep.text);
    if (sleep == null || sleep < 0 || sleep > 24) {
      showMessage(context, 'Enter sleep hours between 0 and 24.');
      return;
    }
    final journalParts = <String>[];
    if (_selectedTags.isNotEmpty) {
      journalParts.add('[Emotions: ${_selectedTags.join(', ')}]');
    }
    if (_journal.text.trim().isNotEmpty) journalParts.add(_journal.text.trim());
    setState(() => _saving = true);
    try {
      final response = await api.post('/moods', body: {
        'mood': _mood,
        'sleep_hours': sleep,
        'energy_level': _energy,
        'journal_text': journalParts.join(' ').trim(),
      });
      if (!mounted) return;
      final entry = response['entry'];
      final emotion = entry is Map ? entry['dominant_emotion'] : null;
      showMessage(context, emotion == null
          ? 'Daily check-in saved.'
          : 'Check-in saved. Journal tone: $emotion');
      _journal.clear();
      _selectedTags.clear();
      await _loadEntries();
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _deleteEntry(int id) async {
    await runAction(context, () async {
      await api.delete('/moods/$id');
      await _loadEntries();
    });
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Daily mood check-in',
        ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'A gentle minute to record how your heart and body feel today.',
              style: TextStyle(color: Colors.blueGrey),
            ),
            const SizedBox(height: 16),
            const Text('How are you feeling?',
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...const [
              ('very_sad', 'Overwhelmed / low', '😢'),
              ('sad', 'Tired / gloomy', '😔'),
              ('neutral', 'Neutral / getting by', '😐'),
              ('happy', 'Calm / content', '🙂'),
              ('very_happy', 'Joyful / supported', '😊'),
            ].map((option) => Card(
                  child: RadioListTile<String>(
                    value: option.$1,
                    groupValue: _mood,
                    onChanged: (value) => setState(() => _mood = value!),
                    title: Text('${option.$3}  ${option.$2}'),
                  ),
                )),
            const SizedBox(height: 8),
            TextField(
              controller: _sleep,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration:
                  const InputDecoration(labelText: 'Sleep last night (hours)'),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _energy,
              decoration: const InputDecoration(labelText: 'Energy level'),
              items: const [
                DropdownMenuItem(value: 'low', child: Text('Low / drained')),
                DropdownMenuItem(value: 'moderate', child: Text('Moderate / steady')),
                DropdownMenuItem(value: 'high', child: Text('High / restored')),
              ],
              onChanged: (value) => setState(() => _energy = value ?? 'moderate'),
            ),
            const SizedBox(height: 14),
            const Text('Optional feelings tags',
                style: TextStyle(fontWeight: FontWeight.bold)),
            Wrap(
              spacing: 6,
              children: _tags
                  .map((tag) => FilterChip(
                        label: Text(tag),
                        selected: _selectedTags.contains(tag),
                        onSelected: (selected) => setState(() {
                          if (selected) {
                            _selectedTags.add(tag);
                          } else {
                            _selectedTags.remove(tag);
                          }
                        }),
                      ))
                  .toList(),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _journal,
              minLines: 4,
              maxLines: 8,
              decoration: const InputDecoration(
                labelText: 'Private journal reflection (optional)',
                hintText: 'Write freely about today...',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: _saving ? null : _save,
              icon: const Icon(Icons.favorite_outline),
              label: Text(_saving ? 'Saving...' : 'Save daily check-in'),
            ),
            const SizedBox(height: 24),
            Text('Recent check-ins',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.bold)),
            if (_loadingEntries)
              loadingView()
            else if (_error != null)
              Text(_error.toString(),
                  style: const TextStyle(color: Colors.red))
            else if (_entries.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text('No check-ins recorded yet.'),
              )
            else
              ..._entries.map((entry) => Card(
                    child: ListTile(
                      title: Text(
                          '${displayValue(entry['mood'])} · ${displayValue(entry['sleep_hours'])} hrs sleep'),
                      subtitle: Text(
                          '${dateValue(entry['entry_date'])} · ${displayValue(entry['energy_level'])}\n${displayValue(entry['journal_text'], empty: 'No journal reflection')}'),
                      isThreeLine: true,
                      trailing: IconButton(
                        tooltip: 'Delete check-in',
                        icon: const Icon(Icons.delete_outline),
                        onPressed: () => _deleteEntry(entry['id'] as int),
                      ),
                    ),
                  )),
          ],
        ),
      );
}

class MoodTrendsPage extends StatefulWidget {
  const MoodTrendsPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<MoodTrendsPage> createState() => _MoodTrendsPageState();
}

class _MoodTrendsPageState extends State<MoodTrendsPage> {
  int _days = 14;
  bool _loading = true;
  Object? _error;
  Map<String, dynamic> _data = {};
  List<Map<String, dynamic>> _entries = [];

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
        api.get('/moods/analytics', query: {'days': '$_days'}),
        api.get('/moods', query: {'limit': '100'}),
      ]);
      _data = results[0];
      final cutoff = DateTime.now().subtract(Duration(days: _days));
      _entries = mapList(results[1]['entries']).where((entry) {
        final date = DateTime.tryParse(
            (entry['entry_date'] ?? entry['created_at'] ?? '').toString());
        return date != null && !date.isBefore(cutoff);
      }).toList();
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Mood & sleep trends',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        SegmentedButton<int>(
                          segments: const [
                            ButtonSegment(value: 7, label: Text('7 days')),
                            ButtonSegment(value: 14, label: Text('14 days')),
                            ButtonSegment(value: 30, label: Text('30 days')),
                          ],
                          selected: {_days},
                          onSelectionChanged: (value) {
                            setState(() => _days = value.first);
                            _load();
                          },
                        ),
                        const SizedBox(height: 14),
                        infoCard(
                          'Average mood',
                          '${displayValue(_data['average_mood_score'], empty: '0')} / 5',
                          icon: Icons.mood_outlined,
                        ),
                        infoCard(
                          'Average sleep',
                          '${displayValue(_data['average_sleep_hours'], empty: '0')} hours',
                          icon: Icons.nightlight_outlined,
                        ),
                        infoCard(
                          'Check-ins',
                          displayValue(_data['entries_count'], empty: '0'),
                          icon: Icons.calendar_month_outlined,
                        ),
                        if (_entries.isNotEmpty)
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Mood and sleep history',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 16),
                                  SizedBox(
                                    height: 190,
                                    child: CustomPaint(
                                      painter: _TrendPainter(_entries),
                                      child: const SizedBox.expand(),
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  const Text(
                                    'Mood score: 1–5 · Sleep: hours per night',
                                    style: TextStyle(
                                        fontSize: 12, color: Colors.blueGrey),
                                  ),
                                ],
                              ),
                            ),
                          )
                        else
                          const Card(
                            child: Padding(
                              padding: EdgeInsets.all(20),
                              child: Text(
                                  'No check-ins in this time window. Record a mood to start seeing trends.'),
                            ),
                          ),
                        const SizedBox(height: 8),
                        const Text('Recent reflections',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        ..._entries
                            .where((entry) =>
                                (entry['journal_text']?.toString() ?? '')
                                    .isNotEmpty)
                            .map((entry) => infoCard(
                                  '${dateValue(entry['entry_date'] ?? entry['date'])} · ${displayValue(entry['sleep_hours'])} hrs sleep',
                                  displayValue(entry['journal_text']),
                                  icon: Icons.book_outlined,
                                )),
                        ..._emotionCounts().entries.map((entry) => Chip(
                              label: Text('${entry.key} (${entry.value})'),
                            )),
                      ],
                    ),
                  ),
      );

  Map<String, int> _emotionCounts() {
    final counts = <String, int>{};
    for (final entry in _entries) {
      final emotion = entry['dominant_emotion']?.toString();
      if (emotion != null && emotion.isNotEmpty) {
        counts[emotion] = (counts[emotion] ?? 0) + 1;
      }
    }
    return counts;
  }
}

class _TrendPainter extends CustomPainter {
  _TrendPainter(this.entries);

  final List<Map<String, dynamic>> entries;

  @override
  void paint(Canvas canvas, Size size) {
    const left = 28.0;
    const bottom = 22.0;
    final chartWidth = size.width - left - 8;
    final chartHeight = size.height - bottom - 8;
    final axis = Paint()
      ..color = const Color(0xFFE4E2EC)
      ..strokeWidth = 1;
    canvas.drawLine(Offset(left, 4), Offset(left, chartHeight + 4), axis);
    canvas.drawLine(
        Offset(left, chartHeight + 4),
        Offset(left + chartWidth, chartHeight + 4),
        axis);
    if (entries.isEmpty) return;

    final sleepPaint = Paint()
      ..color = const Color(0xFFD8D4F5)
      ..style = PaintingStyle.fill;
    final moodPaint = Paint()
      ..color = const Color(0xFF1E9B8A)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    final pointPaint = Paint()
      ..color = const Color(0xFF1E9B8A)
      ..style = PaintingStyle.fill;
    final spacing = chartWidth / entries.length;
    final path = Path();
    for (var index = 0; index < entries.length; index++) {
      final entry = entries[index];
      final x = left + spacing * index + spacing / 2;
      final sleep = _number(entry['sleep_hours']).clamp(0, 14);
      final mood = _number(entry['mood_score'] ?? entry['mood']).clamp(0, 5);
      final barHeight = (sleep / 14) * chartHeight;
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x - spacing * 0.25, chartHeight + 4 - barHeight,
              spacing * 0.5, barHeight),
          const Radius.circular(4),
        ),
        sleepPaint,
      );
      final moodY = chartHeight + 4 - (mood / 5) * chartHeight;
      if (index == 0) {
        path.moveTo(x, moodY);
      } else {
        path.lineTo(x, moodY);
      }
      canvas.drawCircle(Offset(x, moodY), 3.5, pointPaint);
    }
    canvas.drawPath(path, moodPaint);
  }

  double _number(dynamic value) {
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0;
    return 0;
  }

  @override
  bool shouldRepaint(covariant _TrendPainter oldDelegate) =>
      oldDelegate.entries != entries;
}

class HopeBotPage extends StatefulWidget {
  const HopeBotPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<HopeBotPage> createState() => _HopeBotPageState();
}

class _HopeBotPageState extends State<HopeBotPage> {
  final _message = TextEditingController();
  final _scroll = ScrollController();
  bool _loading = true;
  bool _sending = false;
  Object? _error;
  List<Map<String, dynamic>> _conversations = [];
  List<Map<String, dynamic>> _messages = [];
  int? _activeId;
  Map<String, dynamic>? _crisis;

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  @override
  void dispose() {
    _message.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadConversations() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await api.get('/chat/conversations');
      _conversations = mapList(response['conversations']);
      if (_conversations.isEmpty) {
        await _newConversation();
      } else {
        _activeId = _conversations.first['id'] as int;
        await _loadConversation(_activeId!);
      }
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _loadConversation(int id) async {
    final response = await api.get('/chat/conversations/$id');
    final conversation = response['conversation'];
    _messages = conversation is Map ? mapList(conversation['messages']) : [];
    _activeId = id;
    _crisis = null;
  }

  Future<void> _newConversation() async {
    final response = await api.post('/chat/conversations',
        body: {'title': 'Emotional Support Space'});
    final conversation = response['conversation'];
    if (conversation is Map) {
      final item = Map<String, dynamic>.from(conversation);
      if (mounted) {
        setState(() {
          _conversations = [item, ..._conversations];
          _activeId = item['id'] as int;
          _messages = mapList(item['messages']);
          _crisis = null;
        });
      }
    }
  }

  Future<void> _send([String? suggestion]) async {
    final text = (suggestion ?? _message.text).trim();
    final id = _activeId;
    if (text.isEmpty || id == null || _sending) return;
    _message.clear();
    setState(() => _sending = true);
    try {
      final response = await api.post('/chat/conversations/$id/messages',
          body: {'message': text});
      final userMessage = response['user_message'];
      final assistantMessage = response['assistant_message'];
      if (mounted) {
        setState(() {
          if (userMessage is Map) {
            _messages.add(Map<String, dynamic>.from(userMessage));
          }
          if (assistantMessage is Map) {
            _messages.add(Map<String, dynamic>.from(assistantMessage));
          }
          final crisis = response['crisis_info'];
          _crisis = response['safety_intercepted'] == true && crisis is Map
              ? Map<String, dynamic>.from(crisis)
              : null;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scroll.hasClients) {
            _scroll.animateTo(
              _scroll.position.maxScrollExtent,
              duration: const Duration(milliseconds: 250),
              curve: Curves.easeOut,
            );
          }
        });
      }
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _deleteConversation(int id) async {
    await runAction(context, () async {
      await api.delete('/chat/conversations/$id');
      _conversations.removeWhere((item) => item['id'] == id);
      if (_activeId == id) {
        _activeId = null;
        _messages = [];
        if (_conversations.isEmpty) {
          await _newConversation();
        } else {
          await _loadConversation(_conversations.first['id'] as int);
        }
      }
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'HopeBot support',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _loadConversations)
                : Column(
                    children: [
                      SizedBox(
                        height: 94,
                        child: Row(
                          children: [
                            Expanded(
                              child: ListView(
                                scrollDirection: Axis.horizontal,
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 8),
                                children: [
                                  ..._conversations.map((conversation) {
                                    final id = conversation['id'] as int;
                                    return Padding(
                                      padding: const EdgeInsets.only(right: 6),
                                      child: InputChip(
                                        label: Text(displayValue(
                                            conversation['title'],
                                            empty: 'Conversation')),
                                        selected: _activeId == id,
                                        onPressed: () async {
                                          try {
                                            await _loadConversation(id);
                                            if (mounted) setState(() {});
                                          } catch (error) {
                                            if (mounted) {
                                              showMessage(
                                                  context, error.toString());
                                            }
                                          }
                                        },
                                        onDeleted: () =>
                                            _deleteConversation(id),
                                      ),
                                    );
                                  }),
                                ],
                              ),
                            ),
                            IconButton(
                              tooltip: 'New conversation',
                              onPressed: () => runAction(context, _newConversation),
                              icon: const Icon(Icons.add_comment_outlined),
                            ),
                          ],
                        ),
                      ),
                      if (_crisis != null)
                        Material(
                          color: const Color(0xFFB42318),
                          child: ListTile(
                            title: const Text(
                              'Please reach out for immediate support.',
                              style: TextStyle(color: Colors.white),
                            ),
                            subtitle: Text(
                              displayValue(_crisis!['category']),
                              style: const TextStyle(color: Colors.white70),
                            ),
                            trailing: IconButton(
                              onPressed: () => Navigator.of(context).push(
                                MaterialPageRoute<void>(
                                  builder: (_) =>
                                      EmergencyPage(user: widget.user),
                                ),
                              ),
                              icon: const Icon(Icons.call, color: Colors.white),
                            ),
                          ),
                        ),
                      Expanded(
                        child: ListView(
                          controller: _scroll,
                          padding: const EdgeInsets.all(14),
                          children: _messages.map((message) {
                            final sender = (message['sender'] ??
                                    message['sender_type'] ??
                                    'assistant')
                                .toString();
                            final isUser = sender == 'user';
                            return Align(
                              alignment: isUser
                                  ? Alignment.centerRight
                                  : Alignment.centerLeft,
                              child: Container(
                                constraints: const BoxConstraints(maxWidth: 330),
                                margin: const EdgeInsets.only(bottom: 9),
                                padding: const EdgeInsets.all(13),
                                decoration: BoxDecoration(
                                  color: isUser
                                      ? const Color(0xFF5B4BDB)
                                      : Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: isUser
                                      ? null
                                      : Border.all(
                                          color: const Color(0xFFE7E6EF)),
                                ),
                                child: Text(
                                  displayValue(
                                      message['message_text'] ??
                                          message['text']),
                                  style: TextStyle(
                                    color: isUser
                                        ? Colors.white
                                        : const Color(0xFF263238),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                      if (_messages.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Wrap(
                            spacing: 6,
                            children: [
                              'I feel exhausted and keep crying',
                              'How can I handle sleep deprivation?',
                              'I feel disconnected from my baby',
                            ]
                                .map((prompt) => ActionChip(
                                      label: Text(prompt),
                                      onPressed: () => _send(prompt),
                                    ))
                                .toList(),
                          ),
                        ),
                      SafeArea(
                        top: false,
                        child: Padding(
                          padding: const EdgeInsets.all(10),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _message,
                                  minLines: 1,
                                  maxLines: 4,
                                  decoration: const InputDecoration(
                                    hintText: 'Share how you are feeling...',
                                  ),
                                  onSubmitted: (_) => _send(),
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton.filled(
                                onPressed:
                                    _sending ? null : () => _send(),
                                icon: _sending
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
                                      )
                                    : const Icon(Icons.send),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
      );
}

class CareTeamPage extends StatefulWidget {
  const CareTeamPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<CareTeamPage> createState() => _CareTeamPageState();
}

class _CareTeamPageState extends State<CareTeamPage> {
  final _search = TextEditingController();
  bool _loading = true;
  Object? _error;
  List<Map<String, dynamic>> _professionals = [];
  List<Map<String, dynamic>> _connections = [];
  List<Map<String, dynamic>> _consents = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        api.get('/collaboration/professionals',
            query: _search.text.trim().isEmpty
                ? null
                : {'specialization': _search.text.trim()}),
        api.get('/collaboration/connections'),
        api.get('/collaboration/consents'),
      ]);
      _professionals = mapList(results[0]['professionals']);
      _connections = mapList(results[1]['connections']);
      _consents = mapList(results[2]['consents']);
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  Map<String, dynamic>? _connection(int doctorId) {
    for (final item in _connections) {
      if (item['doctor_id'] == doctorId) return item;
    }
    return null;
  }

  bool _granted(int doctorId, String category) => _consents.any((item) =>
      item['doctor_id'] == doctorId &&
      item['category'] == category &&
      item['status'] == 'granted');

  Future<void> _request(int doctorId) async {
    await runAction(context, () async {
      await api.post('/collaboration/connections',
          body: {'doctor_id': doctorId});
      await _load();
      if (mounted) showMessage(context, 'Connection request sent.');
    });
  }

  Future<void> _revoke(int connectionId) async {
    await runAction(context, () async {
      await api.patch('/collaboration/connections/$connectionId',
          body: {'action': 'revoke'});
      await _load();
    });
  }

  Future<void> _toggleConsent(int doctorId, String category) async {
    await runAction(context, () async {
      await api.put('/collaboration/consents', body: {
        'doctor_id': doctorId,
        'category': category,
        'grant': !_granted(doctorId, category),
      });
      await _load();
    });
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Find your care team',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        const Text(
                          'A connection never grants automatic access. You choose which information to share.',
                          style: TextStyle(color: Colors.blueGrey),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _search,
                          decoration: InputDecoration(
                            labelText: 'Search specialization',
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.search),
                              onPressed: _load,
                            ),
                          ),
                          onSubmitted: (_) => _load(),
                        ),
                        const SizedBox(height: 14),
                        ..._professionals.map((doctor) {
                          final id = doctor['doctor_id'] as int;
                          final connection = _connection(id);
                          final status = connection?['status']?.toString();
                          final verify = doctor['verification'];
                          final modes = verify is Map
                              ? (verify['consultation_modes'] as List?)
                                      ?.join(', ') ??
                                  ''
                              : '';
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(displayValue(doctor['full_name']),
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                              fontWeight: FontWeight.bold)),
                                  Text(displayValue(doctor['specialization'])),
                                  if (doctor['biography'] != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                          displayValue(doctor['biography'])),
                                    ),
                                  Text(
                                    '${displayValue(doctor['hospital_affiliation'], empty: 'Independent practice')} · $modes',
                                    style: const TextStyle(
                                        color: Colors.blueGrey, fontSize: 12),
                                  ),
                                  const SizedBox(height: 10),
                                  SizedBox(
                                    width: double.infinity,
                                    child: FilledButton(
                                      onPressed: status == 'pending' ||
                                              status == 'accepted'
                                          ? null
                                          : () => _request(id),
                                      child: Text(status == 'accepted'
                                          ? 'Connected'
                                          : status == 'pending'
                                              ? 'Request pending'
                                              : status == 'declined'
                                                  ? 'Request again'
                                                  : 'Request connection'),
                                    ),
                                  ),
                                  if (status == 'accepted') ...[
                                    const Divider(),
                                    const Text(
                                      'Sharing permissions',
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold),
                                    ),
                                    ...[
                                      ('assessments', 'EPDS screening history'),
                                      ('mood', 'Mood and wellness trends'),
                                      ('reports', 'Selected clinical reports'),
                                    ].map((permission) => SwitchListTile(
                                          contentPadding: EdgeInsets.zero,
                                          title: Text(permission.$2),
                                          value: _granted(id, permission.$1),
                                          onChanged: (_) => _toggleConsent(
                                              id, permission.$1),
                                        )),
                                    const Text(
                                      'Journal entries and HopeBot conversations are not shared through care-team access.',
                                      style: TextStyle(
                                          fontSize: 12, color: Colors.blueGrey),
                                    ),
                                    TextButton(
                                      onPressed: () =>
                                          _revoke(connection!['id'] as int),
                                      child: const Text('Disconnect care team'),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        }),
                        if (_professionals.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(20),
                            child: Text(
                                'No verified care professionals found for this search.'),
                          ),
                      ],
                    ),
                  ),
      );
}

class AppointmentsPage extends StatefulWidget {
  const AppointmentsPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<AppointmentsPage> createState() => _AppointmentsPageState();
}

class _AppointmentsPageState extends State<AppointmentsPage> {
  bool _loading = true;
  Object? _error;
  List<Map<String, dynamic>> _appointments = [];
  List<Map<String, dynamic>> _connections = [];

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
      final response = await api.get('/collaboration/appointments');
      _appointments = mapList(response['appointments']);
      if (widget.user['role'] == 'mother') {
        final connectionResponse = await api.get('/collaboration/connections');
        _connections = mapList(connectionResponse['connections'])
            .where((item) => item['status'] == 'accepted')
            .toList();
      }
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _cancel(int id) async {
    await runAction(context, () async {
      await api.patch('/collaboration/appointments/$id',
          body: {'action': 'cancel'});
      await _load();
    });
  }

  Future<void> _request() async {
    if (_connections.isEmpty) {
      showMessage(context, 'Connect with a clinician before requesting an appointment.');
      return;
    }
    final connectionIds = _connections
        .map((item) => item['doctor_id'])
        .whereType<int>()
        .toSet()
        .toList();
    var doctorId = connectionIds.first;
    var mode = 'video';
    final reason = TextEditingController();
    var start = DateTime.now().add(const Duration(days: 2));
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Request an appointment'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  value: doctorId,
                  decoration: const InputDecoration(labelText: 'Clinician'),
                  items: _connections
                      .map((item) => DropdownMenuItem<int>(
                            value: item['doctor_id'] as int,
                            child: Text(displayValue(item['doctor_name'])),
                          ))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) setDialogState(() => doctorId = value);
                  },
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Start: ${start.toLocal()}'),
                  trailing: const Icon(Icons.schedule),
                  onTap: () async {
                    final date = await showDatePicker(
                      context: context,
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 365)),
                      initialDate: start,
                    );
                    if (date == null || !context.mounted) return;
                    final time = await showTimePicker(
                        context: context, initialTime: TimeOfDay.fromDateTime(start));
                    if (time != null) {
                      setDialogState(() => start = DateTime(
                            date.year,
                            date.month,
                            date.day,
                            time.hour,
                            time.minute,
                          ));
                    }
                  },
                ),
                DropdownButtonFormField<String>(
                  value: mode,
                  decoration:
                      const InputDecoration(labelText: 'Consultation mode'),
                  items: const [
                    DropdownMenuItem(value: 'video', child: Text('Video')),
                    DropdownMenuItem(value: 'phone', child: Text('Phone')),
                    DropdownMenuItem(
                        value: 'in_person', child: Text('In person')),
                  ],
                  onChanged: (value) =>
                      setDialogState(() => mode = value ?? 'video'),
                ),
                TextField(
                    controller: reason,
                    decoration: const InputDecoration(labelText: 'Reason (optional)')),
              ],
            ),
          ),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel')),
            FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Request')),
          ],
        ),
      ),
    );
    if (saved != true) return;
    await runAction(context, () async {
      await api.post('/collaboration/appointments', body: {
        'doctor_id': doctorId,
        'start_time': start.toUtc().toIso8601String(),
        'end_time': start.add(const Duration(minutes: 30)).toUtc().toIso8601String(),
        'consultation_mode': mode,
        'reason': reason.text.trim(),
      });
      await _load();
      if (mounted) showMessage(context, 'Appointment request sent.');
    });
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Appointments',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (widget.user['role'] == 'mother')
                          FilledButton.icon(
                            onPressed: _request,
                            icon: const Icon(Icons.add),
                            label: const Text('Request appointment'),
                          ),
                        if (_appointments.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(24),
                            child: Text('No appointments yet.'),
                          ),
                        ..._appointments.map((item) {
                          final status = item['status']?.toString() ?? '';
                          return Card(
                            child: ListTile(
                              leading: const Icon(Icons.calendar_month_outlined),
                              title: Text(displayValue(
                                widget.user['role'] == 'doctor'
                                    ? item['mother_name']
                                    : item['doctor_name'],
                                empty: 'Care team visit',
                              )),
                              subtitle: Text(
                                '${displayValue(item['start_time'])}\n${displayValue(item['consultation_mode'])} · $status',
                              ),
                              isThreeLine: true,
                              trailing: widget.user['role'] == 'mother' &&
                                      ['requested', 'confirmed'].contains(status)
                                  ? IconButton(
                                      tooltip: 'Cancel',
                                      icon: const Icon(Icons.cancel_outlined),
                                      onPressed: () =>
                                          _cancel(item['id'] as int),
                                    )
                                  : null,
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
      );
}

class WeeklyReportPage extends StatefulWidget {
  const WeeklyReportPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<WeeklyReportPage> createState() => _WeeklyReportPageState();
}

class _WeeklyReportPageState extends State<WeeklyReportPage> {
  DateTime _end = DateTime.now();
  late DateTime _start = _end.subtract(const Duration(days: 6));
  bool _loading = false;
  Map<String, dynamic> _report = {};

  String _date(DateTime value) =>
      '${value.year}-${value.month.toString().padLeft(2, '0')}-${value.day.toString().padLeft(2, '0')}';

  Future<void> _preview() async {
    setState(() => _loading = true);
    try {
      final response = await api.get('/reports/weekly/preview', query: {
        'start_date': _date(_start),
        'end_date': _date(_end),
      });
      final report = response['report'];
      _report = report is Map ? Map<String, dynamic>.from(report) : {};
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _download() async {
    await runAction(context, () async {
      final response = await api.getBytes('/reports/weekly', query: {
        'start_date': _date(_start),
        'end_date': _date(_end),
      });
      final directory = await getApplicationDocumentsDirectory();
      final path =
          '${directory.path}/HopeMind_Weekly_Wellness_Report_${_date(_start).replaceAll('-', '')}_${_date(_end).replaceAll('-', '')}.pdf';
      final file = File(path);
      await file.writeAsBytes(response.bodyBytes, flush: true);
      await Share.shareXFiles([XFile(file.path)],
          text: 'HopeMind Weekly Wellness Report');
    });
  }

  Future<void> _share() async {
    await runAction(context, () async {
      final response = await api.post('/reports/share', body: {
        'start_date': _date(_start),
        'end_date': _date(_end),
      });
      if (mounted) showMessage(context, displayValue(response['message']));
    });
  }

  Future<void> _pickDate({required bool start}) async {
    final current = start ? _start : _end;
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 1)),
    );
    if (picked == null) return;
    setState(() {
      if (start) {
        _start = picked;
      } else {
        _end = picked;
      }
    });
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Weekly wellness report',
        ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text(
              'Preview your selected period, then download a PDF or explicitly share it with your assigned clinician.',
              style: TextStyle(color: Colors.blueGrey),
            ),
            ListTile(
              title: Text('From: ${_date(_start)}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () => _pickDate(start: true),
            ),
            ListTile(
              title: Text('To: ${_date(_end)}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () => _pickDate(start: false),
            ),
            FilledButton(
              onPressed: _loading ? null : _preview,
              child: Text(_loading ? 'Loading...' : 'Preview report'),
            ),
            if (_report.isNotEmpty) ...[
              const SizedBox(height: 14),
              ..._report.entries.map((entry) => infoCard(
                    entry.key.replaceAll('_', ' '),
                    entry.value is Map || entry.value is List
                        ? entry.value.toString()
                        : displayValue(entry.value),
                    icon: Icons.insights_outlined,
                  )),
              OutlinedButton.icon(
                onPressed: _download,
                icon: const Icon(Icons.download_outlined),
                label: const Text('Download / share PDF'),
              ),
              if (widget.user['role'] == 'mother')
                OutlinedButton.icon(
                  onPressed: _share,
                  icon: const Icon(Icons.share_outlined),
                  label: const Text('Share report with assigned doctor'),
                ),
            ],
          ],
        ),
      );
}

class PrivacyPage extends StatefulWidget {
  const PrivacyPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<PrivacyPage> createState() => _PrivacyPageState();
}

class _PrivacyPageState extends State<PrivacyPage> {
  bool _loading = true;
  bool _saving = false;
  Map<String, dynamic> _privacy = {};
  final _contactName = TextEditingController();
  final _contactPhone = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _contactName.dispose();
    _contactPhone.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        api.get('/user/privacy'),
        api.get('/user/profile'),
      ]);
      final privacy = results[0]['privacy_preferences'];
      _privacy = privacy is Map ? Map<String, dynamic>.from(privacy) : {};
      final profile = results[1]['profile'];
      final mother = profile is Map ? profile['mother_profile'] : null;
      if (mother is Map) {
        _contactName.text =
            displayValue(mother['emergency_contact_name'], empty: '');
        _contactPhone.text =
            displayValue(mother['emergency_contact_phone'], empty: '');
      }
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await api.put('/user/privacy', body: _privacy);
      await api.put('/user/profile', body: {
        'emergency_contact_name': _contactName.text.trim(),
        'emergency_contact_phone': _contactPhone.text.trim(),
      });
      if (mounted) showMessage(context, 'Privacy and safety preferences saved.');
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Privacy & safety',
        _loading
            ? loadingView()
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const Text(
                    'You control sharing with clinicians and whether journal text is processed for NLP analysis.',
                    style: TextStyle(color: Colors.blueGrey),
                  ),
                  _switch('Journal sharing preference',
                      'share_journal_with_doctor'),
                  _switch('Share mood and sleep metrics',
                      'share_mood_with_doctor'),
                  _switch('Allow AI sentiment and theme analysis',
                      'allow_nlp_analysis'),
                  DropdownButtonFormField<String>(
                    value: ['daily', 'weekly', 'none']
                            .contains(_privacy['reminder_frequency'])
                        ? _privacy['reminder_frequency'] as String
                        : 'weekly',
                    decoration:
                        const InputDecoration(labelText: 'Reminder frequency'),
                    items: const [
                      DropdownMenuItem(value: 'daily', child: Text('Daily')),
                      DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                      DropdownMenuItem(value: 'none', child: Text('None')),
                    ],
                    onChanged: (value) => setState(
                        () => _privacy['reminder_frequency'] = value ?? 'weekly'),
                  ),
                  TextField(
                    controller: _contactName,
                    decoration: const InputDecoration(
                        labelText: 'Emergency contact name'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _contactPhone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                        labelText: 'Emergency contact phone'),
                  ),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _saving ? null : _save,
                    child: Text(_saving ? 'Saving...' : 'Save preferences'),
                  ),
                  const SizedBox(height: 16),
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(14),
                      child: Text(
                        'Care-team connections do not automatically share records. EPDS, mood trends, and reports have separate consent controls on the Care Team screen. The existing clinician detail API does not include journal text; this journal setting records your preference only. HopeBot conversations remain private.',
                        style: TextStyle(height: 1.4),
                      ),
                    ),
                  ),
                ],
              ),
      );

  Widget _switch(String title, String key) => SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(title),
        value: _privacy[key] == true,
        onChanged: (value) => setState(() => _privacy[key] = value),
      );
}

class ProfilePage extends StatefulWidget {
  const ProfilePage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _infantName = TextEditingController();
  final _infantGender = TextEditingController();
  final _deliveryDate = TextEditingController();
  final _deliveryType = TextEditingController();
  final _parity = TextEditingController();
  final _specialization = TextEditingController();
  final _hospital = TextEditingController();
  final _license = TextEditingController();
  final _biography = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    _infantName.dispose();
    _infantGender.dispose();
    _deliveryDate.dispose();
    _deliveryType.dispose();
    _parity.dispose();
    _specialization.dispose();
    _hospital.dispose();
    _license.dispose();
    _biography.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final response = await api.get('/user/profile');
      final profile = response['profile'];
      if (profile is Map) {
        _name.text = displayValue(profile['full_name'], empty: '');
        _phone.text = displayValue(profile['phone'], empty: '');
        final mother = profile['mother_profile'];
        if (mother is Map) {
          _infantName.text = displayValue(mother['infant_name'], empty: '');
          _infantGender.text =
              displayValue(mother['infant_gender'], empty: '');
          _deliveryDate.text =
              displayValue(mother['delivery_date'], empty: '');
          _deliveryType.text =
              displayValue(mother['delivery_type'], empty: '');
          _parity.text = displayValue(mother['parity'], empty: '');
        }
        final doctor = profile['doctor_profile'];
        if (doctor is Map) {
          _specialization.text =
              displayValue(doctor['specialization'], empty: '');
          _hospital.text =
              displayValue(doctor['hospital_affiliation'], empty: '');
          _license.text =
              displayValue(doctor['license_number'], empty: '');
          _biography.text = displayValue(doctor['biography'], empty: '');
        }
      }
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _saveProfile() async {
    setState(() => _saving = true);
    try {
      final payload = <String, dynamic>{
        'full_name': _name.text.trim(),
        'phone': _phone.text.trim(),
      };
      if (widget.user['role'] == 'mother') {
        payload['infant_name'] = _infantName.text.trim();
        payload['infant_gender'] = _infantGender.text.trim();
        payload['delivery_date'] = _deliveryDate.text.trim();
        payload['delivery_type'] = _deliveryType.text.trim();
        final parity = int.tryParse(_parity.text.trim());
        if (parity != null) payload['parity'] = parity;
      } else if (widget.user['role'] == 'doctor') {
        payload['specialization'] = _specialization.text.trim();
        payload['hospital_affiliation'] = _hospital.text.trim();
        payload['license_number'] = _license.text.trim();
        payload['biography'] = _biography.text.trim();
      }
      await api.put('/user/profile', body: payload);
      if (mounted) showMessage(context, 'Profile updated.');
    } catch (error) {
      if (mounted) showMessage(context, error.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _changePassword() async {
    final current = TextEditingController();
    final next = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: current,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current password'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: next,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Update')),
        ],
      ),
    );
    if (saved != true) return;
    await runAction(context, () async {
      await api.put('/auth/change-password', body: {
        'current_password': current.text,
        'new_password': next.text,
      });
      if (mounted) showMessage(context, 'Password updated.');
    });
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Profile settings',
        _loading
            ? loadingView()
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  TextField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Full name'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Phone'),
                  ),
                  if (widget.user['role'] == 'mother') ...[
                    const SizedBox(height: 10),
                    TextField(
                      controller: _infantName,
                      decoration:
                          const InputDecoration(labelText: 'Infant name'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _infantGender,
                      decoration:
                          const InputDecoration(labelText: 'Infant gender'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _deliveryDate,
                      decoration: const InputDecoration(
                          labelText: 'Delivery date (YYYY-MM-DD)'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _deliveryType,
                      decoration:
                          const InputDecoration(labelText: 'Delivery type'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _parity,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Parity'),
                    ),
                  ],
                  if (widget.user['role'] == 'doctor') ...[
                    const SizedBox(height: 10),
                    TextField(
                      controller: _specialization,
                      decoration:
                          const InputDecoration(labelText: 'Specialization'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _hospital,
                      decoration: const InputDecoration(
                          labelText: 'Hospital affiliation'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _license,
                      decoration:
                          const InputDecoration(labelText: 'License number'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: _biography,
                      minLines: 2,
                      maxLines: 4,
                      decoration:
                          const InputDecoration(labelText: 'Biography'),
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _saving ? null : _saveProfile,
                    child: Text(_saving ? 'Saving...' : 'Save profile'),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: _changePassword,
                    child: const Text('Change password'),
                  ),
                ],
              ),
      );
}

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  bool _loading = true;
  Object? _error;
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await api.get('/notifications');
      _items = mapList(response['notifications']);
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _markRead(int id) async {
    await runAction(context, () async {
      await api.put('/notifications/$id/read');
      await _load();
    });
  }

  Future<void> _markAllRead() async {
    await runAction(context, () async {
      await api.put('/notifications/read-all');
      await _load();
    });
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Notifications',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(
                            onPressed: _markAllRead,
                            child: const Text('Mark all as read'),
                          ),
                        ),
                        if (_items.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(24),
                            child: Text('No notifications.'),
                          ),
                        ..._items.map((item) => Card(
                              child: ListTile(
                                leading: Icon(
                                  item['is_read'] == true
                                      ? Icons.notifications_none
                                      : Icons.notifications_active_outlined,
                                ),
                                title: Text(displayValue(item['title'])),
                                subtitle: Text(
                                  '${displayValue(item['message'])}\n${dateValue(item['created_at'])}',
                                ),
                                isThreeLine: true,
                                onTap: item['is_read'] == true
                                    ? null
                                    : () => _markRead(item['id'] as int),
                              ),
                            )),
                      ],
                    ),
                  ),
      );
}

class EmergencyPage extends StatefulWidget {
  const EmergencyPage({required this.user, super.key});

  final Map<String, dynamic> user;

  @override
  State<EmergencyPage> createState() => _EmergencyPageState();
}

class _EmergencyPageState extends State<EmergencyPage> {
  bool _loading = true;
  Object? _error;
  String _disclaimer = '';
  List<Map<String, dynamic>> _contacts = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await api.get('/user/emergency-contacts',
          authenticated: false);
      _contacts = mapList(response['contacts']);
      _disclaimer = displayValue(response['disclaimer'], empty: '');
    } catch (error) {
      _error = error;
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _call(String number) async {
    final uri = Uri(scheme: 'tel', path: number.replaceAll(RegExp(r'[^0-9+]'), ''));
    if (!await canLaunchUrl(uri) || !await launchUrl(uri)) {
      if (mounted) showMessage(context, 'Unable to open the phone app.');
    }
  }

  @override
  Widget build(BuildContext context) => pageBody(
        'Immediate support',
        _loading
            ? loadingView()
            : _error != null
                ? errorView(_error!, _load)
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Card(
                        color: Color(0xFFFFEFED),
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                            'If you or someone else is in immediate danger, call local emergency services now. HopeMind is not an emergency service.',
                            style: TextStyle(
                                color: Color(0xFF8A1C13), height: 1.4),
                          ),
                        ),
                      ),
                      if (_contacts.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(18),
                          child: Text(
                              'No regional helplines are configured. Contact local emergency services or a trusted healthcare professional.'),
                        ),
                      ..._contacts.map((contact) => Card(
                            child: ListTile(
                              leading: const Icon(Icons.support_agent,
                                  color: Color(0xFF5B4BDB)),
                              title: Text(displayValue(contact['name'])),
                              subtitle: Text(
                                '${displayValue(contact['number'])} · ${displayValue(contact['region'])}\n${displayValue(contact['available'])}',
                              ),
                              isThreeLine: true,
                              trailing: IconButton(
                                tooltip: 'Call',
                                icon: const Icon(Icons.call),
                                onPressed: () => _call(
                                    displayValue(contact['number'], empty: '')),
                              ),
                            ),
                          )),
                      const SizedBox(height: 12),
                      Text(_disclaimer,
                          style: const TextStyle(color: Colors.blueGrey)),
                    ],
                  ),
      );
}
