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
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Attempt Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [pin, setPin] = useState('');
  const [createdResult, setCreatedResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

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

  useEffect(() => {
    fetchAttempts();
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

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const filteredAttempts = attempts.filter((att) =>
    att.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    att.token.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = attempts.filter((a) => a.status === 'completed').length;
  const inProgressCount = attempts.filter((a) => a.status === 'in_progress').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 text-amber-400 font-extrabold text-lg flex items-center justify-center border border-blue-500/30">
              RBI
            </div>
            <div>
              <span className="font-bold text-base text-white tracking-tight block">
                Mentor Command Center
              </span>
              <span className="text-xs text-slate-400 block -mt-0.5">
                Baseline Assessment & Study Roadmaps
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              href="/admin/questions"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center space-x-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Current Affairs Editor</span>
            </Link>

            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 border border-rose-900/40 transition-colors flex items-center space-x-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
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
              Total Aspirants
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
              Scheduled Duration
            </span>
            <span className="text-2xl font-bold text-white font-mono">
              4h 10m <span className="text-xs font-sans text-slate-400 font-normal">(+20m buffer)</span>
            </span>
          </div>
        </div>

        {/* Section Header & Create Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by aspirant nickname or token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-800 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAttempts}
              title="Refresh attempts list"
              className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
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
              <span>Create Candidate Attempt</span>
            </button>
          </div>
        </div>

        {/* Attempts Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading attempts...</div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No diagnostic attempts found. Click &quot;Create Candidate Attempt&quot; above to invite an aspirant.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Aspirant</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Current Section</th>
                    <th className="py-3 px-4">Time Elapsed</th>
                    <th className="py-3 px-4">Buffer Used</th>
                    <th className="py-3 px-4">PIN</th>
                    <th className="py-3 px-4">Last Activity</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredAttempts.map((att) => {
                    const elapsedMin = Math.floor(att.timeElapsedSeconds / 60);
                    const bufMin = Math.round((att.pooledBufferUsedSeconds / 60) * 10) / 10;
                    return (
                      <tr
                        key={att.id}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/admin/attempts/${att.id}`)}
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white text-sm block">
                            {att.nickname}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {att.token.slice(0, 10)}...
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              att.status === 'completed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : att.status === 'in_progress'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {att.status.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {att.currentSectionId} ({att.currentPartId})
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {elapsedMin > 0 ? `${elapsedMin} min` : 'Not started'}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          {bufMin > 0 ? `${bufMin} min` : '0 min'}
                        </td>

                        <td className="py-3.5 px-4">
                          {att.hasPin ? (
                            <span className="text-amber-400 text-[11px] font-semibold flex items-center space-x-1">
                              <KeyRound className="w-3 h-3" />
                              <span>Protected</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[11px]">None</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                          {att.lastActivity
                            ? new Date(att.lastActivity).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/admin/attempts/${att.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Create Attempt Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Create New Candidate Attempt
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Generate a private, tamper-resistant access link for your student.
            </p>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {createError}
              </div>
            )}

            {!createdResult ? (
              <form onSubmit={handleCreateAttempt} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Student Nickname / ID
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Optional 6-Digit PIN
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
                    Never stored raw; hashed using bcrypt on server.
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
                    {creating ? 'Generating Link...' : 'Create Link'}
                  </button>
                </div>
              </form>
            ) : (
              /* Created Result View */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
                  Candidate assessment created successfully! Copy the private URL below and share it with your student.
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Candidate Private Link:
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={createdResult.privateLink}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-700 bg-slate-800 text-slate-200 font-mono select-all"
                    />
                    <button
                      onClick={() => handleCopyLink(createdResult.privateLink)}
                      className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {createdResult.pin && (
                  <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Access PIN:</span>
                    <strong className="font-mono text-amber-400 text-sm tracking-wider">
                      {createdResult.pin}
                    </strong>
                  </div>
                )}

                <div className="pt-2">
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
