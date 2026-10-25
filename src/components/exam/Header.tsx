'use client';

import React from 'react';
import {
  Clock,
  FileEdit,
  Globe,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { translations, Language } from '@/lib/i18n';

interface HeaderProps {
  nickname: string;
  sectionTitle: string;
  partId: string;
  sectionId: string;
  timeRemainingSeconds: number;
  totalDurationSeconds: number;
  isTimed: boolean;
  isSoftTimer: boolean;
  isBreak: boolean;
  isBufferActive: boolean;
  bufferAvailableSeconds: number;
  language: Language;
  onLanguageToggle: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
  onOpenNotepad: () => void;
  hasNotepadContent: boolean;
  saveStatus: 'saved' | 'saving' | 'offline';
  onStopBuffer?: () => void;
}

export const ExamHeader: React.FC<HeaderProps> = ({
  nickname,
  sectionTitle,
  partId,
  sectionId,
  timeRemainingSeconds,
  totalDurationSeconds,
  isTimed,
  isSoftTimer,
  isBreak,
  isBufferActive,
  bufferAvailableSeconds,
  language,
  onLanguageToggle,
  isDark,
  onThemeToggle,
  onOpenNotepad,
  hasNotepadContent,
  saveStatus,
  onStopBuffer,
}) => {
  const t = translations[language];

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarningTime = isTimed && timeRemainingSeconds <= 300 && !isBufferActive; // under 5 min
  const isCriticalTime = isTimed && timeRemainingSeconds <= 60 && !isBufferActive; // under 1 min

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 md:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Candidate info & Section title */}
        <div className="flex items-center space-x-2 md:space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-blue-900 text-amber-400 font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm">
            {partId}
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs md:text-sm text-slate-900 dark:text-white truncate">
                {sectionTitle}
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {sectionId}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
              Aspirant: <strong className="text-slate-700 dark:text-slate-300 font-medium">{nickname}</strong>
            </span>
          </div>
        </div>

        {/* Center: Server-Authoritative Timer & Buffer Badge */}
        <div className="flex items-center space-x-2">
          {isTimed || isSoftTimer ? (
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border font-mono transition-all ${
                isBufferActive
                  ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-400 animate-pulse'
                  : isCriticalTime
                  ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse'
                  : isWarningTime
                  ? 'bg-amber-500/10 border-amber-400 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm md:text-base font-bold tracking-tight">
                  {formatTime(timeRemainingSeconds)}
                </span>
                <span className="text-[9px] font-sans font-medium uppercase tracking-wider -mt-1 opacity-75">
                  {isBufferActive
                    ? 'Buffer Active'
                    : isSoftTimer
                    ? 'Soft Timer'
                    : isBreak
                    ? 'Break Remaining'
                    : t.timeRemaining}
                </span>
              </div>
            </div>
          ) : null}

          {/* Buffer stop button if buffer active */}
          {isBufferActive && onStopBuffer && (
            <button
              onClick={onStopBuffer}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium px-2.5 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              {t.stopBuffer}
            </button>
          )}

          {/* Pooled Buffer Indicator for Timed Sections */}
          {isTimed && !isBreak && !isBufferActive && bufferAvailableSeconds > 0 && (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-[11px] text-indigo-700 dark:text-indigo-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>
                Buffer: <strong>{Math.floor(bufferAvailableSeconds / 60)}m</strong>
              </span>
            </div>
          )}
        </div>

        {/* Right: Rough Sheet, Language, Theme, and Save Indicator */}
        <div className="flex items-center space-x-1.5 md:space-x-2">
          {/* Rough work notepad (especially crucial for Quant without calculator) */}
          <button
            onClick={onOpenNotepad}
            title={t.notepadTitle}
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border flex items-center space-x-1.5 transition-colors ${
              hasNotepadContent
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Notepad</span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={onLanguageToggle}
            title="Toggle English / हिन्दी"
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center space-x-1"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{language === 'en' ? 'हिन्दी' : 'EN'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onThemeToggle}
            title="Toggle Dark / Light Mode"
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Autosave Status Indicator */}
          <div className="hidden sm:flex items-center space-x-1 pl-1 text-[11px] font-medium text-slate-500">
            {saveStatus === 'saved' && (
              <span className="flex items-center text-emerald-600 dark:text-emerald-400 space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t.saved}</span>
              </span>
            )}
            {saveStatus === 'saving' && (
              <span className="flex items-center text-amber-500 space-x-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden md:inline">{t.saving}</span>
              </span>
            )}
            {saveStatus === 'offline' && (
              <span className="flex items-center text-rose-500 space-x-1" title={t.offlineSaved}>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Offline</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
