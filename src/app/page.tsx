'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Clock,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  BookOpen,
  Coffee,
  Brain,
  UserCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');

  const handleGoToAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTokenError('Please enter a valid private assessment token or URL');
      return;
    }
    // If user pasted a full URL
    if (trimmed.includes('/take/')) {
      const parts = trimmed.split('/take/');
      const token = parts[1]?.split('?')[0]?.split('#')[0];
      if (token) {
        router.push(`/take/${token}`);
        return;
      }
    }
    router.push(`/take/${trimmed}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 flex items-center justify-center font-bold text-lg shadow-sm">
              RBI
            </div>
            <div>
              <span className="font-bold text-base md:text-lg tracking-tight block text-slate-900 dark:text-white">
                Grade B Baseline Diagnostic
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block -mt-1">
                Aspirant Assessment & 1-Year Study Roadmap Platform
              </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 md:py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-amber-200 dark:border-amber-800/50">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Comprehensive Diagnostic Evaluation</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
            Know Your Baseline. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-amber-600">
              Build Your 1-Year RBI Grade B Roadmap.
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            A single, comprehensive 4h10 diagnostic designed to understand your natural problem-solving instincts,
            reasoning stamina, conceptual gaps, and learning profile before crafting your tailored study strategy.
          </p>
        </div>

        {/* Access Token Box */}
        <div className="max-w-xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none mb-14">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center space-x-2">
            <Compass className="w-5 h-5 text-blue-600" />
            <span>Enter Your Assessment Token</span>
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mb-5">
            If your mentor has invited you, paste your private token or direct link below to start or resume right where you left off.
          </p>

          <form onSubmit={handleGoToAssessment} className="space-y-4">
            <div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste your link or token (e.g. 7f8a9e...)"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setTokenError('');
                  }}
                  className="w-full pl-4 pr-12 py-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              {tokenError && <p className="text-xs text-rose-500 mt-1.5">{tokenError}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-blue-800 to-indigo-900 hover:from-blue-700 hover:to-indigo-800 text-white shadow-md shadow-blue-900/20 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
            >
              <span>Access Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Server-authoritative timer</span>
            <span>•</span>
            <span>Autosaved progress</span>
            <span>•</span>
            <span>Resume anytime</span>
          </div>
        </div>

        {/* Assessment Flow & Parts */}
        <div className="mb-14">
          <h2 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">
            Exam Architecture & Timing Flow
          </h2>
          <p className="text-sm text-center text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8">
            Designed to test cognitive depth and mental endurance in a supportive, zero-penalty environment.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-sm">
                  A
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  10 min
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Onboarding & Consent
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Setup workspace, self-ratings in 7 core areas, device check, and diagnostic agreements in conversational Chat Mode.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-sm">
                  B
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  95 min
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Phase 1 MCQs (Exam Mode)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sections B1 (Quant: 28m), B2 (Reasoning: 27m), B3 (English: 20m), B4 (GA: 20m). +1 / −0.25 marking with confidence tags.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-sm">
                  ☕
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  10 min
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Scheduled Break 1
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Rest, drink water, and relax eyes. Option to resume early whenever ready.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-sm">
                  C
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  90 min
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Phase 2 Style Papers
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                C1 ESI Objective (15m), C2 ESI Descriptive (25m), C3 FM MCQs & Short Answer (25m), C4 English Essay & Précis (25m).
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-sm">
                  D
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  20 min
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Thinking & Judgement
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reflection on earlier questions (D01), error spotting, estimations, situational ethics, and optional 90s voice note.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-sm">
                  E
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  20 min
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                Personal Profile & Habits
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comprehensive 10-dimension background, study schedule, daily habits, motivation, and mindset Likert scale.
              </p>
            </div>
          </div>
        </div>

        {/* Key Diagnostic Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Diagnostic, Not Pass/Fail
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                No scores or answer keys are revealed at the end. Your mentor evaluates your cognitive calibration and pacing to guide your journey.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                20-Minute Pooled Buffer
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                If a timed section runs out, spend from your pooled 20-minute buffer to complete questions, or proceed immediately.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Offline-Safe & Auto-Synced
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Every answer autosaves with idempotent requests and retry queues. If network drops, progress is safely queued locally.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center">
          <span>RBI Grade B Baseline Assessment • Confidential Diagnostic Platform</span>
        </div>
      </footer>
    </div>
  );
}
