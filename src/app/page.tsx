'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Play,
  FileText,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Demo Exam Start state
  const [demoNickname, setDemoNickname] = useState('Shristy');
  const [startingDemo, setStartingDemo] = useState(false);
  const [demoError, setDemoError] = useState('');

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

  const handleStartDemoExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoError('');
    setStartingDemo(true);
    try {
      const res = await fetch('/api/attempt/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: demoNickname.trim() || 'Practice Student' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start demo exam');
      }
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      }
    } catch (err: any) {
      setDemoError(err.message || 'Error launching demo test');
      setStartingDemo(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-amber-400 flex items-center justify-center font-bold text-lg shadow-sm">
              EX
            </div>
            <div>
              <span className="font-bold text-base md:text-lg tracking-tight block text-slate-900 dark:text-white">
                College Exam & Diagnostic Assessment Platform
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 block -mt-1">
                Dynamic Question Papers • Instant Practice Tests • CBT Evaluation
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center space-x-1"
            >
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin / Mentor</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-10 md:py-14 w-full">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-emerald-200 dark:border-emerald-800/50">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Versatile Examination Platform</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
            Assess Knowledge. Track Stamina. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-600 to-emerald-600">
              Prepare for College Exams with Confidence.
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Take regular practice exams across Multiple Choice Questions (MCQs), Short Explanations, and Long Case Study Essays with real-time server timing and instant autosave.
          </p>
        </div>

        {/* Dual Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-14">
          {/* Card 1: Instant Demo Exam for Students */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/10 dark:bg-slate-900 rounded-3xl p-6 md:p-8 border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-xl flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Instant Student Demo Test</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Forensic Science & Medico-Legal Exam
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                Try a full 50-mark practice paper right now. Includes 10 Forensic MCQs (1m each), 4 Short Answer Questions (4m each), and 2 Comprehensive Long Analysis Essays (12m each).
              </p>

              {demoError && (
                <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs mb-4">
                  {demoError}
                </div>
              )}

              <form onSubmit={handleStartDemoExam} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Student Name / Nickname:
                  </label>
                  <input
                    type="text"
                    required
                    value={demoNickname}
                    onChange={(e) => setDemoNickname(e.target.value)}
                    placeholder="Enter your name (e.g. Shristy)"
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={startingDemo}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-lg shadow-emerald-700/20 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{startingDemo ? 'Launching Demo Exam...' : 'Start Demo Exam Now'}</span>
                </button>
              </form>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>⏱️ 50-minute planned timer</span>
              <span>•</span>
              <span>📝 16 Questions</span>
              <span>•</span>
              <span>🎯 Auto-saved</span>
            </div>
          </div>

          {/* Card 2: Private Mentor-Assigned Exam */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
                <Compass className="w-3.5 h-3.5" />
                <span>Mentor-Assigned Exam</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Enter Private Assessment Token
              </h2>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
                If your mentor uploaded a specific exam paper and shared a private link or 32-character token with you, paste it below to begin or resume.
              </p>

              {tokenError && (
                <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs mb-4">
                  {tokenError}
                </div>
              )}

              <form onSubmit={handleGoToAssessment} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Exam Link or Access Token:
                  </label>
                  <input
                    type="text"
                    placeholder="Paste private token (e.g. 7f8a9e...)"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      setTokenError('');
                    }}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-900/20 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
                >
                  <span>Open Assigned Exam</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>🔒 Optional PIN protection</span>
              <span>•</span>
              <span>Resume anytime</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 dark:border-slate-800 max-w-5xl mx-auto">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Versatile Question Types
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Seamlessly supports fast forensic MCQs, short conceptual explanations, and extensive essay case analyses with target word count tracking.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Intelligent Time Planning
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Exams adapt automatically to uploaded JSON papers, giving 1-2 minutes for MCQs and proportional time for short and long answers.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Zero Stress, High Insight
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Take repeat practice papers to identify weak areas, improve question pacing, and ensure peak readiness for college exams.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
