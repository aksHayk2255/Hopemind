import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  CheckCircle2,
  AlertCircle,
  Bell,
  Heart,
  Save,
  Phone
} from 'lucide-react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { UserPrivacyPreference } from '../../types';

export const PrivacySettings: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [privacy, setPrivacy] = useState<UserPrivacyPreference>({
    share_journal_with_doctor: true,
    share_mood_with_doctor: true,
    allow_nlp_analysis: true,
    email_notifications_enabled: true,
    reminder_frequency: 'weekly'
  });

  const [emergencyName, setEmergencyName] = useState<string>(
    user?.mother_profile?.emergency_contact_name || ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState<string>(
    user?.mother_profile?.emergency_contact_phone || ''
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await userService.getPrivacy();
        if (res && res.privacy_preferences) {
          setPrivacy(res.privacy_preferences);
        }
      } catch (e) {
        console.error('Failed to load privacy preferences:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleToggle = (key: keyof UserPrivacyPreference) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      await Promise.all([
        userService.updatePrivacy(privacy),
        userService.updateProfile({
          emergency_contact_name: emergencyName,
          emergency_contact_phone: emergencyPhone
        })
      ]);

      await refreshUser();
      setSuccess('Privacy preferences and emergency contact updated successfully!');
    } catch (err: any) {
      setError('Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <ShieldCheck className="w-8 h-8 text-lavender-500 animate-pulse mx-auto mb-2" />
        <p className="text-sm text-slate-500">Loading privacy controls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">
          Privacy, Consent & Safety Controls
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          You are always in complete control of what information is shared with your doctor and processed by AI.
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Clinical Sharing Preferences */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft space-y-6">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-lavender-600" />
            Healthcare Provider Data Sharing
          </h2>

          <div className="space-y-4">
            {/* Toggle 1 */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="pr-4 space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                  Share Journal Reflections with Doctor
                </span>
                <span className="text-xs text-slate-500 block">
                  When enabled, your licensed perinatal doctor can read your journal reflections to better understand daily emotional context.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('share_journal_with_doctor')}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  privacy.share_journal_with_doctor ? 'bg-lavender-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    privacy.share_journal_with_doctor ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 2 */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="pr-4 space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                  Share Mood & Sleep Metrics
                </span>
                <span className="text-xs text-slate-500 block">
                  Enables your care provider to review your 14-day sleep duration averages and daily emotional score trajectory.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('share_mood_with_doctor')}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  privacy.share_mood_with_doctor ? 'bg-lavender-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    privacy.share_mood_with_doctor ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Toggle 3 */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="pr-4 space-y-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                  Allow AI NLP Sentiment & Theme Analysis
                </span>
                <span className="text-xs text-slate-500 block">
                  Natural Language Processing detects recurring themes like exhaustion, anxiety, or bonding to highlight clinical focus areas.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('allow_nlp_analysis')}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                  privacy.allow_nlp_analysis ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                    privacy.allow_nlp_analysis ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Emergency Contact Information */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4 text-rose-600" />
            Designated Emergency Contact
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Full Name
              </label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. Rohan Sharma (Spouse)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-lavender-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Phone Number
              </label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+91 98765 33333"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:border-lavender-500 outline-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-lavender-600 hover:bg-lavender-700 active:scale-[0.99] text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Updating Settings...' : 'Save Privacy & Safety Preferences'}
        </button>
      </form>
    </div>
  );
};
