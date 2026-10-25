'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Award, CheckCircle2, Trash2, Home, HeartHandshake } from 'lucide-react';
import { translations, Language } from '@/lib/i18n';

interface FinishScreenProps {
  nickname: string;
  token: string;
  language: Language;
}

export const FinishScreen: React.FC<FinishScreenProps> = ({
  nickname,
  token,
  language,
}) => {
  const t = translations[language];
  const [deleteRequested, setDeleteRequested] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRequest = async () => {
    if (confirm('Are you sure you want to request data deletion? Your mentor will be notified.')) {
      setIsDeleting(true);
      try {
        const res = await fetch(`/api/attempt/${token}/delete-request`, {
          method: 'POST',
        });
        if (res.ok) {
          setDeleteRequested(true);
        }
      } catch (err) {
        console.error('Delete request failed:', err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 text-center shadow-2xl">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-sm">
          <HeartHandshake className="w-10 h-10" />
        </div>

        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
          {t.completionTitle}
        </h2>

        <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          Congratulations, <strong>{nickname}</strong>! You have successfully completed the diagnostic baseline assessment.
        </p>

        <div className="bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-5 mb-8 text-left text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          <p className="mb-2">
            {t.completionDesc}
          </p>
          <p className="text-slate-500 text-xs">
            Remember: This assessment is purely a baseline diagnostic. There is no pass or fail mark. Your mentor will review your approach, stamina curves, and writing to design an optimal, personalized path forward.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center space-x-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>

          {!deleteRequested ? (
            <button
              onClick={handleDeleteRequest}
              disabled={isDeleting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.deleteRequest}</span>
            </button>
          ) : (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.deleteRequestSuccess}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
