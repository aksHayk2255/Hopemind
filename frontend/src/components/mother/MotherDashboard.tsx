import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Smile,
  Moon,
  MessageCircleHeart,
  TrendingUp,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CalendarCheck,
  Baby
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { assessmentService } from '../../services/assessmentService';
import { moodService } from '../../services/moodService';
import { doctorService } from '../../services/doctorService';
import { AssessmentRecord, MoodEntry } from '../../types';

interface MotherDashboardProps {
  onOpenEmergency: () => void;
}

export const MotherDashboard: React.FC<MotherDashboardProps> = ({ onOpenEmergency }) => {
  const { user } = useAuth();
  const [latestAssessment, setLatestAssessment] = useState<AssessmentRecord | null>(null);
  const [recentMoods, setRecentMoods] = useState<MoodEntry[]>([]);
  const [avgSleep, setAvgSleep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const motherProfile = user?.mother_profile;
  const infantName = motherProfile?.infant_name || 'your little one';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(false);
      try {
        const [assessRes, moodRes] = await Promise.all([
          assessmentService.getHistory(),
          moodService.getAnalytics(7)
        ]);

        if (assessRes?.assessments && assessRes.assessments.length > 0) {
          setLatestAssessment(assessRes.assessments[0]);
        }

        if (moodRes?.entries) {
          setRecentMoods(moodRes.entries);
          setAvgSleep(moodRes.average_sleep_hours || 0);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'high':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#312e81] via-[#5b4bdb] to-[#c94743] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#ffc4bd]" />
            <span>Gentle Postpartum Care & Emotional Wellness</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Mama'}
          </h1>
          <p className="text-sm leading-relaxed text-white/90 sm:text-base">
            Nurturing {infantName} begins with caring for yourself. You are doing important, courageous work every single day.
          </p>
        </div>

        {/* Decorative background element */}
        <div className="absolute -right-8 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Critical Alert Notice if Q10 flagged */}
      {latestAssessment?.q10_positive && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-pulse">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Compassionate Support Notice</p>
              <p className="text-xs text-rose-800 mt-0.5">
                Your recent response indicated emotional strain. Please know that help and gentle guidance are available 24/7 without judgment.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenEmergency}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shrink-0 shadow-xs"
          >
            Connect to Support Lines
          </button>
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* EPDS Score Status */}
        <div className="interactive-card p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              EPDS Screening
            </span>
            <div className="w-8 h-8 rounded-xl bg-lavender-100 flex items-center justify-center text-lavender-700">
              <Heart className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-navy-950">
                {latestAssessment ? latestAssessment.total_score : '—'}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 30</span>
            </div>
            {latestAssessment ? (
              <div className="mt-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${getCategoryColor(latestAssessment.risk_category)}`}>
                  {latestAssessment.risk_category} Risk
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(latestAssessment.created_at).toLocaleDateString()}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">No screening completed yet</p>
            )}
          </div>

          <Link
            to="/mother/assessment"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-lavender-700 hover:text-lavender-900 flex items-center justify-between group"
          >
            <span>{latestAssessment ? 'Retake Screening' : 'Start EPDS Screening'}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Daily Mood Check */}
        <div className="interactive-card p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Today's Mood
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
              <Smile className="w-4 h-4" />
            </div>
          </div>

          <div>
            <span className="text-2xl font-extrabold text-navy-950">
              {recentMoods.length > 0 ? (
                recentMoods[0].sentiment_label ? (
                  <span className="capitalize">{recentMoods[0].sentiment_label}</span>
                ) : (
                  'Recorded'
                )
              ) : (
                'Pending'
              )}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              {recentMoods.length > 0
                ? `${recentMoods.length} check-ins in the last 7 days`
                : 'Take 60 seconds to log how you feel'}
            </p>
          </div>

          <Link
            to="/mother/mood"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center justify-between group"
          >
            <span>Log Daily Mood</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Sleep Tracker */}
        <div className="interactive-card p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Avg Sleep (7d)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Moon className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-navy-950">
                {avgSleep > 0 ? avgSleep.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-slate-500 font-medium">hrs / night</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {avgSleep < 5
                ? 'Fragmented sleep elevates postpartum fatigue'
                : 'Consistent rest supports emotional restoration'}
            </p>
          </div>

          <Link
            to="/mother/trends"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center justify-between group"
          >
            <span>View Sleep & Mood Trends</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* HopeBot AI Companion */}
        <div className="interactive-card p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              AI Support
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <MessageCircleHeart className="w-4 h-4" />
            </div>
          </div>

          <div>
            <span className="text-xl font-bold text-navy-950">HopeBot</span>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Safe, non-judgmental conversational space available at any hour.
            </p>
          </div>

          <Link
            to="/mother/chat"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center justify-between group"
          >
            <span>Talk to HopeBot</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Action Banners & Self-Care Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Clinical Assessment Status */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy-950">
                Edinburgh Postnatal Depression Scale (EPDS)
              </h2>
              <p className="text-xs text-slate-500">
                Gold standard 10-item clinical screening recommended by ACOG and WHO
              </p>
            </div>
            <Link
              to="/mother/assessment"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-lavender-600 hover:bg-lavender-700 text-white shadow-soft transition-colors"
            >
              Take Screening
            </Link>
          </div>

          {latestAssessment ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Latest Recommendation:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getCategoryColor(latestAssessment.risk_category)}`}>
                  {latestAssessment.risk_category.toUpperCase()} RISK (Score: {latestAssessment.total_score}/30)
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {latestAssessment.clinical_recommendation}
              </p>
              {latestAssessment.ml_prediction && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span>ML Risk Estimate: <strong>{Math.round((latestAssessment.ml_prediction.predicted_risk_score || 0) * 100)}%</strong></span>
                  <span className="text-slate-400">Model: {latestAssessment.ml_prediction.model_name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-lavender-50/50 border border-lavender-100 text-center space-y-2">
              <Heart className="w-8 h-8 text-lavender-500 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800">No assessment recorded yet</h4>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Completing your first screening takes just 3 minutes and gives you and your doctor a safe, evidence-based baseline.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Link
              to="/mother/history"
              className="p-3 rounded-2xl border border-slate-200 hover:border-lavender-300 hover:bg-lavender-50/30 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-4 h-4 text-lavender-600" />
                <span className="text-xs font-semibold text-slate-800">Screening History</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>

            <Link
              to="/mother/trends"
              className="p-3 rounded-2xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <TrendingUp className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-semibold text-slate-800">Longitudinal Charts</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Right Column: Gentle Daily Reassurance & Doctor Link */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-lavender-700 mb-2">
              <Baby className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Your Postpartum Bubble
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Parenthood is not a test to pass; it is a gentle journey of adjustment. Many mothers experience baby blues, exhaustion, self-doubt, or sadness. Acknowledging your feelings is the greatest act of love.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-2">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Doctor Connected
            </div>
            <p className="text-[11px] text-teal-800 leading-relaxed">
              Your screening history is securely synchronized with your perinatal healthcare team, allowing timely support whenever you need it.
            </p>
          </div>

          <button
            onClick={onOpenEmergency}
            className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            View Immediate Crisis Helplines
          </button>
        </div>
      </div>
    </div>
  );
};
