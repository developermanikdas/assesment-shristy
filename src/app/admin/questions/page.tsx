'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Sparkles, CheckCircle2, AlertCircle, Edit2 } from 'lucide-react';

export default function RefreshableQuestionsEditor() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit form state
  const [stem, setStem] = useState('');
  const [stemHi, setStemHi] = useState('');
  const [opts, setOpts] = useState<string[]>([]);
  const [ans, setAns] = useState('A');
  const [statusMsg, setStatusMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/questions/refreshable');
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error('Failed to fetch refreshable questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleStartEdit = (q: any) => {
    setEditingId(q.id);
    setStem(q.stem || '');
    setStemHi(q.stem_hi || '');
    setOpts(q.opts ? [...q.opts] : ['', '', '', '']);
    setAns(q.ans || 'A');
    setStatusMsg('');
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    setStatusMsg('');
    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stem,
          stem_hi: stemHi || undefined,
          opts,
          ans: ans.toUpperCase(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      setStatusMsg('Question updated successfully!');
      setEditingId(null);
      fetchQuestions();
    } catch (err: any) {
      setStatusMsg(err.message || 'Update error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-bold text-base text-white">
                Current Affairs Question Editor
              </h1>
              <span className="text-xs text-slate-400 block -mt-0.5">
                Questions flagged with refresh: true for upcoming cycles
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-8">
        <div className="mb-6 p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-xs text-amber-200">
          Items flagged with <strong>refresh: true</strong> depend on current economic events (e.g. RBI Governor, Budget 2025–26, MSF rate, GST slabs).
          You can update the question text, options, and answer keys here. Any changes take effect immediately for new or unsubmitted sections.
        </div>

        {statusMsg && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading refreshable questions...</div>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => {
              const isEditing = editingId === q.id;

              return (
                <div
                  key={q.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 font-mono font-bold text-xs flex items-center justify-center">
                        {q.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Section {q.sectionId} • {q.topic} • Diff: [{q.diff}]
                      </span>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(q)}
                        className="py-1.5 px-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors flex items-center space-x-1"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit Question</span>
                      </button>
                    )}
                  </div>

                  {!isEditing ? (
                    /* Read View */
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-white leading-relaxed">
                        {q.stem}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.opts?.map((opt: string, i: number) => {
                          const letter = String.fromCharCode(65 + i);
                          const isCorrect = q.ans === letter;
                          return (
                            <div
                              key={i}
                              className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                                isCorrect
                                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300 font-bold'
                                  : 'bg-slate-800/40 border-slate-800 text-slate-300'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-slate-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                                {letter}
                              </span>
                              <span>{opt}</span>
                              {isCorrect && (
                                <span className="text-[10px] ml-auto uppercase font-bold text-emerald-400">
                                  Answer
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Edit View */
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Question Stem (English)
                        </label>
                        <textarea
                          rows={3}
                          value={stem}
                          onChange={(e) => setStem(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Question Stem (Optional Hindi)
                        </label>
                        <textarea
                          rows={2}
                          value={stemHi}
                          onChange={(e) => setStemHi(e.target.value)}
                          placeholder="Optional Hindi translation..."
                          className="w-full p-3 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">
                          Options & Answer Key
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {opts.map((opt, i) => {
                            const letter = String.fromCharCode(65 + i);
                            return (
                              <div key={i} className="flex items-center space-x-2">
                                <span className="w-6 h-6 rounded-full bg-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {letter}
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const next = [...opts];
                                    next[i] = e.target.value;
                                    setOpts(next);
                                  }}
                                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-white text-xs"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">
                            Correct Answer Key
                          </label>
                          <select
                            value={ans}
                            onChange={(e) => setAns(e.target.value)}
                            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-amber-400 font-bold text-xs"
                          >
                            {opts.map((_, i) => {
                              const letter = String.fromCharCode(65 + i);
                              return (
                                <option key={letter} value={letter}>
                                  Option {letter}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="flex-1 flex justify-end space-x-2 self-end">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="py-2 px-4 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSave(q.id)}
                            className="py-2 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center space-x-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
