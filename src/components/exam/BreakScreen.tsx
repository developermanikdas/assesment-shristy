'use client';

import React from 'react';
import { Coffee, ArrowRight, Clock, Sparkles } from 'lucide-react';
import { translations, Language } from '@/lib/i18n';

interface BreakScreenProps {
  breakTitle: string;
  timeRemainingSeconds: number;
  language: Language;
  onResumeEarly: () => void;
}

export const BreakScreen: React.FC<BreakScreenProps> = ({
  breakTitle,
  timeRemainingSeconds,
  language,
  onResumeEarly,
}) => {
  const t = translations[language];

  const formatTime = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Coffee className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
          {breakTitle || t.breakTitle}
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
          {t.breakDesc} You have completed a major milestone of the diagnostic. Take this time to recharge your mental stamina.
        </p>

        {/* Big Countdown */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-1">
            {t.breakRemaining}
          </span>
          <span className="text-4xl font-mono font-black text-amber-600 dark:text-amber-400">
            {formatTime(timeRemainingSeconds)}
          </span>
        </div>

        {/* Resume Early Button */}
        <button
          onClick={onResumeEarly}
          className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
        >
          <span>{t.resumeEarly}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
