'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Clock,
  RotateCcw,
  Unlock,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  Volume2,
  FileText,
  BarChart2,
  Brain,
  ShieldAlert,
  User,
  Sparkles,
  Award,
} from 'lucide-react';

export default function AttemptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sections' | 'subjective' | 'profile' | 'integrity'>('overview');

  // Action states
  const [extendMinutes, setExtendMinutes] = useState(10);
  const [selectedSectionToExtend, setSelectedSectionToExtend] = useState('B1');
  const [selectedSectionToReopen, setSelectedSectionToReopen] = useState('B1');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  const fetchAttemptDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/attempts/${id}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch attempt dossier');
      }
      setData(json);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error loading candidate dossier');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchAttemptDetail();
  }, [fetchAttemptDetail]);

  const handleExtendTime = async () => {
    try {
      setActionSuccessMsg('');
      setActionErrorMsg('');
      const res = await fetch(`/api/admin/attempts/${id}/extend-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionId: selectedSectionToExtend,
          additionalMinutes: Number(extendMinutes),
        }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to extend time');

      setActionSuccessMsg(`Extended section ${selectedSectionToExtend} by ${extendMinutes} minutes.`);
      fetchAttemptDetail();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to extend time');
    }
  };

  const handleReopenSection = async () => {
    if (!confirm(`Reopen locked section ${selectedSectionToReopen}? The student will be able to re-enter this section.`)) return;
    try {
      setActionSuccessMsg('');
      setActionErrorMsg('');
      const res = await fetch(`/api/admin/attempts/${id}/reopen-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: selectedSectionToReopen }),
      });
      const resJson = await res.json();
      if (!res.ok) throw new Error(resJson.error || 'Failed to reopen section');

      setActionSuccessMsg(`Reopened section ${selectedSectionToReopen}.`);
      fetchAttemptDetail();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to reopen section');
    }
  };

  const handleResetAttempt = async () => {
    if (!confirm('RESET ATTEMPT: Are you sure you want to clear all responses and timers for this attempt? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/admin/attempts/${id}/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      setActionSuccessMsg('Attempt reset to not_started.');
      fetchAttemptDetail();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to reset attempt');
    }
  };

  const handleDeleteAttempt = async () => {
    if (!confirm('DANGER: Permanently delete this candidate attempt and all recorded responses? This is a hard delete.')) return;
    if (!confirm('Please confirm one more time: Hard delete all data for this attempt?')) return;
    try {
      const res = await fetch(`/api/admin/attempts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      router.push('/admin');
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to delete attempt');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
        Compiling candidate analytics and diagnostic profile...
      </div>
    );
  }

  if (!data || !data.attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-rose-400 text-xs">
        Dossier not found or error loading data.
      </div>
    );
  }

  const {
    attempt,
    mcqAnalytics,
    staminaCurve,
    selfRatingCorrelation,
    profileSections,
    subjectiveAnswers,
    perQuestionRows,
    eventLogs,
  } = data;

  const sectionScores = mcqAnalytics?.sectionScores || {};
  const overallMCQ = mcqAnalytics?.overallMCQ;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-white">
                  {attempt.nickname}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    attempt.status === 'completed'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                      : attempt.status === 'in_progress'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {attempt.status.replace('_', ' ')}
                </span>
              </div>
              <span className="text-xs text-slate-400 block font-mono">
                Token: {attempt.token}
              </span>
            </div>
          </div>

          {/* Export Downloads */}
          <div className="flex items-center space-x-2">
            <a
              href={`/api/admin/attempts/${id}/export?format=json`}
              download
              className="py-1.5 px-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export JSON Bundle</span>
            </a>

            <a
              href={`/api/admin/attempts/${id}/export?format=csv`}
              download
              className="py-1.5 px-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export Flat CSV</span>
            </a>
          </div>
        </div>
      </header>

      {/* Messages */}
      {actionSuccessMsg && (
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 mt-4">
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        </div>
      )}
      {actionErrorMsg && (
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 mt-4">
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex space-x-6 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Diagnostic Overview
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === 'sections'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            MCQ Scorecards ({Object.keys(sectionScores).length})
          </button>
          <button
            onClick={() => setActiveTab('subjective')}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === 'subjective'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Writing & Thinking Answers ({subjectiveAnswers?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Personal Profile & Habits (Part E)
          </button>
          <button
            onClick={() => setActiveTab('integrity')}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === 'integrity'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Activity Logs ({eventLogs?.length || 0})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Quick Stats Grid */}
            {overallMCQ && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Attempt Rate
                  </span>
                  <span className="text-2xl font-black text-white font-mono">
                    {overallMCQ.attemptRate}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {overallMCQ.attempted}/{overallMCQ.totalQuestions}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Accuracy
                  </span>
                  <span className="text-2xl font-black text-blue-400 font-mono">
                    {overallMCQ.accuracy}%
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {overallMCQ.correct} correct
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Net Score
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {overallMCQ.netScore}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    +1 / −0.25 rule
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Buffer Used
                  </span>
                  <span className="text-2xl font-black text-indigo-400 font-mono">
                    {Math.round(((attempt.pooledBufferUsedSeconds || 0) / 60) * 10) / 10}m
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    of 20 min pool
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Avg Speed (Correct)
                  </span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">
                    {overallMCQ.avgTimeCorrectSeconds}s
                  </span>
                  <span className="text-[10px] text-slate-500 block">per question</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Avg Speed (Wrong)
                  </span>
                  <span className="text-xl font-bold text-rose-400 font-mono">
                    {overallMCQ.avgTimeWrongSeconds}s
                  </span>
                  <span className="text-[10px] text-slate-500 block">per question</span>
                </div>
              </div>
            )}

            {/* Topic Heat Map (Green, Amber, Red Bands) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-blue-400" />
                <span>Topic Mastery Breakdown (Color Bands)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Green: &ge; 70% accuracy (mastered) • Amber: 45%–70% (needs targeted drill) • Red: &lt; 45% (conceptual gap)
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {mcqAnalytics?.topicBreakdown?.map((item: any) => {
                  let bandColor = 'bg-rose-950/60 text-rose-400 border-rose-800/60';
                  if (item.band === 'green') bandColor = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60';
                  else if (item.band === 'amber') bandColor = 'bg-amber-950/60 text-amber-400 border-amber-800/60';

                  return (
                    <div
                      key={item.topic}
                      className={`p-3.5 rounded-xl border flex items-center justify-between ${bandColor}`}
                    >
                      <div>
                        <span className="font-bold text-xs capitalize block">
                          {item.topic.replace('-', ' ')}
                        </span>
                        <span className="text-[11px] opacity-80">
                          {item.correct} correct / {item.attempted} attempted ({item.total} total)
                        </span>
                      </div>
                      <span className="font-mono font-black text-lg">
                        {item.accuracy}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Difficulty Breakdown & Confidence Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Difficulty Breakdown */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-4">
                  Difficulty Level Performance
                </h3>
                <div className="space-y-3">
                  {mcqAnalytics?.difficultyBreakdown?.map((diff: any) => (
                    <div key={diff.diff} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">
                          [{diff.diff}] {diff.diffLabel}
                        </span>
                        <span className="font-mono text-slate-400">
                          {diff.accuracy}% ({diff.correct}/{diff.attempted})
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${
                            diff.band === 'green'
                              ? 'bg-emerald-500'
                              : diff.band === 'amber'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${diff.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confidence Calibration Matrix */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-2">
                  Confidence Calibration Matrix
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Sure should correlate with high accuracy; Guess with ~25% baseline.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="py-2">Tag</th>
                        <th className="py-2 text-center">Correct</th>
                        <th className="py-2 text-center">Wrong</th>
                        <th className="py-2 text-center">Total</th>
                        <th className="py-2 text-right">Accuracy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {(['Sure', 'Maybe', 'Guess', 'Untagged'] as const).map((tag) => {
                        const cell = mcqAnalytics?.confidenceMatrix?.[tag];
                        if (!cell) return null;
                        return (
                          <tr key={tag} className="hover:bg-slate-800/30">
                            <td className="py-2.5 font-sans font-semibold text-slate-200">
                              {tag}
                            </td>
                            <td className="py-2.5 text-center text-emerald-400 font-bold">
                              {cell.correct}
                            </td>
                            <td className="py-2.5 text-center text-rose-400 font-bold">
                              {cell.wrong}
                            </td>
                            <td className="py-2.5 text-center text-slate-400">{cell.total}</td>
                            <td className="py-2.5 text-right font-black text-white">
                              {cell.accuracy}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Stamina Curve (Speed & Accuracy across 30-min windows) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Exam Stamina Curve (30-Minute Windows)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Tracks whether candidate cognitive fatigue sets in during the 4+ hour diagnostic.
              </p>

              {staminaCurve && staminaCurve.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {staminaCurve.map((w: any) => (
                    <div
                      key={w.windowIndex}
                      className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl text-center space-y-1"
                    >
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        {w.label}
                      </span>
                      <span className="font-mono text-xl font-bold text-white block">
                        {w.accuracy}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {w.questionsAnswered} qs ({w.avgSecondsPerQuestion}s/q)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">No timeline data available yet.</div>
              )}
            </div>

            {/* Self-Rating vs Actual Accuracy Calibration */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>Self-Rating Calibration (Part A Self-Ratings vs Actual Accuracy)</span>
              </h3>
              <p className="text-xs text-slate-400 mb-5">
                Compares initial self-confidence (items A07–A13) with actual section performance.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2.5">Subject</th>
                      <th className="py-2.5 text-center">Self-Rating (1–5)</th>
                      <th className="py-2.5 text-center">Actual Accuracy</th>
                      <th className="py-2.5 text-right">Calibration Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selfRatingCorrelation?.map((row: any) => (
                      <tr key={row.itemId} className="hover:bg-slate-800/30">
                        <td className="py-3 font-semibold text-slate-200">{row.subject}</td>
                        <td className="py-3 text-center font-mono font-bold text-amber-400">
                          {row.selfRating} / 5
                        </td>
                        <td className="py-3 text-center font-mono font-bold text-white">
                          {row.actualAccuracy}%
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              row.calibration === 'well-calibrated'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : row.calibration === 'overconfident'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}
                          >
                            {row.calibration.replace('-', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mentor Interventions & Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-4">
                Mentor Exam Interventions
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Extend Time */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">
                    Extend Section Duration
                  </span>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedSectionToExtend}
                      onChange={(e) => setSelectedSectionToExtend(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-white"
                    >
                      {['B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    <select
                      value={extendMinutes}
                      onChange={(e) => setExtendMinutes(Number(e.target.value))}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-white"
                    >
                      <option value={5}>+5 min</option>
                      <option value={10}>+10 min</option>
                      <option value={15}>+15 min</option>
                      <option value={30}>+30 min</option>
                    </select>
                  </div>
                  <button
                    onClick={handleExtendTime}
                    className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                  >
                    Apply Time Extension
                  </button>
                </div>

                {/* Reopen Section */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">
                    Reopen Locked Section
                  </span>
                  <select
                    value={selectedSectionToReopen}
                    onChange={(e) => setSelectedSectionToReopen(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-white"
                  >
                    {['B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleReopenSection}
                    className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center space-x-1"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Reopen Section</span>
                  </button>
                </div>

                {/* Reset & Delete */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-800/30 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">
                    Critical Actions
                  </span>
                  <button
                    onClick={handleResetAttempt}
                    className="w-full py-2 px-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Attempt</span>
                  </button>

                  <button
                    onClick={handleDeleteAttempt}
                    className="w-full py-2 px-3 rounded-lg border border-rose-900 text-rose-400 hover:bg-rose-950/60 font-semibold text-xs flex items-center justify-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hard Delete Attempt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: MCQ SECTION SCORECARDS ==================== */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.values(sectionScores).map((sec: any) => (
                <div key={sec.sectionId} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-white">{sec.title}</h4>
                      <span className="text-[11px] font-mono text-slate-500">
                        Section {sec.sectionId}
                      </span>
                    </div>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {sec.netScore} pts
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-900/40">
                      <span className="font-bold text-emerald-400 block">{sec.correct}</span>
                      <span className="text-[10px] text-slate-400">Correct</span>
                    </div>
                    <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/40">
                      <span className="font-bold text-rose-400 block">{sec.wrong}</span>
                      <span className="text-[10px] text-slate-400">Wrong</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/40">
                      <span className="font-bold text-slate-300 block">{sec.skipped}</span>
                      <span className="text-[10px] text-slate-400">Skipped</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Accuracy:</span>
                      <strong className="text-white font-mono">{sec.accuracy}%</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Attempt Rate:</span>
                      <strong className="text-white font-mono">{sec.attemptRate}%</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Avg Correct Time:</span>
                      <strong className="text-emerald-400 font-mono">{sec.avgTimeCorrectSeconds}s</strong>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Avg Wrong Time:</span>
                      <strong className="text-rose-400 font-mono">{sec.avgTimeWrongSeconds}s</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Flat Per-Question Rows Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mt-8">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-4">
                Detailed Question Audit Trail ({perQuestionRows?.length} items)
              </h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
                    <tr className="text-slate-400 font-semibold uppercase">
                      <th className="py-2.5 px-2">ID</th>
                      <th className="py-2.5 px-2">Sec</th>
                      <th className="py-2.5 px-2">Topic</th>
                      <th className="py-2.5 px-2">Diff</th>
                      <th className="py-2.5 px-2">Selected</th>
                      <th className="py-2.5 px-2">Key</th>
                      <th className="py-2.5 px-2">Result</th>
                      <th className="py-2.5 px-2">Confidence</th>
                      <th className="py-2.5 px-2 text-right">Time (s)</th>
                      <th className="py-2.5 px-2 text-right">Visits</th>
                      <th className="py-2.5 px-2 text-right">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {perQuestionRows?.map((row: any) => (
                      <tr key={row.id} className="hover:bg-slate-800/40">
                        <td className="py-2 px-2 font-bold text-white">{row.id}</td>
                        <td className="py-2 px-2 text-slate-400">{row.sectionId}</td>
                        <td className="py-2 px-2 font-sans text-slate-300">{row.topic}</td>
                        <td className="py-2 px-2 text-slate-400">{row.diff}</td>
                        <td className="py-2 px-2 text-amber-400">{String(row.selected ?? '—')}</td>
                        <td className="py-2 px-2 text-slate-400">{row.ans || '—'}</td>
                        <td className="py-2 px-2">
                          {row.correct === true ? (
                            <span className="text-emerald-400 font-bold">✓ Correct</span>
                          ) : row.correct === false ? (
                            <span className="text-rose-400 font-bold">✗ Wrong</span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-sans">{row.confidence || '—'}</td>
                        <td className="py-2 px-2 text-right">{row.timeSpentSeconds}</td>
                        <td className="py-2 px-2 text-right">{row.visits}</td>
                        <td className="py-2 px-2 text-right">{row.changesCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: SUBJECTIVE & THINKING ==================== */}
        {activeTab === 'subjective' && (
          <div className="space-y-6">
            {subjectiveAnswers?.map((item: any) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-blue-400 font-mono">{item.id}</span>
                    <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.type} • {item.topic || 'Subjective'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    {item.writingStats && (
                      <span>Word Count: <strong className="text-white">{item.writingStats.wordCount}</strong></span>
                    )}
                    {item.writingStats?.pasteCount > 0 && (
                      <span className="text-amber-400">Pastes: {item.writingStats.pasteCount}</span>
                    )}
                    <span>Time: {item.timeSpentSeconds}s</span>
                  </div>
                </div>

                {/* Prompt */}
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-500 block mb-1">Question Prompt</span>
                  <p className="text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-line">
                    {item.stem}
                  </p>
                </div>

                {/* Candidate Chosen Choice if choose_one_long_text */}
                {item.choiceIndex !== null && item.choices && (
                  <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-xs text-blue-200">
                    <strong>Chosen Topic:</strong> {item.choices[item.choiceIndex]}
                  </div>
                )}

                {/* Audio Recording Player for D09 */}
                {item.audioGridFsId && (
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center space-x-3">
                    <Volume2 className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-slate-200 block mb-1">
                        Candidate Voice Note Recording (D09):
                      </span>
                      <audio
                        controls
                        src={`/api/admin/audio/${item.audioGridFsId}`}
                        className="w-full h-8 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Candidate Verbatim Response */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
                    Candidate Answer (Verbatim):
                  </span>
                  <div className="text-sm text-slate-100 font-serif leading-relaxed whitespace-pre-line">
                    {item.selected || <em className="text-slate-500">No response provided</em>}
                  </div>
                  {item.reason && (
                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-xs text-slate-300">
                      <strong>Reason stated:</strong> {item.reason}
                    </div>
                  )}
                </div>

                {/* Mentor Grading Rubric */}
                {item.rubric && (
                  <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                    <span className="font-bold text-slate-300 uppercase tracking-wider block mb-2">
                      Mentor Grading Rubric (0–5 per criterion):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(item.rubric).map(([crit, max]: [string, any]) => (
                        <div key={crit} className="p-2 rounded bg-slate-900 border border-slate-700/60">
                          <span className="text-[11px] capitalize text-slate-400 block">{crit.replace(/_/g, ' ')}</span>
                          <span className="font-bold text-amber-400 font-mono">Max: {max} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ==================== TAB 4: PERSONAL PROFILE ==================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {profileSections && Object.entries(profileSections).map(([secName, items]: [string, any]) => (
              <div key={secName} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-bold text-sm text-amber-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-2">
                  {secName} ({items.length} items)
                </h3>

                <div className="divide-y divide-slate-800/60">
                  {items.map((item: any) => (
                    <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="max-w-xl">
                        <span className="text-xs font-mono text-slate-500 font-bold mr-2">[{item.id}]</span>
                        <span className="text-xs text-slate-300 font-medium">{item.stem}</span>
                        {item.type === 'likert' && item.reverse_scored && (
                          <span className="ml-2 text-[10px] text-amber-500 font-mono">(reverse scored: 6 − resp)</span>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-white font-mono bg-slate-800 px-2.5 py-1 rounded-lg inline-block">
                          {Array.isArray(item.selected)
                            ? item.selected.join(', ')
                            : item.selected !== null && item.selected !== undefined
                            ? String(item.selected)
                            : <em className="text-slate-500 font-normal">Skipped</em>}
                        </span>

                        {item.computedScore !== null && item.computedScore !== undefined && (
                          <span className="block text-[11px] font-mono text-emerald-400 mt-1">
                            Score: {item.computedScore}/5
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ==================== TAB 5: INTEGRITY & TELEMETRY ==================== */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">
            {/* Integrity Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Tab Blur Count
                </span>
                <span className="text-3xl font-bold text-amber-400 font-mono">
                  {attempt.integritySummary?.tabBlurCount || 0}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Fullscreen Exits
                </span>
                <span className="text-3xl font-bold text-rose-400 font-mono">
                  {attempt.integritySummary?.fullscreenExitCount || 0}
                </span>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-center">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Unfocused Duration
                </span>
                <span className="text-3xl font-bold text-white font-mono">
                  {Math.round((attempt.integritySummary?.totalTimeUnfocusedSeconds || 0) / 60)} min
                </span>
              </div>
            </div>

            {/* Event Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider mb-4">
                Telemetry Log Timeline
              </h3>

              <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto font-mono text-xs">
                {eventLogs?.map((evt: any, i: number) => (
                  <div key={i} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-500 font-sans">
                        {new Date(evt.ts).toLocaleTimeString()}
                      </span>
                      <span
                        className={`font-bold ${
                          evt.type.includes('blur') || evt.type.includes('exit')
                            ? 'text-amber-400'
                            : evt.type.includes('deletion')
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {evt.type}
                      </span>
                    </div>

                    <span className="text-slate-500 text-[11px]">
                      {evt.payload ? JSON.stringify(evt.payload) : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
