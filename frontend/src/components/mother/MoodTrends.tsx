import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Smile,
  Moon,
  Sparkles,
  Calendar,
  ArrowRight,
  Heart,
  BookOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { moodService } from '../../services/moodService';
import { MoodEntry } from '../../types';

export const MoodTrends: React.FC = () => {
  const [days, setDays] = useState<number>(14);
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [avgMood, setAvgMood] = useState<number>(0);
  const [avgSleep, setAvgSleep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await moodService.getAnalytics(days);
        if (res && res.entries) {
          setEntries(res.entries);
          setAvgMood(res.average_mood_score || 0);
          setAvgSleep(res.average_sleep_hours || 0);
        }
      } catch (e) {
        console.error('Error fetching mood trends:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [days]);

  const chartData = entries.map((e) => ({
    date: new Date(e.created_at || (e as any).entry_date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    }),
    mood: (e as any).mood_score || 3,
    sleep: e.sleep_hours || 0
  }));

  // Aggregate NLP themes
  const themeCounts: Record<string, number> = {};
  entries.forEach((e) => {
    if ((e as any).dominant_emotion) {
      const theme = (e as any).dominant_emotion;
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
  });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <TrendingUp className="w-8 h-8 text-teal-600 animate-pulse mx-auto mb-2" />
        <p className="text-sm text-slate-500">Compiling wellness trends...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">
            Wellness, Mood & Sleep Trends
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Understanding the rhythm between postpartum rest and emotional resilience
          </p>
        </div>

        {/* Days Filter */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                days === d
                  ? 'bg-white text-navy-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Average Mood Score
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-navy-950">
                {avgMood > 0 ? avgMood.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Smile className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Average Sleep Duration
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-navy-950">
                {avgSleep > 0 ? avgSleep.toFixed(1) : '—'}
              </span>
              <span className="text-xs text-slate-400">hours / night</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Moon className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Total Logged Check-Ins
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-navy-950">
                {entries.length}
              </span>
              <span className="text-xs text-slate-400">entries</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-lavender-100 text-lavender-700 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recharts Mood & Sleep Correlation Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Daily Mood & Sleep Correlation
            </h2>
            <p className="text-xs text-slate-500">
              Bars denote sleep hours (indigo); line tracks mood score (teal).
            </p>
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No entries recorded for this time window. Log a mood entry to view interactive trends.
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" domain={[0, 14]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-modal border border-slate-200 text-xs space-y-1">
                          <p className="font-bold text-slate-900">{data.date}</p>
                          <p className="text-indigo-600 font-semibold">Sleep: {data.sleep} hours</p>
                          <p className="text-teal-600 font-semibold">Mood Score: {data.mood} / 5</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="sleep" name="Sleep Hours" fill="#cbc9e6" radius={[6, 6, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="mood"
                  name="Mood Score (1-5)"
                  stroke="#e85d55"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#e85d55' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Thematic Tags & Recent Journal Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NLP Themes Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lavender-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Detected Emotional Themes
            </h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Recurring sentiments identified from your personal check-in reflections:
          </p>

          <div className="flex flex-wrap gap-2 pt-2">
            {Object.keys(themeCounts).length === 0 ? (
              <p className="text-xs text-slate-400 italic">No themes detected yet.</p>
            ) : (
              Object.entries(themeCounts).map(([theme, count]) => (
                <span
                  key={theme}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-lavender-50 border border-lavender-200 text-lavender-900"
                >
                  {theme} ({count})
                </span>
              ))
            )}
          </div>
        </div>

        {/* Recent Journal Reflections List */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recent Journal Reflections
              </h3>
            </div>
            <Link
              to="/mother/mood"
              className="text-xs font-semibold text-lavender-700 hover:underline"
            >
              + New Entry
            </Link>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {entries.filter((e) => e.journal_text).length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                No journal reflections recorded in this window.
              </p>
            ) : (
              entries
                .filter((e) => e.journal_text)
                .map((e) => (
                  <div
                    key={e.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {new Date((e as any).entry_date || e.created_at).toLocaleDateString()}
                      </span>
                      <span>Rest: {e.sleep_hours} hrs</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed italic">
                      "{e.journal_text}"
                    </p>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
