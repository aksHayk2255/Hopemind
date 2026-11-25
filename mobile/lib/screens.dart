import 'package:flutter/material.dart';

import 'mother_screens.dart';
import 'staff_screens.dart';
import 'ui_helpers.dart';

export 'ui_helpers.dart';

class FeatureScreen extends StatelessWidget {
  const FeatureScreen({required this.feature, required this.user, super.key});

  final String feature;
  final Map<String, dynamic> user;

  @override
  Widget build(BuildContext context) {
    switch (feature) {
      case 'mother_dashboard':
        return MotherDashboardPage(user: user);
      case 'assessment':
        return AssessmentPage(user: user);
      case 'history':
        return AssessmentHistoryPage(user: user);
      case 'mood':
        return MoodCheckInPage(user: user);
      case 'trends':
        return MoodTrendsPage(user: user);
      case 'chat':
        return HopeBotPage(user: user);
      case 'care_team':
        return CareTeamPage(user: user);
      case 'appointments':
        return user['role'] == 'doctor'
            ? StaffPage(section: 'appointments', user: user)
            : AppointmentsPage(user: user);
      case 'report':
        return WeeklyReportPage(user: user);
      case 'privacy':
        return PrivacyPage(user: user);
      case 'profile':
        return ProfilePage(user: user);
      case 'notifications':
        return NotificationsPage(user: user);
      case 'emergency':
        return EmergencyPage(user: user);
      case 'patients':
      case 'connections':
      case 'followups':
      case 'admin_overview':
      case 'admin_users':
      case 'admin_audit':
      case 'admin_model':
        return StaffPage(section: feature, user: user);
      default:
        return const Scaffold(
          body: Center(child: Text('This feature is not available.')),
        );
    }
  }
}
