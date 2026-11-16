import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Share2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Lock,
  UserCheck,
  Loader2,
  RefreshCw,
  Info
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
import { reportService } from '../../services/reportService';
import { WeeklyReportData } from '../../types';

interface WeeklyWellnessReportProps {
  initialStartDate?: string;
  initialEndDate?: string;
}

const formatYMD = (d: Date) => d.toISOString().split('T')[0];

export const WeeklyWellnessReport: React.FC<WeeklyWellnessReportProps> = ({
  initialStartDate,
  initialEndDate
}) => {
  // Date states: default to last 7 days (today - 6 days through today)
  const [startDate, setStartDate] = useState<string>(() => {
    if (initialStartDate) return initialStartDate;
    const now = new Date();
    return formatYMD(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  });

  const [endDate, setEndDate] = useState<string>(() => {
    if (initialEndDate) return initialEndDate;
    return formatYMD(new Date());
  });

  const defaultEnd = formatYMD(new Date());

  const [loading, setLoading] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);
  const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
  const [hasData, setHasData] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareAuthorized, setShareAuthorized] = useState<boolean>(false);

  // Quick preset helper
  const handlePreset = (daysBack: number, offsetDays = 0) => {
    const now = new Date();
    const end = new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - (daysBack - 1) * 24 * 60 * 60 * 1000);
    setStartDate(formatYMD(start));
    setEndDate(formatYMD(end));
    setErrorMsg(null);
  };

  const handleGenerateReport = useCallback(async () => {
    if (!startDate || !endDate) {
      setErrorMsg('Please select both a start date and an end date.');
      return;
    }
    if (startDate > endDate) {
      setErrorMsg('Start date cannot be after end date.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setShareSuccess(null);

    try {
      const res = await reportService.getWeeklyPreview(startDate, endDate);
      if (res && res.report) {
        setReportData(res.report);
        setHasData(res.has_data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Unable to generate weekly report preview. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  // Initial load
  useEffect(() => {
    void handleGenerateReport();
  }, [handleGenerateReport]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setErrorMsg(null);
    try {
      await reportService.downloadWeeklyReportPdf(startDate, endDate);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to download PDF report. Please try again.';
      setErrorMsg(msg);
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmShare = async () => {
    if (!reportData?.doctor_info) return;
    setSharing(true);
    setErrorMsg(null);
    try {
      const res = await reportService.shareReportWithDoctor(
        startDate,
        endDate,
        reportData.doctor_info.doctor_id
      );
      setShareSuccess(res.message);
      setShowShareModal(false);
      setShareAuthorized(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to share report with doctor. Please verify connection.';
      setErrorMsg(msg);
    } finally {
      setSharing(false);
    }
  };

  // Prepare chart data for the preview
  const chartData = (reportData?.daily_records || []).map((r) => ({
    date: `${r.day_name} ${r.date.slice(5)}`,
    mood: r.mood_score,
    sleep: r.sleep_hours || 0
  }));

  return (
    <section className="bg-white rounded-3xl border border-slate-200/80 shadow-soft p-6 sm:p-8 space-y-6">
      {/* Header and description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-coral-500" />
            <span>Weekly Wellness Report (PDF Generation)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy-950">
            Generate & Download Weekly Summary
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Compile your self-reported mood, sleep consistency, energy levels, and screening history into a clinician-ready PDF document.
          </p>
        </div>

        {/* Date presets */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => handlePreset(7)}
            className="px-3 py-1.5 rounded-xl font-bold bg-white text-navy-950 shadow-xs hover:bg-slate-50 transition"
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => handlePreset(7, 7)}
            className="px-3 py-1.5 rounded-xl font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Prior Week
          </button>
          <button
            type="button"
            onClick={() => handlePreset(14)}
            className="px-3 py-1.5 rounded-xl font-medium text-slate-600 hover:text-slate-900 transition"
          >
            14 Days
          </button>
        </div>
      </div>

      {/* Date Range Selection & Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Reporting Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              max={endDate || defaultEnd}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5b4bdb] focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="sm:col-span-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Reporting End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={defaultEnd}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#5b4bdb] focus:border-transparent transition"
            />
          </div>
        </div>

        <div className="sm:col-span-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateReport}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#5b4bdb] hover:bg-[#4938b9] text-white text-xs font-bold shadow-md shadow-indigo-100 transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Generate Weekly Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error / Alert Messages */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {shareSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{shareSuccess}</div>
        </div>
      )}

      {/* Insufficient Data Alert */}
      {!hasData && !loading && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Notice: Insufficient check-in records for this period</span>
          </div>
          <p className="leading-relaxed">
            No daily mood or sleep logs were recorded between{' '}
            <b>{startDate}</b> and <b>{endDate}</b>. You can still preview your EPDS screening history or download a template summary, but we encourage logging daily check-ins for complete clinical trends.
          </p>
        </div>
      )}

      {/* Loading state indicator */}
      {loading && (
        <div className="py-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#5b4bdb] animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            Compiling your maternal wellness metrics and formatting preview...
          </p>
        </div>
      )}

      {/* REPORT PREVIEW SECTION */}
      {reportData && !loading && (
        <div className="space-y-6 pt-2">
          {/* Action buttons (Download PDF & Share) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-navy-950">Report Preview:</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                {reportData.metadata.period_display}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#e85d55] hover:bg-[#d44840] text-white text-xs font-bold shadow-md shadow-rose-100 transition disabled:opacity-60"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>

              {reportData.doctor_info ? (
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share with Dr. {reportData.doctor_info.name.replace(/^Dr\.\s*/, '')}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  (Connect with a doctor in Care Team to enable sharing)
                </span>
              )}
            </div>
          </div>

          {/* PDF Preview Container */}
          <div className="border border-slate-200 rounded-2xl p-6 sm:p-8 bg-gradient-to-b from-white to-slate-50/40 shadow-xs space-y-6">
            {/* Report Header simulation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xl font-black text-[#312e81] tracking-tight">HopeMind</span>
                <span className="text-xs text-[#e85d55] font-bold ml-2">Maternal Wellness Summary</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Prepared for: <b>{reportData.metadata.mother_name}</b> ({reportData.metadata.weeks_postpartum} weeks postpartum)
                </p>
              </div>
              <div className="text-left sm:text-right text-xs">
                <span className="font-bold text-slate-800 block">WEEKLY WELLNESS REPORT</span>
                <span className="text-slate-500 text-[11px]">Period: {reportData.metadata.period_display}</span>
              </div>
            </div>

            {/* Synthesized Wellness Summary Banner */}
            <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 text-xs space-y-1.5">
              <span className="font-bold text-indigo-950 uppercase tracking-wider text-[10px] block">
                Weekly Wellness Synthesis
              </span>
              <p className="text-slate-700 leading-relaxed">
                {reportData.wellness_summary}
              </p>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Average Mood
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#e85d55]">
                    {reportData.mood.average_score !== null ? reportData.mood.average_score.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs text-slate-400">/ 5.0</span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate">
                  {reportData.mood.state_label}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Average Sleep
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#4f46e5]">
                    {reportData.sleep.average_hours !== null ? reportData.sleep.average_hours.toFixed(1) : '—'}
                  </span>
                  <span className="text-xs text-slate-400">hrs/night</span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  {reportData.sleep.records_count} nights logged
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Energy Pattern
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-teal-700">
                    {reportData.energy.predominant_level}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Predominant state
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Active Journal Days
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-indigo-900">
                    {reportData.journal.entries_with_journal}
                  </span>
                  <span className="text-xs text-slate-400">entries</span>
                </div>
                <span className="text-[10px] text-slate-500 block truncate">
                  Confidential reflections
                </span>
              </div>
            </div>

            {/* Matplotlib / Recharts Interactive Trend Preview */}
            {hasData && chartData.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Weekly Mood & Sleep Variations
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Indigo bars: Sleep hours | Coral line: Mood score (1-5)
                  </span>
                </div>
                <div className="h-60 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="sleep" domain={[0, 12]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="mood" orientation="right" domain={[0, 5]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-2.5 rounded-xl shadow-modal border border-slate-200 text-xs space-y-1">
                                <p className="font-bold text-slate-900">{d.date}</p>
                                <p className="text-indigo-600 font-semibold">Sleep: {d.sleep} hrs</p>
                                <p className="text-[#e85d55] font-semibold">Mood Score: {d.mood} / 5</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar yAxisId="sleep" dataKey="sleep" name="Sleep Hours" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="mood" type="monotone" dataKey="mood" name="Mood Score" stroke="#e85d55" strokeWidth={2.5} dot={{ r: 4, fill: '#e85d55' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Daily Activity Log Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Daily Check-In Records
              </h4>
              {reportData.daily_records.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Mood State</th>
                        <th className="py-2.5 px-3">Score</th>
                        <th className="py-2.5 px-3">Sleep</th>
                        <th className="py-2.5 px-3">Energy</th>
                        <th className="py-2.5 px-3">Emotional Theme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {reportData.daily_records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-2 px-3 font-semibold text-slate-900">{r.day_name}, {r.date_display}</td>
                          <td className="py-2 px-3 text-slate-700">{r.mood_display}</td>
                          <td className="py-2 px-3 font-semibold text-[#e85d55]">{r.mood_score} / 5</td>
                          <td className="py-2 px-3 text-slate-700">{r.sleep_hours !== null ? `${r.sleep_hours} hrs` : '—'}</td>
                          <td className="py-2 px-3 text-slate-700">{r.energy_level}</td>
                          <td className="py-2 px-3 text-slate-600 italic">{r.dominant_emotion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No daily entries logged during this period.</p>
              )}
            </div>

            {/* EPDS Screening History Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Edinburgh Postnatal Depression Scale (EPDS) Screening
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">Standardized Assessment</span>
              </div>

              {reportData.epds.latest ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latest Screening</span>
                    <p className="text-sm font-extrabold text-navy-950">
                      Score: {reportData.epds.latest.total_score} / 30 ({reportData.epds.latest.screening_category})
                    </p>
                    <p className="text-[11px] text-slate-500">Date: {reportData.epds.latest.created_at}</p>
                    <p className="text-[11px] text-slate-600 mt-1 italic">{reportData.epds.latest.clinical_action_recommended}</p>
                  </div>

                  {reportData.epds.previous ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Previous Screening</span>
                      <p className="text-sm font-extrabold text-navy-950">
                        Score: {reportData.epds.previous.total_score} / 30 ({reportData.epds.previous.screening_category})
                      </p>
                      <p className="text-[11px] text-slate-500">Date: {reportData.epds.previous.created_at}</p>
                      <p className="text-[11px] text-slate-600 mt-1 italic">{reportData.epds.previous.clinical_action_recommended}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                      Single assessment on record
                    </div>
                  )}

                  <div className="md:col-span-2 text-[11px] text-slate-600 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
                    <b>Comparison:</b> {reportData.epds.comparison}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No EPDS screenings recorded on file yet.</p>
              )}
            </div>

            {/* Recurring Themes & Journal Privacy Safeguard */}
            <div className="p-4 rounded-2xl bg-fuchsia-50/50 border border-fuchsia-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-fuchsia-950 uppercase tracking-wider text-[10px]">
                  Recurring Self-Reported Emotional Themes
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-fuchsia-700 font-semibold">
                  <Lock className="w-3 h-3" />
                  Journal Text Private & Protected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.keys(reportData.journal.recurring_themes).length > 0 ? (
                  Object.entries(reportData.journal.recurring_themes).map(([theme, count]) => (
                    <span
                      key={theme}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-fuchsia-200 text-fuchsia-900"
                    >
                      {theme} ({count})
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic text-[11px]">No specific themes detected in this period.</span>
                )}
              </div>
            </div>

            {/* Wellness Recommendations & Crisis Helplines */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Support & Recommendations</span>
              </div>
              <ul className="space-y-1.5 text-slate-700 pt-1 text-[11px]">
                {reportData.recommendations.map((rec, i) => (
                  <li key={i} className="leading-relaxed">
                    <b>• {rec.category}:</b> {rec.detail}
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-900 font-medium space-y-0.5">
                <p><b>Tele-MANAS (Govt of India):</b> 14416 / 1800-891-4416 (24/7 Toll-Free)</p>
                <p><b>KIRAN Helpline:</b> 1800-599-0019 | Local emergency services for immediate distress.</p>
              </div>
            </div>

            {/* Mandatory Safety & Educational Disclaimer */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-500 leading-relaxed">
              <b>Educational & Research Notice:</b> This report is generated solely for personal wellness self-monitoring and educational purposes. It does NOT constitute a clinical diagnosis or medical evaluation. HopeMind does not use AI to make medical diagnoses of postpartum depression. Self-reported screening tools and check-ins indicate wellness trends to support consultations with your licensed healthcare provider.
            </div>
          </div>
        </div>
      )}

      {/* Share with Doctor Modal */}
      {showShareModal && reportData?.doctor_info && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-navy-950 text-base">Share Report with Doctor</h3>
                <p className="text-xs text-slate-500">Authorize clinician access for this reporting week</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <p className="font-semibold text-slate-800">
                Clinician: {reportData.doctor_info.name}
              </p>
              <p className="text-slate-500 text-[11px]">
                Specialization: {reportData.doctor_info.specialization}
              </p>
              <p className="text-slate-500 text-[11px]">
                Hospital/Affiliation: {reportData.doctor_info.hospital}
              </p>
              <p className="text-indigo-600 font-semibold text-[11px] pt-1">
                Period: {reportData.metadata.period_display}
              </p>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={shareAuthorized}
                onChange={(e) => setShareAuthorized(e.target.checked)}
                className="mt-0.5 rounded text-[#5b4bdb] focus:ring-[#5b4bdb]"
              />
              <span>
                I explicitly authorize sharing my Weekly Wellness Report with my assigned doctor. I understand this action will be recorded in the security audit trail.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowShareModal(false);
                  setShareAuthorized(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmShare}
                disabled={!shareAuthorized || sharing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5b4bdb] hover:bg-[#4938b9] text-white text-xs font-bold shadow-md shadow-indigo-100 transition disabled:opacity-50"
              >
                {sharing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sharing...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Authorize & Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
