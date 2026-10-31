'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PlusCircle,
  Copy,
  Check,
  Clock,
  LogOut,
  RefreshCw,
  Search,
  Upload,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Share2,
  Download,
  ArrowRight,
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

  const validateAndPreview = async (jsonString: string) => {
    try {
      setUploadError('');
      const parsed = JSON.parse(jsonString);
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: parsed, save: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid exam JSON format');
      setUploadPreview(data);
    } catch (err: any) {
      setUploadPreview(null);
      setUploadError(err.message || 'Could not parse JSON. Please check syntax.');
    }
  };

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
      if (!res.ok) throw new Error(data.error || 'Failed to save exam');

      setUploadSuccessMsg(`Exam "${data.title}" successfully created!`);
      await fetchExams();

      setSelectedExamId(data.examId);
      setTimeout(() => {
        setShowUploadModal(false);
        setShowCreateModal(true);
        setUploadSuccessMsg('');
        setUploadPreview(null);
        setUploadJsonText('');
        setUploadFileName('');
      }, 1000);
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
    const text = `Hi ${nickname || 'there'}! Here is your exam link for "${examTitle}":\n\n🔗 ${link}${
      pinCode ? `\n🔑 PIN: ${pinCode}` : ''
    }\n\nAll the best!`;
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Simple Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              EX
            </div>
            <div>
              <span className="font-bold text-sm md:text-base text-white block">
                Assessments
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
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center space-x-1.5"
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
              className="text-xs font-bold px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center space-x-1.5 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Link</span>
            </button>

            <button
              onClick={handleLogout}
              className="text-xs px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors flex items-center space-x-1"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container: Only the Assessment List */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8">
        {/* Search & Refresh */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search student or exam..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => {
              fetchAttempts();
              fetchExams();
            }}
            title="Refresh list"
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Assessment List Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              <span>Loading assessments...</span>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <p className="text-sm font-semibold text-slate-400 mb-1">No assessments found</p>
              <p>Click "Upload JSON" or "Create Link" above to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Exam</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAttempts.map((att) => {
                    const matchedExam = exams.find((e) => e.examId === att.examId);
                    const examDisplayName =
                      matchedExam?.title ||
                      (att.examId === 'rbi_baseline' ? 'RBI Baseline Diagnostic' : att.examId || 'Exam');

                    return (
                      <tr key={att.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-white text-sm">
                          <Link
                            href={`/admin/attempts/${att.id}`}
                            className="hover:underline flex items-center space-x-1.5"
                          >
                            <span>{att.nickname}</span>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-medium max-w-xs truncate">
                          <Link href={`/admin/attempts/${att.id}`} className="hover:underline">
                            {examDisplayName}
                          </Link>
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
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                          {att.startedAt ? new Date(att.startedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={`/api/admin/attempts/${att.id}/export?format=md`}
                              download
                              title="Download answers (.md)"
                              className="inline-flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>

                            <Link
                              href={`/admin/attempts/${att.id}`}
                              title="View download card"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-base font-bold text-white">Upload Exam JSON Paper</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs mb-4">
                {uploadError}
              </div>
            )}

            {uploadSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs mb-4">
                {uploadSuccessMsg}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Select JSON File:
              </label>
              <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>{uploadFileName || 'Choose .json file from computer'}</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Or Paste JSON:
              </label>
              <textarea
                rows={5}
                value={uploadJsonText}
                onChange={(e) => {
                  setUploadJsonText(e.target.value);
                  if (e.target.value.trim().startsWith('{') || e.target.value.trim().startsWith('[')) {
                    validateAndPreview(e.target.value);
                  }
                }}
                placeholder='{"title": "Exam Paper", "questions": [ ... ]}'
                className="w-full p-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {uploadPreview && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 mb-4 flex items-center justify-between">
                <span>{uploadPreview.title}</span>
                <span className="font-mono text-amber-400">{uploadPreview.durationMinutes}m • {uploadPreview.stats?.totalQuestions} Qs</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveUploadedExam}
                disabled={isUploading || !uploadJsonText}
                className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                {isUploading ? <span>Saving...</span> : <span>Create Exam</span>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STUDENT EXAM LINK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">
              Create Student Exam Link
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Assign an exam paper and generate a private link for her.
            </p>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs mb-4">
                {createError}
              </div>
            )}

            {!createdResult ? (
              <form onSubmit={handleCreateAttempt} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Exam:
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {exams.map((ex) => (
                      <option key={ex.examId} value={ex.examId}>
                        {ex.title} ({ex.durationMinutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Student Name:
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

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    PIN (Optional, 6 digits):
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Leave empty for no PIN"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    {creating ? 'Generating...' : 'Create Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
                  Link ready for <strong>{createdResult.nickname}</strong>!
                </div>

                <div>
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

                <div className="pt-2 space-y-2">
                  {(() => {
                    const displayLink =
                      typeof window !== 'undefined' && createdResult.token
                        ? `${window.location.origin}/take/${createdResult.token}`
                        : createdResult.privateLink;
                    return (
                      <button
                        onClick={() => handleCopyInvite(createdResult.examTitle, displayLink, createdResult.pin)}
                        className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>{copiedInvite ? 'Copied Invite!' : 'Copy Formatted Invite'}</span>
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
