'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  PlusCircle,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Sparkles,
  LogOut,
  RefreshCw,
  Search,
  BookOpen,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  KeyRound,
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Share2,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Attempt Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Upload Exam Modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadJsonText, setUploadJsonText] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [markAsDemo, setMarkAsDemo] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/attempts');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setAttempts(data.attempts || []);
    } catch (err) {
      console.error('Failed to fetch attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/admin/exams');
      if (res.ok) {
        const data = await res.json();
        const examList = data.exams || [];
        setExams(examList);
        if (examList.length > 0 && !selectedExamId) {
          setSelectedExamId(examList[0].examId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    }
  };

  useEffect(() => {
    fetchAttempts();
    fetchExams();
  }, []);

  const handleCreateAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);

    try {
      const res = await fetch('/api/admin/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: nickname.trim(),
          pin: pin.trim() || undefined,
          examId: selectedExamId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create attempt');
      }

      setCreatedResult(data.attempt);
      fetchAttempts();
    } catch (err: any) {
      setCreateError(err.message || 'Creation error');
    } finally {
      setCreating(false);
    }
  };

  // Handle JSON file selection in upload modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    setUploadSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setUploadJsonText(content);
      validateAndPreview(content);
    };
    reader.onerror = () => {
      setUploadError('Failed to read the selected file');
    };
    reader.readAsText(file);
  };

  // Client-side quick preview & check
  const validateAndPreview = async (jsonString: string) => {
    try {
      setUploadError('');
      const parsed = JSON.parse(jsonString);
      // Call preview endpoint
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: parsed, save: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid exam JSON format');
      }
      setUploadPreview(data);
    } catch (err: any) {
      setUploadPreview(null);
      setUploadError(err.message || 'Could not parse JSON. Please check syntax.');
    }
  };

  // Submit and save exam
  const handleSaveUploadedExam = async () => {
    if (!uploadJsonText) {
      setUploadError('Please select or paste a JSON question paper');
      return;
    }
    setIsUploading(true);
    setUploadError('');
    try {
      const parsed = JSON.parse(uploadJsonText);
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: parsed, isDemo: markAsDemo, save: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save exam');
      }

      setUploadSuccessMsg(`Exam "${data.title}" successfully created and ready!`);
      await fetchExams();

      // Automatically select new exam and give option to create link
      setSelectedExamId(data.examId);
      setTimeout(() => {
        setShowUploadModal(false);
        setShowCreateModal(true);
        setUploadSuccessMsg('');
        setUploadPreview(null);
        setUploadJsonText('');
        setUploadFileName('');
      }, 1200);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save exam');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInvite = (examTitle: string, link: string, pinCode?: string) => {
    const text = `Hi ${nickname || 'there'}! Here is your private exam link for "${examTitle}":\n\n🔗 ${link}${
      pinCode ? `\n🔑 PIN: ${pinCode}` : ''
    }\n\nMake sure to take it in a quiet environment. All the best!`;
    navigator.clipboard.writeText(text);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const filteredAttempts = attempts.filter((att) =>
    att.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    att.token?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const inProgressCount = attempts.filter((a) => a.status === 'in_progress').length;
  const completedCount = attempts.filter((a) => a.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Admin Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-sm shadow-md">
              EX
            </div>
            <div>
              <span className="font-bold text-sm md:text-base text-white block">
                Exam Assessment & Mentor Portal
              </span>
              <span className="text-xs text-slate-400 block -mt-0.5">
                Dynamic Question Papers & Student Evaluation
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setUploadError('');
                setUploadSuccessMsg('');
                setUploadPreview(null);
                setUploadJsonText('');
                setUploadFileName('');
                setShowUploadModal(true);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Exam JSON</span>
            </button>

            <Link
              href="/admin/questions"
              className="hidden sm:flex text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors items-center space-x-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Questions Editor</span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 transition-colors flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Total Attempts
            </span>
            <span className="text-3xl font-extrabold text-white font-mono">
              {attempts.length}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider block mb-1">
              In Progress
            </span>
            <span className="text-3xl font-extrabold text-amber-400 font-mono">
              {inProgressCount}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Completed
            </span>
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              {completedCount}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-1">
              Exam Papers Loaded
            </span>
            <span className="text-3xl font-extrabold text-white font-mono">
              {exams.length}
            </span>
          </div>
        </div>

        {/* Action Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by student nickname or token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                fetchAttempts();
                fetchExams();
              }}
              title="Refresh"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setUploadError('');
                setUploadSuccessMsg('');
                setUploadPreview(null);
                setUploadJsonText('');
                setUploadFileName('');
                setShowUploadModal(true);
              }}
              className="py-2 px-3.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Upload JSON</span>
            </button>

            <button
              onClick={() => {
                setNickname('');
                setPin('');
                setCreatedResult(null);
                setCreateError('');
                setShowCreateModal(true);
              }}
              className="py-2 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md flex items-center space-x-2 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Student Exam Link</span>
            </button>
          </div>
        </div>

        {/* Attempts Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              <span>Loading student assessment records...</span>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <p className="text-sm font-semibold text-slate-400 mb-1">No candidate attempts found</p>
              <p>Upload a JSON exam paper and click "Create Student Exam Link" to begin taking exams.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Exam Paper</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Section</th>
                    <th className="py-3.5 px-4">PIN</th>
                    <th className="py-3.5 px-4">Time Spent</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredAttempts.map((att) => {
                    const matchedExam = exams.find((e) => e.examId === att.examId);
                    const examDisplayName =
                      matchedExam?.title ||
                      (att.examId === 'rbi_baseline' ? 'RBI Baseline Diagnostic' : att.examId || 'Custom Paper');

                    const mins = Math.floor(att.timeElapsedSeconds / 60);
                    const secs = att.timeElapsedSeconds % 60;
                    const timeStr = `${mins}m ${secs}s`;

                    return (
                      <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{att.nickname}</div>
                          <div className="font-mono text-[10px] text-slate-500">{att.token.substring(0, 10)}...</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-300 block max-w-xs truncate" title={examDisplayName}>
                            {examDisplayName}
                          </span>
                          {matchedExam?.durationMinutes && (
                            <span className="text-[10px] text-slate-500">{matchedExam.durationMinutes} min limit</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {att.status === 'completed' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-800/50">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Completed</span>
                            </span>
                          ) : att.status === 'in_progress' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-400 border border-amber-800/50">
                              <Clock className="w-3 h-3" />
                              <span>In Progress</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400">
                              Not Started
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                          {att.currentSectionId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {att.hasPin ? (
                            <span className="text-amber-400 flex items-center space-x-1">
                              <KeyRound className="w-3 h-3" />
                              <span>6-digit PIN</span>
                            </span>
                          ) : (
                            <span className="text-slate-600">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {att.startedAt ? timeStr : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/admin/attempts/${att.id}`}
                            className="inline-flex items-center space-x-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-600/30 transition-colors"
                          >
                            <span>Dossier</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* UPLOAD EXAM JSON MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Upload Exam JSON Paper</h3>
                  <p className="text-xs text-slate-400">Supports MCQs, Short Questions, and Long Essays</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs mb-4 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs mb-4 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}

            {/* File picker */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select JSON File from Computer:
              </label>
              <div className="flex items-center space-x-3">
                <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-emerald-400" />
                  <span>{uploadFileName || 'Choose .json file'}</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {uploadFileName && (
                  <span className="text-xs text-emerald-400 font-mono">✓ {uploadFileName}</span>
                )}
              </div>
            </div>

            {/* Paste JSON directly */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Or Paste JSON Content Below:
              </label>
              <textarea
                rows={6}
                value={uploadJsonText}
                onChange={(e) => {
                  setUploadJsonText(e.target.value);
                  if (e.target.value.trim().startsWith('{') || e.target.value.trim().startsWith('[')) {
                    validateAndPreview(e.target.value);
                  }
                }}
                placeholder='{"title": "Forensic Medicine Exam", "questions": [ ... ]}'
                className="w-full p-3.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Live Auto-Planning Preview */}
            {uploadPreview && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-5">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  ✓ Exam Paper Preview & Auto-Planning:
                </span>
                <div className="text-sm font-bold text-white mb-1">{uploadPreview.title}</div>
                <div className="text-xs text-slate-400 mb-3">{uploadPreview.subject || 'General Assessment'}</div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">MCQs</span>
                    <strong className="text-blue-400">{uploadPreview.stats?.mcqCount || 0}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Short Qs</span>
                    <strong className="text-amber-400">{uploadPreview.stats?.shortAnswerCount || 0}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Long Essays</span>
                    <strong className="text-purple-400">{uploadPreview.stats?.longAnswerCount || 0}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-500 block">Total Marks</span>
                    <strong className="text-emerald-400">{uploadPreview.totalMarks || 0}</strong>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-900">
                  <span>Planned Duration:</span>
                  <strong className="text-amber-400 font-mono text-sm">
                    {uploadPreview.durationMinutes} minutes
                  </strong>
                </div>
              </div>
            )}

            {/* Checkbox for Student Demo */}
            <div className="mb-6">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markAsDemo}
                  onChange={(e) => setMarkAsDemo(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Set as active practice demo exam for students on home page</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveUploadedExam}
                disabled={isUploading || !uploadJsonText}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Exam...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Create Exam & Generate Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STUDENT EXAM LINK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Create Student Exam Link
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Assign an exam paper, set an optional PIN, and generate a private candidate link for her.
            </p>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs mb-4">
                {createError}
              </div>
            )}

            {!createdResult ? (
              <form onSubmit={handleCreateAttempt} className="space-y-4">
                {/* Select Exam */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Exam Paper:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {exams.map((ex) => (
                      <option key={ex.examId} value={ex.examId}>
                        {ex.title} ({ex.durationMinutes}m • {ex.totalQuestions} Qs)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nickname */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Student Nickname / Name:
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Shristy"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* PIN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Access PIN (Optional, 6 digits):
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 123456 (leave empty for no PIN)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    If set, she will need to enter this 6-digit PIN before opening the exam.
                  </span>
                </div>

                <div className="flex items-center space-x-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Generating Link...' : 'Create & Send Link'}
                  </button>
                </div>
              </form>
            ) : (
              /* Created Result View */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
                  Exam link generated for <strong>{createdResult.nickname}</strong>! Copy the link or formatted invitation below.
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Exam Title:
                  </label>
                  <div className="text-xs font-bold text-white mb-2">
                    {createdResult.examTitle}
                  </div>

                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Candidate Private Link:
                  </label>
                  {(() => {
                    const displayLink =
                      typeof window !== 'undefined' && createdResult.token
                        ? `${window.location.origin}/take/${createdResult.token}`
                        : createdResult.privateLink;
                    return (
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          readOnly
                          value={displayLink}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-mono select-all"
                        />
                        <button
                          onClick={() => handleCopyLink(displayLink)}
                          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                          title="Copy Link"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {createdResult.pin && (
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Access PIN:</span>
                    <strong className="font-mono text-amber-400 text-sm tracking-wider">
                      {createdResult.pin}
                    </strong>
                  </div>
                )}

                {/* One Click Share Message */}
                <div className="pt-2">
                  {(() => {
                    const displayLink =
                      typeof window !== 'undefined' && createdResult.token
                        ? `${window.location.origin}/take/${createdResult.token}`
                        : createdResult.privateLink;
                    return (
                      <button
                        onClick={() => handleCopyInvite(createdResult.examTitle, displayLink, createdResult.pin)}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 flex items-center justify-center space-x-2 transition-all mb-2"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>{copiedInvite ? 'Copied Invitation to Clipboard!' : 'Copy Formatted Invite Message'}</span>
                      </button>
                    );
                  })()}

                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedResult(null);
                    }}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-white"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
