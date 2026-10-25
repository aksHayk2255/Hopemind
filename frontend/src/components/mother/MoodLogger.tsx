import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smile,
  Moon,
  Battery,
  Sparkles,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { moodService } from '../../services/moodService';
import { MoodEntry } from '../../types';

export const MoodLogger: React.FC = () => {
  const navigate = useNavigate();

  const [mood, setMood] = useState<'very_sad' | 'sad' | 'neutral' | 'happy' | 'very_happy'>('neutral');
  const [sleepHours, setSleepHours] = useState<number>(6.5);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [journalText, setJournalText] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successEntry, setSuccessEntry] = useState<MoodEntry | null>(null);
  const [error, setError] = useState<string>('');

  const moodOptions = [
    { value: 'very_sad', label: 'Overwhelmed / Low', emoji: '😢', color: 'hover:border-rose-300 hover:bg-rose-50/50' },
    { value: 'sad', label: 'Tired / Gloomy', emoji: '😔', color: 'hover:border-amber-300 hover:bg-amber-50/50' },
    { value: 'neutral', label: 'Neutral / Getting by', emoji: '😐', color: 'hover:border-slate-300 hover:bg-slate-50' },
    { value: 'happy', label: 'Calm / Content', emoji: '🙂', color: 'hover:border-teal-300 hover:bg-teal-50/50' },
    { value: 'very_happy', label: 'Joyful / Supported', emoji: '😊', color: 'hover:border-lavender-300 hover:bg-lavender-50/50' }
  ];

  const suggestedTags = [
    'Grateful',
    'Exhausted',
    'Anxious',
    'Baby Smiles',
    'Night Feedings',
    'Crying Spells',
    'Peaceful',
    'Partner Support',
    'Lonely',
    'Bonding'
  ];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Append selected tags to journal text if provided
      let fullJournal = journalText.trim();
      if (selectedTags.length > 0) {
        fullJournal = `[Emotions: ${selectedTags.join(', ')}] ${fullJournal}`.trim();
      }

      const res = await moodService.logMood({
        mood,
        sleep_hours: sleepHours,
        energy_level: energyLevel,
        journal_text: fullJournal || undefined
      });

      setSuccessEntry(res.entry);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record mood entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (successEntry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 animate-fadeIn">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-card text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-navy-950">
            Check-In Logged With Love
          </h2>

          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Thank you for checking in with yourself today. Recognizing how you feel is the cornerstone of maternal resilience.
          </p>

          {successEntry.dominant_emotion && (
            <div className="p-4 rounded-2xl bg-lavender-50 border border-lavender-200 text-xs text-lavender-900 inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lavender-600" />
              <span>AI Journal Insight: Detected tone is <strong>{successEntry.dominant_emotion}</strong></span>
            </div>
          )}

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setSuccessEntry(null);
                setJournalText('');
                setSelectedTags([]);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
            >
              Log Another Entry
            </button>
            <button
              onClick={() => navigate('/mother/trends')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-lavender-600 hover:bg-lavender-700 text-white shadow-soft transition-colors flex items-center gap-1.5"
            >
              <span>View Wellness Trends</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-navy-950">
          Daily Emotional & Sleep Check-In
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          A gentle minute for you. No judgments, just compassionate space to record where your heart and body are today.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft space-y-6">
        {/* 1. How are you feeling right now? */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Smile className="w-4 h-4 text-lavender-600" />
            1. How does your heart feel today?
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {moodOptions.map((opt) => {
              const isSelected = mood === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMood(opt.value as any)}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${opt.color} ${
                    isSelected
                      ? 'border-lavender-500 bg-lavender-50 ring-2 ring-lavender-300 shadow-xs'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-[11px] font-semibold text-slate-800 leading-tight">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Sleep Hours */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-indigo-600" />
              2. Total Rest & Sleep
            </label>
            <span className="text-base font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
              {sleepHours.toFixed(1)} hours
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="14"
            step="0.5"
            value={sleepHours}
            onChange={(e) => setSleepHours(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0 hrs (Insomnia/Colic)</span>
            <span>6 hrs</span>
            <span>12+ hrs</span>
          </div>
        </div>

        {/* 3. Energy Level */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Battery className="w-4 h-4 text-teal-600" />
            3. Physical Energy
          </label>

          <div className="grid grid-cols-3 gap-3">
            {[
              { val: 'low', label: 'Drained / Heavy' },
              { val: 'moderate', label: 'Steady / Managing' },
              { val: 'high', label: 'Restored / Energetic' }
            ].map((lvl) => {
              const isSelected = energyLevel === lvl.val;
              return (
                <button
                  key={lvl.val}
                  type="button"
                  onClick={() => setEnergyLevel(lvl.val as any)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50 text-teal-900 ring-2 ring-teal-200'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Emotion Chips */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            4. Quick Feelings Tags (Optional)
          </label>

          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? 'bg-lavender-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Personal Journal Reflection */}
        <div className="space-y-2 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-slate-600" />
              5. Private Journal Reflection (Optional)
            </label>
            <span className="text-[11px] text-slate-400">
              {journalText.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          <textarea
            rows={4}
            value={journalText}
            onChange={(e) => setJournalText(e.target.value)}
            placeholder="Write freely about today... feeding challenges, feelings of tenderness, moments of exhaustion, or whatever is in your mind. Your journal is private unless you choose to share trends with your doctor in Settings."
            className="w-full p-3.5 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:border-lavender-500 focus:ring-2 focus:ring-lavender-200 outline-none transition-all leading-relaxed"
          />

          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-lavender-500 shrink-0" />
            AI extracts compassionate emotional themes to help your care team identify patterns.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full min-h-12 rounded-2xl bg-[#5b4bdb] py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#4938b9] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? 'Recording Entry...' : 'Save Daily Check-In'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
