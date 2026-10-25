import React from 'react';
import { Heart, Shield, Phone, Sparkles } from 'lucide-react';

interface FooterProps {
  onOpenEmergency: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenEmergency }) => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Emergency Strip */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-lavender-50 via-teal-50 to-rose-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 text-rose-500">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Feeling distressed or needing someone to talk to?</p>
              <p className="text-[11px] text-slate-600">
                Call Tele-MANAS (14416) or KIRAN (1800-599-0019) 24 hours a day, 7 days a week. Free & Confidential.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenEmergency}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors shrink-0"
          >
            Open Crisis Helplines
          </button>
        </div>

        {/* Disclaimer & Information */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
            <span className="font-semibold text-slate-700">HopeMind Perinatal Platform</span>
            <span>•</span>
            <span>AI-Assisted Postpartum Health & Decision Support</span>
          </div>

          <div className="text-center md:text-right text-[11px] text-slate-400 max-w-xl">
            <strong>Clinical Disclaimer:</strong> The EPDS is an evidence-based screening instrument, not a psychiatric diagnosis. Machine learning predictions are for academic decision support only and must never substitute for licensed healthcare provider judgment.
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          © 2026 HopeMind. Built for Academic Research & Demonstration.
        </div>
      </div>
    </footer>
  );
};
