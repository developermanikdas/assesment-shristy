'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FileText,
  Clock,
} from 'lucide-react';

export default function AttemptDownloadPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchAttempt = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/attempts/${id}`);
        if (res.status === 401) {
          router.push('/admin/login');
          return;
        }
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to fetch assessment');
        }
        setData(json);
      } catch (err: any) {
        setErrorMsg(err.message || 'Error loading assessment');
      } finally {
        setLoading(false);
      }
    };

    fetchAttempt();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-white">Assessment Not Found</h2>
          <p className="text-xs text-slate-400">{errorMsg || 'Could not load submission'}</p>
          <Link
            href="/admin"
            className="inline-flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assessments</span>
          </Link>
        </div>
      </div>
    );
  }

  const { attempt, summary } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-start">
          <Link
            href="/admin"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Assessments</span>
          </Link>
        </div>

        {/* Student & Exam Info */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {attempt.nickname}
          </h1>
          <p className="text-sm font-semibold text-slate-300">
            {attempt.examTitle}
          </p>
          <div className="flex items-center justify-center space-x-2 pt-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                attempt.status === 'completed'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
              }`}
            >
              {attempt.status === 'completed' ? 'Completed' : 'In Progress'}
            </span>
            {attempt.completedAt && (
              <span className="text-[11px] text-slate-500">
                • {new Date(attempt.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Short Summary */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-around font-mono">
          <div>
            <span className="text-[10px] text-slate-500 block">Answered</span>
            <strong className="text-white text-sm">{summary?.answeredCount || 0}</strong>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block">Total Qs</span>
            <strong className="text-white text-sm">{summary?.totalQuestions || 0}</strong>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[10px] text-slate-500 block">Words</span>
            <strong className="text-white text-sm">{summary?.totalWordsWritten || 0}</strong>
          </div>
        </div>

        {/* Download Buttons - The main focal action */}
        <div className="space-y-3 pt-2">
          <a
            href={`/api/admin/attempts/${id}/export?format=md`}
            download
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99]"
          >
            <Download className="w-4 h-4" />
            <span>Download Answers (.md)</span>
          </a>

          <a
            href={`/api/admin/attempts/${id}/export?format=json`}
            download
            className="w-full py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Download Raw Answers (JSON)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
