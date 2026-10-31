'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Sparkles,
  HelpCircle,
  BookOpen,
  Check,
  X,
  FileCode,
} from 'lucide-react';

export default function AttemptResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mcq' | 'short' | 'long'>('all');

  const fetchAttemptResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/attempts/${id}`);
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch exam results');
      }
      setData(json);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading candidate results');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchAttemptResults();
  }, [fetchAttemptResults]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading student submission and answers...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-white">Failed to Load Results</h2>
          <p className="text-xs text-slate-400">{errorMsg || 'Attempt not found'}</p>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const { attempt, summary, questions = [] } = data;

  const filteredQuestions = questions.filter((q: any) => {
    if (selectedFilter === 'mcq') return q.type === 'mcq';
    if (selectedFilter === 'short') return q.type === 'short_answer' || q.type === 'short_text';
    if (selectedFilter === 'long') return q.type === 'long_answer' || q.type === 'long_text' || q.type === 'essay' || q.type === 'choose_one_long_text';
    return true;
  });

  const totalMins = Math.floor((summary?.totalTimeSpentSeconds || 0) / 60);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="p-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm md:text-base text-white">
                  {attempt.nickname}'s Exam Submission
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    attempt.status === 'completed'
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                  }`}
                >
                  {attempt.status === 'completed' ? 'Submitted' : 'In Progress'}
                </span>
              </div>
              <span className="text-xs text-slate-400 block -mt-0.5">
                {attempt.examTitle}
              </span>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center space-x-2">
            <a
              href={`/api/admin/attempts/${id}/export?format=json`}
              download
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1.5"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">JSON</span>
            </a>

            <a
              href={`/api/admin/attempts/${id}/export?format=md`}
              download
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Answers (.md)</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8">
        {/* Simple Results Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Questions Answered
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-white font-mono">
                {summary?.answeredCount || 0}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                / {summary?.totalQuestions || 0}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              MCQs Correct
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-2xl font-extrabold text-blue-400 font-mono">
                {summary?.mcqCorrectCount || 0}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                / {summary?.mcqCount || 0}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Descriptive Words Written
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-amber-400 font-mono">
                {summary?.totalWordsWritten || 0}
              </span>
              <span className="text-xs text-slate-500">words</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Total Time Spent
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                {totalMins}
              </span>
              <span className="text-xs text-slate-500">mins</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-2 pb-4 mb-6 border-b border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            All Questions ({questions.length})
          </button>
          <button
            onClick={() => setSelectedFilter('mcq')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedFilter === 'mcq'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            MCQs ({summary?.mcqCount || 0})
          </button>
          <button
            onClick={() => setSelectedFilter('short')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedFilter === 'short'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Short Answers ({summary?.shortAnswerCount || 0})
          </button>
          <button
            onClick={() => setSelectedFilter('long')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedFilter === 'long'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Long Essays ({summary?.longAnswerCount || 0})
          </button>
        </div>

        {/* Questions & Submitted Answers List */}
        <div className="space-y-6">
          {filteredQuestions.map((q: any) => {
            const isMCQ = q.type === 'mcq';
            const isShort = q.type === 'short_answer' || q.type === 'short_text';
            const isLong =
              q.type === 'long_answer' ||
              q.type === 'long_text' ||
              q.type === 'essay' ||
              q.type === 'choose_one_long_text';

            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-md transition-all"
              >
                {/* Question Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center">
                      Q{q.index}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {q.sectionTitle} • {q.id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isMCQ
                          ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                          : isShort
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                          : 'bg-purple-950 text-purple-400 border border-purple-800/40'
                      }`}
                    >
                      {isMCQ ? 'MCQ' : isShort ? 'Short Answer' : 'Long Essay'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    {q.timeSpentSeconds > 0 && (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono">{q.timeSpentSeconds}s</span>
                      </span>
                    )}
                    {(isShort || isLong) && (
                      <span className="font-semibold text-amber-400">
                        {q.wordCount} words
                      </span>
                    )}
                    <span className="text-slate-500 font-mono">{q.marks} marks</span>
                  </div>
                </div>

                {/* Question Stem */}
                <div className="text-sm md:text-base font-medium text-slate-100 mb-5 leading-relaxed whitespace-pre-line">
                  {q.stem}
                </div>

                {/* Question Options (for MCQs) */}
                {isMCQ && q.opts && q.opts.length > 0 && (
                  <div className="space-y-2 mb-5">
                    {q.opts.map((opt: string, optIdx: number) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = q.studentAnswer === letter;
                      const isCorrect = q.correctAnswer === letter;

                      let rowClass = 'bg-slate-950/60 border-slate-800/80 text-slate-300';
                      if (isSelected && isCorrect) {
                        rowClass = 'bg-emerald-950/60 border-emerald-600 text-emerald-200';
                      } else if (isSelected && !isCorrect) {
                        rowClass = 'bg-rose-950/60 border-rose-600 text-rose-200';
                      } else if (isCorrect) {
                        rowClass = 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300';
                      }

                      return (
                        <div
                          key={optIdx}
                          className={`p-3 rounded-xl border text-xs md:text-sm flex items-center space-x-3 ${rowClass}`}
                        >
                          <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {letter}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isSelected && isCorrect && (
                            <span className="text-emerald-400 text-xs font-bold flex items-center space-x-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>Chosen (Correct)</span>
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="text-rose-400 text-xs font-bold flex items-center space-x-1">
                              <X className="w-3.5 h-3.5" />
                              <span>Chosen (Incorrect)</span>
                            </span>
                          )}
                          {!isSelected && isCorrect && (
                            <span className="text-emerald-400/80 text-xs font-semibold">
                              (Correct Answer)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Student's Written Answer (for Short & Long Questions) */}
                {(isShort || isLong) && (
                  <div className="mb-5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Student's Written Answer:
                    </span>
                    {q.skipped || !q.studentAnswer ? (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 italic text-xs">
                        Student did not write an answer for this question.
                      </div>
                    ) : (
                      <div className="p-4 md:p-5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm leading-relaxed whitespace-pre-line font-sans shadow-inner border-l-4 border-l-blue-500">
                        {q.studentAnswer}
                      </div>
                    )}
                  </div>
                )}

                {/* Model Answer / Reference (if provided) */}
                {q.modelAnswer && (
                  <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
                    <span className="font-bold text-emerald-400 flex items-center space-x-1 uppercase tracking-wider text-[10px]">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Model Answer / Key (For Mentor Reference):</span>
                    </span>
                    <p className="leading-relaxed whitespace-pre-line text-slate-300">
                      {q.modelAnswer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
