import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Heart,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Info,
  Clock,
  Printer
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { assessmentService } from '../../services/assessmentService';
import { AssessmentRecord } from '../../types';

export const AssessmentHistory: React.FC = () => {
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await assessmentService.getHistory();
        if (res?.assessments) {
          setAssessments(res.assessments);
          if (res.assessments.length > 0) {
            setSelectedAssessment(res.assessments[0]);
          }
        }
      } catch (e) {
        console.error('Error fetching assessment history:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  // Format chart data (chronological order)
  const chartData = [...assessments]
    .reverse()
    .map((a) => ({
      date: new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      score: a.total_score,
      category: a.risk_category
    }));

  const getBadge = (category: string) => {
    switch (category) {
      case 'high':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'moderate':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <Heart className="w-8 h-8 text-lavender-500 animate-pulse mx-auto mb-2" />
        <p className="text-sm text-slate-500">Loading screening timeline...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-950">
            EPDS Screening Longitudinal History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track how your emotional well-being evolves across your postpartum journey
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/mother/assessment"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-lavender-600 hover:bg-lavender-700 text-white shadow-soft transition-colors"
          >
            Take New Screening
          </Link>
          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
            title="Print Clinical Summary"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Trajectory Chart Card */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Score Trajectory Timeline
              </h2>
              <p className="text-xs text-slate-500">
                Score ranges: 0–9 (Low Risk), 10–12 (Moderate Distress), 13+ (Clinical Review Recommended)
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-lavender-600 inline-block" />
                <span>EPDS Score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-rose-400 inline-block" />
                <span className="text-rose-600">Threshold (13)</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 30]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 rounded-xl shadow-modal border border-slate-200 text-xs space-y-1">
                          <p className="font-bold text-slate-900">{data.date}</p>
                          <p className="text-lavender-700 font-semibold">EPDS Score: {data.score} / 30</p>
                          <p className="text-slate-500 capitalize">Category: {data.category}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={13} stroke="#e85d55" strokeDasharray="4 4" />
                <ReferenceLine y={10} stroke="#d97706" strokeDasharray="4 4" />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#5b4bdb"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#5b4bdb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* History Grid & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assessment List */}
        <div className="lg:col-span-1 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-soft space-y-2 max-h-[500px] overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
            Recorded Screenings ({assessments.length})
          </h3>

          {assessments.length === 0 ? (
            <p className="text-xs text-slate-400 p-4 text-center">No assessments on record yet.</p>
          ) : (
            assessments.map((a) => {
              const isSelected = selectedAssessment?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssessment(a)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-lavender-500 bg-lavender-50/70 shadow-xs ring-1 ring-lavender-300'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        Score: {a.total_score}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${getBadge(a.risk_category)}`}>
                        {a.risk_category}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block">
                      {new Date(a.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {a.q10_positive && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-200" title="Item 10 Flagged" />
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Assessment Detail Card */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft space-y-6">
          {selectedAssessment ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-semibold text-slate-400">
                    Screening from {new Date(selectedAssessment.created_at).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-extrabold text-navy-950">
                      Score: {selectedAssessment.total_score} / 30
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${getBadge(selectedAssessment.risk_category)}`}>
                      {selectedAssessment.risk_category} Risk
                    </span>
                  </div>
                </div>

                {selectedAssessment.q10_positive && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Question 10 Endorsed
                  </div>
                )}
              </div>

              {/* Clinical Guidance Text */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700">Clinical Recommendation:</span>
                <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                  {selectedAssessment.clinical_recommendation}
                </p>
              </div>

              {/* ML Risk Probability */}
              {selectedAssessment.ml_prediction && (
                <div className="p-4 rounded-2xl bg-lavender-50/60 border border-lavender-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lavender-900">Machine Learning Assessment:</span>
                    <span className="font-extrabold text-lavender-700">
                      {Math.round((selectedAssessment.ml_prediction.predicted_risk_score || 0) * 100)}% Risk
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {selectedAssessment.ml_prediction.clinical_guidance}
                  </p>
                </div>
              )}

              {/* Item Breakdown if available */}
              {selectedAssessment.responses && selectedAssessment.responses.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-slate-700">Question Item Breakdown:</span>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {selectedAssessment.responses.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                          item.question_index === 9 && item.score > 0
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-white border-slate-100'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-800 text-[11px] line-clamp-1">
                            Q{idx + 1}: {item.question_text}
                          </p>
                          <p className="text-[10px] text-slate-500 italic">
                            Answer: {item.selected_option_text}
                          </p>
                        </div>
                        <span className="font-bold text-xs px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                          {item.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Select a screening from the list to view its complete clinical summary.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
