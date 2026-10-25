import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
  Cpu
} from 'lucide-react';
import { assessmentService, AssessmentSubmitResponse } from '../../services/assessmentService';
import { EPDSQuestion } from '../../types';

interface AssessmentFormProps {
  onOpenEmergency: () => void;
}

export const AssessmentForm: React.FC<AssessmentFormProps> = ({ onOpenEmergency }) => {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<EPDSQuestion[]>([]);
  const [instructions, setInstructions] = useState<string>('');
  const [disclaimer, setDisclaimer] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [answers, setAnswers] = useState<number[]>(new Array(10).fill(-1));
  const [startTime] = useState<number>(Date.now());
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<AssessmentSubmitResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const data = await assessmentService.getQuestions();
        setQuestions(data.questions);
        setInstructions(data.instructions);
        setDisclaimer(data.disclaimer);
      } catch (err: any) {
        setError('Failed to load questionnaire. Please ensure backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    const updated = [...answers];
    updated[questionIdx] = optionIdx;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (answers[currentStep] === -1) {
      setError('Please select an option to continue.');
      return;
    }
    setError('');
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setError('');
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate all 10 answered
    const unanswered = answers.findIndex((a) => a === -1);
    if (unanswered !== -1) {
      setCurrentStep(unanswered);
      setError(`Please complete Question ${unanswered + 1} before submitting.`);
      return;
    }

    setSubmitting(true);
    setError('');

    const elapsedSeconds = Math.max(15, Math.round((Date.now() - startTime) / 1000));

    try {
      const res = await assessmentService.submitAssessment(answers, elapsedSeconds);
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Heart className="w-10 h-10 text-lavender-500 animate-pulse mx-auto mb-3" />
        <p className="text-sm text-slate-600 font-medium">Preparing EPDS questionnaire...</p>
      </div>
    );
  }

  // Result View
  if (result) {
    const isHigh = result.screening_category === 'high' || result.question_10_flag;
    const isModerate = result.screening_category === 'moderate';

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fadeIn">
        {/* Outcome Header Banner */}
        <div
          className={`p-6 sm:p-8 rounded-3xl text-white shadow-card ${
            isHigh
              ? 'bg-gradient-to-br from-rose-600 via-rose-500 to-purple-600'
              : isModerate
              ? 'bg-gradient-to-br from-amber-600 via-amber-500 to-teal-600'
              : 'bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-600'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
              Screening Results Ready
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            EPDS Total Score: {result.total_score} / 30
          </h1>
          <p className="mt-1 text-sm text-white/90 font-medium capitalize">
            Clinical Category: <strong>{result.screening_category} Risk</strong>
          </p>
        </div>

        {/* Question 10 Critical Flag Banner */}
        {result.question_10_flag && (
          <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  Item 10 Response — Immediate Supportive Attention
                </h3>
                <p className="text-xs text-rose-800 leading-relaxed mt-1">
                  You indicated thoughts of self-harm or deep distress on Question 10. You do not have to carry this alone. Please reach out right away to the free, compassionate crisis teams below.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={onOpenEmergency}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
              >
                Access 24/7 Crisis Helplines Now
              </button>
            </div>
          </div>
        )}

        {/* Clinical Guidance Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-soft space-y-6">
          <div>
            <h3 className="text-base font-bold text-navy-950 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-lavender-600" />
              Clinical Guidance & Recommendation
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {result.clinical_recommendation}
            </p>
          </div>

          {/* Machine Learning Decision Support Card */}
          {result.ml_prediction && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-lavender-50 to-teal-50 border border-lavender-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-lavender-700" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Machine Learning Risk Estimate
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white text-lavender-900 border border-lavender-200">
                  {Math.round((result.ml_prediction.predicted_risk_score || 0) * 100)}% Probability
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {result.ml_prediction.clinical_guidance}
              </p>

              {result.ml_prediction.top_features && result.ml_prediction.top_features.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-lavender-200/60">
                  <span className="text-[11px] font-bold text-slate-700">Top Contributing Clinical Factors:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {result.ml_prediction.top_features.map((feat: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs">
                        <span className="font-semibold text-slate-800 capitalize block">
                          {feat.feature.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-500">{feat.clinical_relevance}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-500 italic">
                * Note: Machine learning estimate is for research & decision support only and does not replace medical diagnosis.
              </p>
            </div>
          )}

          {/* Action Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <Link
              to="/mother"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 text-center transition-colors"
            >
              Back to Dashboard
            </Link>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                to="/mother/history"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold border border-lavender-300 text-lavender-800 hover:bg-lavender-50 text-center transition-colors"
              >
                View History
              </Link>
              <Link
                to="/mother/chat"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-lavender-600 hover:bg-lavender-700 text-white text-center shadow-soft transition-colors"
              >
                Talk with HopeBot
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step-by-Step Question Questionnaire View
  const currentQ = questions[currentStep];
  const progressPercent = Math.round(((currentStep + 1) / questions.length) * 100);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fadeIn">
      {/* Questionnaire Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-lavender-800 uppercase tracking-wider flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            Edinburgh Postnatal Depression Scale (EPDS)
          </span>
          <span className="text-xs font-extrabold text-navy-950">
            Question {currentStep + 1} of {questions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#5b4bdb] to-[#e85d55] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          {error}
        </div>
      )}

      {/* Active Question Card */}
      {currentQ && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-card space-y-6">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400">In the past 7 days:</span>
            <h2 className="text-lg sm:text-xl font-bold text-navy-950 leading-snug">
              {currentQ.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((opt) => {
              const isSelected = answers[currentStep] === opt.index;
              return (
                <button
                  key={opt.index}
                  type="button"
                  onClick={() => handleSelectOption(currentStep, opt.index)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-[#5b4bdb] bg-[#e9e5ff] text-[#382b91] ring-2 ring-[#b9b0ff] shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-medium pr-3">{opt.text}</span>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'border-lavender-600 bg-lavender-600' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            {currentStep < questions.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-[#5b4bdb] hover:bg-[#4938b9] text-white text-xs font-semibold shadow-lg transition-colors flex items-center gap-1"
              >
                Next Question
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-[#c94743] hover:bg-[#a93638] text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {submitting ? 'Calculating Score...' : 'Submit Assessment'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reassurance Disclaimer */}
      <div className="p-4 rounded-2xl bg-warm-100/60 border border-warm-200/80 text-[11px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Gentle Reminder:</p>
        <p>
          {instructions || 'Please answer how you felt in the past 7 days, not only today. There are no right or wrong answers.'}
        </p>
      </div>
    </div>
  );
};
