'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Lock,
  KeyRound,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  Play,
} from 'lucide-react';
import { QuestionItem, SetData, ConfidenceTag } from '@/types';
import { ExamHeader } from '@/components/exam/Header';
import { ChatMode } from '@/components/exam/ChatMode';
import { ExamMode } from '@/components/exam/ExamMode';
import { BreakScreen } from '@/components/exam/BreakScreen';
import { FinishScreen } from '@/components/exam/FinishScreen';
import { NotepadModal } from '@/components/exam/NotepadModal';
import { Language, translations } from '@/lib/i18n';
import { enqueueAnswer, flushOfflineQueue } from '@/lib/offline-queue';

export default function TakeAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  // Attempt & Exam State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [sets, setSets] = useState<Record<string, SetData>>({});
  const [savedResponses, setSavedResponses] = useState<Record<string, any>>({});

  // PIN Protection State
  const [isPinLocked, setIsPinLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Settings & UI
  const [language, setLanguage] = useState<Language>('en');
  const [isDark, setIsDark] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notepadContent, setNotepadContent] = useState('');

  // Local Timer Mirror
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isStartingExam, setIsStartingExam] = useState(false);

  // Telemetry trackers
  const blurStartTimeRef = useRef<number | null>(null);

  // Load initial data
  const loadAssessment = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/attempt/${token}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load assessment');
      }

      setAttempt(data.attempt);
      setSections(data.sections || []);
      setQuestions(data.questions || []);
      setSets(data.sets || {});
      setSavedResponses(data.responses || {});
      setNotepadContent(data.attempt.notepad || '');

      // Check if PIN lock required
      const pinUnlockedInSession = sessionStorage.getItem(`unlocked_pin_${token}`);
      if (data.attempt.hasPin && !pinUnlockedInSession) {
        setIsPinLocked(true);
      }

      // Initialize timer
      if (data.attempt.timer) {
        setTimeRemainingSeconds(data.attempt.timer.remainingSeconds);
        setIsTimerRunning(
          data.attempt.timer.status === 'active' || data.attempt.timer.status === 'buffer_active'
        );
      }
    } catch (err: any) {
      console.error('Failed to load assessment:', err);
      setError(err.message || 'Could not connect to assessment server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  // Check dark mode preference
  useEffect(() => {
    const isDarkClass = document.documentElement.classList.contains('dark');
    setIsDark(isDarkClass);
  }, []);

  const handleThemeToggle = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rbi_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rbi_theme', 'light');
    }
  };

  const handleLanguageToggle = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  // Telemetry logging helper
  const logEvent = useCallback(
    async (type: string, payload?: any) => {
      try {
        await fetch(`/api/attempt/${token}/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, payload }),
        });
      } catch (err) {
        console.error('Failed to log event:', err);
      }
    },
    [token]
  );

  // Setup Activity & Telemetry Listeners (Blur, Focus, Fullscreen, Network)
  useEffect(() => {
    // 1. Initial device info log
    logEvent('device_info', {
      userAgent: navigator.userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      language: navigator.language,
    });

    // 2. Blur / Focus handlers
    const handleBlur = () => {
      blurStartTimeRef.current = Date.now();
      logEvent('tab_blur');
    };

    const handleFocus = () => {
      if (blurStartTimeRef.current) {
        const unfocusedDuration = Math.round((Date.now() - blurStartTimeRef.current) / 1000);
        logEvent('tab_unfocused_duration', { durationSeconds: unfocusedDuration });
        blurStartTimeRef.current = null;
      }
      logEvent('tab_focus');
    };

    // 3. Online/offline listener
    const handleOnline = async () => {
      setSaveStatus('saving');
      const synced = await flushOfflineQueue(token);
      setSaveStatus('saved');
    };

    const handleOffline = () => {
      setSaveStatus('offline');
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token, logEvent]);

  // Server-Authoritative Timer Ticker
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Periodic Re-sync with server timer (every 45s)
  useEffect(() => {
    if (!isTimerRunning) return;

    const syncInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/attempt/${token}`);
        if (res.ok) {
          const data = await res.json();
          if (data.attempt?.timer) {
            setTimeRemainingSeconds(data.attempt.timer.remainingSeconds);
            setAttempt(data.attempt);
          }
        }
      } catch (err) {
        // network blip, continue client countdown
      }
    }, 45000);

    return () => clearInterval(syncInterval);
  }, [token, isTimerRunning]);

  // Verify PIN handler
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput || pinInput.length !== 6) {
      setPinError('Please enter the 6-digit access PIN');
      return;
    }

    setIsVerifyingPin(true);
    setPinError('');

    try {
      const res = await fetch(`/api/attempt/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin: pinInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Incorrect PIN');
      }

      sessionStorage.setItem(`unlocked_pin_${token}`, 'true');
      setIsPinLocked(false);
    } catch (err: any) {
      setPinError(err.message || 'Incorrect PIN');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Autosave answer handler (Idempotent + Offline Queue fallback)
  const handleSaveAnswer = useCallback(
    async (
      itemId: string,
      value: any,
      extra?: {
        confidence?: ConfidenceTag | null;
        markedForReview?: boolean;
        skipped?: boolean;
        reason?: string;
        choiceIndex?: number;
        writingStats?: any;
        timeSpentSeconds?: number;
      }
    ) => {
      const clientEventId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setSaveStatus('saving');

      const isSkipped = extra?.skipped !== undefined ? extra.skipped : (value === null || value === undefined || value === '');
      const finalConfidence = isSkipped ? null : (extra?.confidence !== undefined ? extra.confidence : null);

      // Optimistic local update
      setSavedResponses((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          itemId,
          selected: value,
          confidence: finalConfidence,
          markedForReview:
            extra?.markedForReview !== undefined ? extra.markedForReview : prev[itemId]?.markedForReview,
          skipped: isSkipped,
          reason: extra?.reason !== undefined ? extra.reason : prev[itemId]?.reason,
          choiceIndex: extra?.choiceIndex !== undefined ? extra.choiceIndex : prev[itemId]?.choiceIndex,
          writingStats: extra?.writingStats || prev[itemId]?.writingStats,
          timeSpentSeconds:
            extra?.timeSpentSeconds !== undefined
              ? Math.max(prev[itemId]?.timeSpentSeconds || 0, extra.timeSpentSeconds)
              : prev[itemId]?.timeSpentSeconds,
          lastSavedAt: new Date().toISOString(),
        },
      }));

      const payload = {
        itemId,
        partId: attempt?.currentPartId || 'A',
        sectionId: attempt?.currentSectionId || 'A',
        selected: value,
        reason: extra?.reason,
        choiceIndex: extra?.choiceIndex,
        confidence: finalConfidence,
        timeSpentSeconds: extra?.timeSpentSeconds,
        markedForReview: extra?.markedForReview,
        skipped: isSkipped,
        writingStats: extra?.writingStats,
        clientEventId,
      };

      try {
        if (!navigator.onLine) {
          enqueueAnswer(token, payload);
          setSaveStatus('offline');
          return;
        }

        const res = await fetch(`/api/attempt/${token}/save-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          enqueueAnswer(token, payload);
          setSaveStatus('offline');
        } else {
          setSaveStatus('saved');
        }
      } catch {
        enqueueAnswer(token, payload);
        setSaveStatus('offline');
      }
    },
    [token, attempt]
  );

  // Section timer action handler (start, buffer, stop buffer, submit)
  const handleTimerAction = async (action: 'start' | 'use_buffer' | 'stop_buffer' | 'submit') => {
    try {
      const currentSecId = attempt?.currentSectionId || 'A';
      const res = await fetch(`/api/attempt/${token}/section-timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: currentSecId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Timer update failed');
      }

      // Re-fetch entire attempt to reflect updated questions and locked state
      await loadAssessment();
    } catch (err: any) {
      console.error('Section transition error:', err);
      alert(err.message || 'Error updating section timer');
    }
  };

  // Part completion handler for Chat mode
  const handlePartComplete = async () => {
    await handleTimerAction('submit');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-400 flex items-center justify-center font-bold text-xl shadow-lg animate-pulse">
            RBI
          </div>
          <span className="text-sm font-semibold text-slate-500">
            Connecting to secure exam engine...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Assessment Unavailable</h2>
          <p className="text-sm text-slate-500 mb-6">
            {error || 'This assessment link is invalid or has expired. Please contact your mentor.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  // PIN Lock Modal
  if (isPinLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-center text-white mb-1">
            Access PIN Required
          </h2>
          <p className="text-xs text-center text-slate-400 mb-6">
            Welcome, <strong>{attempt.nickname}</strong>. Please enter the 6-digit access PIN provided by your mentor to start or resume.
          </p>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                placeholder="• • • • • •"
                className="w-full text-center text-2xl tracking-[0.5em] py-3 rounded-xl border border-slate-700 bg-slate-900 text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {pinError && <p className="text-xs text-rose-400 mt-2 text-center">{pinError}</p>}
            </div>

            <button
              type="submit"
              disabled={isVerifyingPin}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-bold text-sm text-white shadow-lg transition-all disabled:opacity-50"
            >
              {isVerifyingPin ? 'Unlocking...' : 'Unlock Assessment'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Start Exam handler
  const handleStartExam = async () => {
    setIsStartingExam(true);
    try {
      const res = await fetch(`/api/attempt/${token}/start`, { method: 'POST' });
      if (res.ok) {
        await loadAssessment();
      }
    } catch (e) {
      console.error('Failed to start exam:', e);
    } finally {
      setIsStartingExam(false);
    }
  };

  // Not Started: Waiting Room / Start Exam Screen
  if (attempt.status === 'not_started') {
    const totalQCount = questions.length;
    const initialSec = sections[0];
    const totalTimeMin = sections.reduce((acc, s) => acc + (s.timeMin || 0), 0);

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-slate-100">
        <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 text-center">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
              Assessment Ready
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              Welcome, {attempt.nickname}!
            </h2>
            <p className="text-xs text-slate-400">
              {initialSec?.title || 'College Examination'}
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3 text-center text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Questions</span>
              <strong className="text-base text-white">{totalQCount}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Time Limit</span>
              <strong className="text-base text-amber-400">{totalTimeMin}m</strong>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/30 text-amber-300 text-xs text-left leading-relaxed flex items-start space-x-2">
            <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <span>
              The timer will <strong>not</strong> start until you click the button below. Click when you are ready to begin.
            </span>
          </div>

          <button
            type="button"
            onClick={handleStartExam}
            disabled={isStartingExam}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center space-x-2 transition-all transform active:scale-[0.99] disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isStartingExam ? 'Starting...' : 'Start Exam'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Completed State
  if (attempt.status === 'completed') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
        <ExamHeader
          nickname={attempt.nickname}
          sectionTitle="Assessment Completed"
          partId="✓"
          sectionId="COMPLETED"
          timeRemainingSeconds={0}
          totalDurationSeconds={0}
          isTimed={false}
          isSoftTimer={false}
          isBreak={false}
          isBufferActive={false}
          bufferAvailableSeconds={0}
          language={language}
          onLanguageToggle={handleLanguageToggle}
          isDark={isDark}
          onThemeToggle={handleThemeToggle}
          onOpenNotepad={() => setIsNotepadOpen(true)}
          hasNotepadContent={!!notepadContent}
          saveStatus="saved"
        />
        <FinishScreen nickname={attempt.nickname} token={token} language={language} />
      </div>
    );
  }

  // Determine current active section configuration
  const currentSectionId = attempt.currentSectionId || 'A';
  const currentPartId = attempt.currentPartId || 'A';
  const currentSectionConfig =
    sections.find((s) => s.id === currentSectionId) || sections[0];

  const sectionQuestions = questions.filter((q) => q.sectionId === currentSectionId);

  // Check if current mode is Break
  const isBreakSection = currentSectionId === 'BREAK1' || currentSectionId === 'BREAK2';

  // Check if Chat Mode (Parts A, D, E for RBI baseline) or CBT Exam Mode
  const isCustomExam = attempt.examId && attempt.examId !== 'rbi_baseline';
  const isChatMode = !isCustomExam && ['A', 'D', 'E'].includes(currentPartId) && !isBreakSection;

  const currentTimerData = attempt.timer;
  const isBufferActive = currentTimerData?.status === 'buffer_active';
  const isTimeExpired = currentTimerData?.status === 'time_expired' || (currentSectionConfig?.isTimed && timeRemainingSeconds <= 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Server Synchronized Header */}
      <ExamHeader
        nickname={attempt.nickname}
        sectionTitle={currentSectionConfig?.title || 'Diagnostic Assessment'}
        partId={currentPartId}
        sectionId={currentSectionId}
        timeRemainingSeconds={timeRemainingSeconds}
        totalDurationSeconds={currentSectionConfig?.timeMin ? currentSectionConfig.timeMin * 60 : 0}
        isTimed={!!currentSectionConfig?.isTimed}
        isSoftTimer={!!currentSectionConfig?.isSoftTimer}
        isBreak={isBreakSection}
        isBufferActive={isBufferActive}
        bufferAvailableSeconds={
          Math.max(0, (attempt.pooledBufferTotalSeconds || 1200) - (attempt.pooledBufferUsedSeconds || 0))
        }
        language={language}
        onLanguageToggle={handleLanguageToggle}
        isDark={isDark}
        onThemeToggle={handleThemeToggle}
        onOpenNotepad={() => setIsNotepadOpen(true)}
        hasNotepadContent={!!notepadContent}
        saveStatus={saveStatus}
        onStopBuffer={() => handleTimerAction('stop_buffer')}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* 1. BREAK SCREENS */}
        {isBreakSection ? (
          <BreakScreen
            breakTitle={currentSectionConfig?.title || 'Rest Break'}
            timeRemainingSeconds={timeRemainingSeconds}
            language={language}
            onResumeEarly={() => handleTimerAction('submit')}
          />
        ) : isChatMode ? (
          /* 2. CHAT MODE (Parts A, D, E) */
          <ChatMode
            questions={sectionQuestions}
            allQuestions={questions}
            partTitle={currentSectionConfig?.title || 'Diagnostic'}
            partId={currentPartId}
            language={language}
            token={token}
            savedResponses={savedResponses}
            onSaveAnswer={handleSaveAnswer}
            onPartComplete={handlePartComplete}
          />
        ) : (
          /* 3. EXAM MODE (Parts B & C) */
          <ExamMode
            questions={sectionQuestions}
            sets={sets}
            sectionTitle={currentSectionConfig?.title || 'Phase Paper'}
            sectionId={currentSectionId}
            language={language}
            token={token}
            savedResponses={savedResponses}
            isTimeExpired={isTimeExpired}
            canUseBuffer={
              Math.max(0, (attempt.pooledBufferTotalSeconds || 1200) - (attempt.pooledBufferUsedSeconds || 0)) > 0
            }
            bufferAvailableSeconds={
              Math.max(0, (attempt.pooledBufferTotalSeconds || 1200) - (attempt.pooledBufferUsedSeconds || 0))
            }
            onUseBuffer={() => handleTimerAction('use_buffer')}
            onSaveAnswer={handleSaveAnswer}
            onSubmitSection={() => handleTimerAction('submit')}
          />
        )}
      </main>

      {/* Rough Work Scratchpad Notepad Modal */}
      <NotepadModal
        isOpen={isNotepadOpen}
        onClose={() => setIsNotepadOpen(false)}
        token={token}
        initialContent={notepadContent}
        language={language}
        onNotepadChange={(val) => setNotepadContent(val)}
      />
    </div>
  );
}
