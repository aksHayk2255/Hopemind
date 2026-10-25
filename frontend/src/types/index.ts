export type UserRole = 'mother' | 'doctor' | 'admin';

export interface MotherProfile {
  id: number;
  user_id: number;
  date_of_birth?: string;
  delivery_date?: string;
  infant_name?: string;
  infant_gender?: string;
  delivery_type?: string;
  parity?: number;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  history_of_depression?: boolean;
}

export interface DoctorProfile {
  id: number;
  user_id: number;
  specialization?: string;
  license_number?: string;
  hospital_affiliation?: string;
  phone?: string;
  biography?: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  mother_profile?: MotherProfile;
  doctor_profile?: DoctorProfile;
}

export interface AuthResponse {
  access_token: string;
  user: User;
  message?: string;
}

export interface EPDSOption {
  index: number;
  text: string;
}

export interface EPDSQuestion {
  id: number;
  question: string;
  options: EPDSOption[];
}

export interface AssessmentResponseItem {
  question_index: number;
  question_text: string;
  selected_option_index: number;
  selected_option_text: string;
  score: number;
}

export interface MLPredictionInfo {
  predicted_risk_score: number;
  probability?: number;
  predicted_category: 'low' | 'moderate' | 'high';
  category?: 'low' | 'moderate' | 'high';
  clinical_guidance: string;
  guidance?: string;
  model_name: string;
  model_version: string;
  top_features: { feature: string; impact: string; clinical_relevance: string }[];
  disclaimer: string;
}

export interface AssessmentRecord {
  id: number;
  user_id: number;
  assessment_type: string;
  total_score: number;
  risk_category: 'low' | 'moderate' | 'high';
  q10_positive: boolean;
  clinical_recommendation: string;
  created_at: string;
  responses?: AssessmentResponseItem[];
  ml_prediction?: MLPredictionInfo;
  user_name?: string;
  screening_category?: 'low' | 'moderate' | 'high';
  question_10_flag?: boolean;
  clinical_action_recommended?: string;
}

export interface MoodEntry {
  id: number;
  user_id: number;
  date: string;
  mood_score: number;
  sleep_hours: number;
  anxiety_level?: number;
  energy_level?: number;
  emotion_tags: string[];
  journal_text?: string;
  sentiment_score?: number;
  sentiment_label?: 'positive' | 'neutral' | 'negative';
  dominant_emotion?: string;
  detected_themes?: string[];
  created_at: string;
}

export interface MoodTrends {
  period_days: number;
  total_entries: number;
  average_mood: number;
  average_sleep: number;
  top_emotions: { emotion: string; count: number }[];
  top_themes: { theme: string; count: number }[];
  daily_trends: {
    date: string;
    mood: number;
    sleep: number;
    anxiety: number;
  }[];
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_type: 'user' | 'assistant' | 'system';
  message_text: string;
  created_at: string;
  is_crisis?: boolean;
}

export interface EmergencyContact {
  name: string;
  number: string;
  region: string;
  available: string;
  type: string;
}

export interface PatientSummary {
  id: number;
  mother_user_id: number;
  full_name: string;
  email: string;
  phone?: string;
  infant_name?: string;
  delivery_date?: string;
  weeks_postpartum?: number;
  latest_epds_score?: number;
  latest_risk_category?: 'low' | 'moderate' | 'high';
  q10_flagged: boolean;
  ml_risk_probability?: number;
  last_assessment_date?: string;
  average_sleep_hours?: number;
  status: 'critical' | 'attention' | 'stable';
}

export interface ClinicalNote {
  id: number;
  doctor_name: string;
  note_type: string;
  notes_text: string;
  recommendations: string;
  created_at: string;
}

export interface FollowUpRecord {
  id: number;
  scheduled_date: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface PatientDetail extends PatientSummary {
  profile: MotherProfile;
  assessments: AssessmentRecord[];
  mood_entries: MoodEntry[];
  clinical_notes: ClinicalNote[];
  follow_ups: FollowUpRecord[];
  detected_themes_summary: { theme: string; frequency: number }[];
}

export interface AdminStats {
  total_users: number;
  total_mothers: number;
  total_doctors: number;
  total_assessments: number;
  total_mood_entries: number;
  high_risk_assessments_count: number;
  critical_q10_count: number;
  active_sessions_today: number;
}

export interface AuditLogItem {
  id: number;
  user_email: string;
  user_role: string;
  action: string;
  resource_type: string;
  status: string;
  ip_address: string;
  timestamp: string;
  details?: string;
}

export interface ModelMetrics {
  model_name: string;
  model_version: string;
  algorithm: string;
  training_dataset_size: number;
  validation_auc_roc: number;
  sensitivity_recall: number;
  specificity: number;
  f1_score: number;
  top_features: { feature: string; importance: number; description: string }[];
}

export interface UserPrivacyPreference {
  share_journal_with_doctor: boolean;
  share_mood_with_doctor: boolean;
  allow_nlp_analysis: boolean;
  email_notifications_enabled: boolean;
  reminder_frequency: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'clinical';
  is_read: boolean;
  created_at: string;
}
