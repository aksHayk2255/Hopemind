import React, { useState, useEffect } from 'react';
import { Phone, AlertTriangle, Heart, Shield, X, Sparkles, Wind } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  crisisMessage?: string;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, crisisMessage }) => {
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathTimer, setBreathTimer] = useState<number>(4);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setBreathTimer((prev) => {
        if (prev <= 1) {
          setBreathPhase((current) => {
            if (current === 'Inhale') return 'Hold';
            if (current === 'Hold') return 'Exhale';
            return 'Inhale';
          });
          return breathPhase === 'Hold' ? 6 : 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, breathPhase]);

  if (!isOpen) return null;

  const helplines = [
    {
      name: 'Tele-MANAS (Ministry of Health, India)',
      number: '14416',
      altNumber: '1800-891-4416',
      badge: '24/7 Toll-Free • Multi-language',
      description: 'Government 24x7 tele-mental health assistance with clinical psychiatrists and psychologists.',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      btnColor: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    },
    {
      name: 'KIRAN Mental Health Helpline',
      number: '1800-599-0019',
      badge: '24/7 Free Support',
      description: 'National helpline providing psychological first-aid, crisis intervention and referral.',
      color: 'bg-blue-50 border-blue-200 text-blue-900',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    {
      name: 'Vandrevala Foundation Helpline',
      number: '+919999666555',
      displayNumber: '+91 9999 666 555',
      badge: '24/7 Call & WhatsApp',
      description: 'Free experienced counselor support for overwhelming anxiety, depression, and distress.',
      color: 'bg-purple-50 border-purple-200 text-purple-900',
      btnColor: 'bg-purple-600 hover:bg-purple-700 text-white'
    },
    {
      name: 'Postpartum Support International (PSI)',
      number: '1-800-944-4773',
      badge: 'Global Perinatal Specialists',
      description: 'Dedicated maternal and perinatal distress support line and resource network.',
      color: 'bg-rose-50 border-rose-200 text-rose-900',
      btnColor: 'bg-rose-600 hover:bg-rose-700 text-white'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-modal border border-rose-100 overflow-hidden">
        {/* Urgent Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-purple-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="Close emergency modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-rose-700 uppercase tracking-wider mb-1">
                Immediate Supportive Care
              </span>
              <h2 className="text-2xl font-bold">You are not alone. Help is here right now.</h2>
            </div>
          </div>
          <p className="text-rose-100 text-sm mt-1">
            {crisisMessage || 'Postpartum emotions can feel intensely heavy, exhausting, or frightening. Please reach out to these compassionate, free, and confidential crisis professionals.'}
          </p>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Dial Helplines */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-rose-500" />
              Verified 24/7 Crisis Helplines (Confidential & Free)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {helplines.map((line, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border ${line.color} flex flex-col justify-between transition-all hover:shadow-md`}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white shadow-xs">
                        {line.badge}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">{line.name}</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{line.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="font-bold text-sm tracking-wide text-slate-800">
                      {line.displayNumber || line.number}
                    </span>
                    <a
                      href={`tel:${line.number}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium ${line.btnColor} shadow-xs transition-transform active:scale-95`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      Call Now
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calming Breathing Exercise Widget */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-lavender-50 to-teal-50 border border-lavender-200/80 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <div
                className={`absolute inset-0 rounded-full bg-lavender-400/20 transition-all duration-1000 ${
                  breathPhase === 'Inhale'
                    ? 'scale-110 bg-lavender-400/40'
                    : breathPhase === 'Hold'
                    ? 'scale-110 bg-teal-400/40'
                    : 'scale-90 bg-lavender-300/20'
                }`}
              />
              <div className="relative z-10 text-center">
                <Wind className="w-5 h-5 mx-auto text-lavender-700 animate-pulse" />
                <span className="text-xs font-bold text-lavender-900 block mt-0.5">{breathPhase}</span>
                <span className="text-sm font-extrabold text-lavender-700">{breathTimer}s</span>
              </div>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-1 text-lavender-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Gentle 4-4-6 Resonant Breathing
              </div>
              <h4 className="text-sm font-semibold text-slate-900">Take a slow, gentle breath with us</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Slow down. You are safe in this moment. Place one hand over your chest, breathe in through your nose for 4 seconds, hold gently, and slowly release through your mouth.
              </p>
            </div>
          </div>

          {/* Safety Reminder */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Life-Threatening Emergency?</p>
              <p className="text-amber-800 mt-0.5">
                If you or your infant are in immediate physical danger or need urgent medical attention, please call <strong>112</strong> (India Emergency Services) or your local hospital emergency room immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            HopeMind Care Team is with you
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            I Feel Safer / Close
          </button>
        </div>
      </div>
    </div>
  );
};
