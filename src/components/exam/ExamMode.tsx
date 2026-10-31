'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Send,
  Table as TableIcon,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { QuestionItem, SetData, ConfidenceTag } from '@/types';
import { translations, Language } from '@/lib/i18n';

interface ExamModeProps {
  questions: QuestionItem[];
  sets: Record<string, SetData>;
  sectionTitle: string;
  sectionId: string;
  language: Language;
  token: string;
  savedResponses: Record<string, any>;
  isTimeExpired: boolean;
  canUseBuffer: boolean;
  bufferAvailableSeconds: number;
  onUseBuffer: () => void;
  onSaveAnswer: (
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
  ) => void;
  onSubmitSection: () => void;
}

export const ExamMode: React.FC<ExamModeProps> = ({
  questions,
  sets,
  sectionTitle,
  sectionId,
  language,
  token,
  savedResponses,
  isTimeExpired,
  canUseBuffer,
  bufferAvailableSeconds,
  onUseBuffer,
  onSaveAnswer,
  onSubmitSection,
}) => {
  const t = translations[language];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showBufferModal, setShowBufferModal] = useState(false);
  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);

  const currentQuestion = questions[currentIndex] || questions[0];
  const qId = currentQuestion?.id;

  // Local state for active question
  const [selectedOpt, setSelectedOpt] = useState<any>(null);
  const [confidence, setConfidence] = useState<ConfidenceTag | null>(null);
  const [markedForReview, setMarkedForReview] = useState<boolean>(false);
  const [chosenChoiceIndex, setChosenChoiceIndex] = useState<number | undefined>(undefined);
  const [writingText, setWritingText] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [pasteCount, setPasteCount] = useState<number>(0);
  const [editTimeline, setEditTimeline] = useState<Array<{ ts: string; length: number }>>([]);

  const textDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Time tracking: visible time per question, pausing on tab blur/window blur/hidden
  const timeSpentMapRef = useRef<Record<string, number>>({});
  const activeStartTimeRef = useRef<number | null>(Date.now());
  const isTabVisibleRef = useRef<boolean>(true);

  // Sync saved timeSpentSeconds from savedResponses
  useEffect(() => {
    Object.entries(savedResponses).forEach(([id, r]) => {
      if (
        r?.timeSpentSeconds &&
        (timeSpentMapRef.current[id] === undefined || timeSpentMapRef.current[id] < r.timeSpentSeconds)
      ) {
        timeSpentMapRef.current[id] = r.timeSpentSeconds;
      }
    });
  }, [savedResponses]);

  // Flush active time for a question
  const flushActiveTime = useCallback(
    (targetQuestionId?: string) => {
      const q = targetQuestionId || currentQuestion?.id;
      if (!q) return 0;
      if (isTabVisibleRef.current && activeStartTimeRef.current !== null) {
        const now = Date.now();
        const elapsedSec = Math.max(0, Math.floor((now - activeStartTimeRef.current) / 1000));
        if (elapsedSec > 0) {
          timeSpentMapRef.current[q] = (timeSpentMapRef.current[q] || 0) + elapsedSec;
          activeStartTimeRef.current = now;
        }
      }
      return timeSpentMapRef.current[q] || 0;
    },
    [currentQuestion?.id]
  );

  // Listen to tab blur, window blur, and visibility change
  useEffect(() => {
    const handleBlur = () => {
      flushActiveTime();
      isTabVisibleRef.current = false;
      activeStartTimeRef.current = null;
    };
    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        isTabVisibleRef.current = true;
        activeStartTimeRef.current = Date.now();
      }
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        flushActiveTime();
        isTabVisibleRef.current = false;
        activeStartTimeRef.current = null;
      } else {
        isTabVisibleRef.current = true;
        activeStartTimeRef.current = Date.now();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      flushActiveTime();
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [flushActiveTime]);

  // Periodic heartbeat flush and persist if answered
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentQuestion) return;
      const totalTime = flushActiveTime();
      const hasAnswer =
        selectedOpt !== null && selectedOpt !== undefined && selectedOpt !== ''
          ? true
          : writingText !== '';
      if (hasAnswer) {
        onSaveAnswer(currentQuestion.id, selectedOpt || writingText, {
          confidence,
          markedForReview,
          skipped: false,
          choiceIndex: chosenChoiceIndex,
          timeSpentSeconds: totalTime,
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [
    currentQuestion,
    selectedOpt,
    writingText,
    confidence,
    markedForReview,
    chosenChoiceIndex,
    flushActiveTime,
    onSaveAnswer,
  ]);

  // Load existing answer for current question
  useEffect(() => {
    if (!currentQuestion) return;
    const resp = savedResponses[currentQuestion.id];
    if (resp) {
      setSelectedOpt(resp.selected ?? null);
      setConfidence(resp.confidence ?? null);
      setMarkedForReview(!!resp.markedForReview);
      setChosenChoiceIndex(resp.choiceIndex ?? undefined);
      if (typeof resp.selected === 'string') {
        setWritingText(resp.selected);
        const words = resp.selected.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
      } else {
        setWritingText('');
        setWordCount(0);
      }
      if (resp.writingStats) {
        setPasteCount(resp.writingStats.pasteCount || 0);
        setEditTimeline(resp.writingStats.editTimeline || []);
      }
    } else {
      setSelectedOpt(null);
      setConfidence(null);
      setMarkedForReview(false);
      setChosenChoiceIndex(undefined);
      setWritingText('');
      setWordCount(0);
      setPasteCount(0);
      setEditTimeline([]);
    }
  }, [currentIndex, currentQuestion, savedResponses]);

  // When time expires, trigger review or buffer prompt
  useEffect(() => {
    if (isTimeExpired) {
      if (canUseBuffer && bufferAvailableSeconds > 0) {
        setShowBufferModal(true);
      } else {
        setShowReviewModal(true);
      }
    }
  }, [isTimeExpired, canUseBuffer, bufferAvailableSeconds]);

  // Switch questions with time saving
  const switchQuestion = useCallback(
    (newIdx: number) => {
      if (newIdx === currentIndex || newIdx < 0 || newIdx >= questions.length) return;
      const currentQ = questions[currentIndex];
      if (currentQ) {
        const totalTime = flushActiveTime(currentQ.id);
        const resp = savedResponses[currentQ.id];
        const hasAnswer =
          (selectedOpt !== null && selectedOpt !== undefined && selectedOpt !== '') ||
          writingText !== '' ||
          (resp && resp.selected !== null && resp.selected !== undefined && resp.selected !== '');
        const valToSave =
          selectedOpt !== null && selectedOpt !== undefined
            ? selectedOpt
            : writingText !== ''
            ? writingText
            : resp?.selected ?? null;

        onSaveAnswer(currentQ.id, valToSave, {
          confidence: hasAnswer ? confidence : null,
          markedForReview,
          skipped: !hasAnswer,
          choiceIndex: chosenChoiceIndex,
          timeSpentSeconds: totalTime,
        });
      }
      activeStartTimeRef.current = Date.now();
      setCurrentIndex(newIdx);
    },
    [
      currentIndex,
      questions,
      flushActiveTime,
      savedResponses,
      selectedOpt,
      writingText,
      confidence,
      markedForReview,
      chosenChoiceIndex,
      onSaveAnswer,
    ]
  );

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      switchQuestion(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      switchQuestion(currentIndex - 1);
    }
  };

  // Keyboard shortcuts handler (1-5 for options, N for Next, P for Previous, M for Mark)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleReview();
      } else if (['1', '2', '3', '4', '5'].includes(e.key) && currentQuestion.type === 'mcq') {
        const idx = parseInt(e.key, 10) - 1;
        const opts = currentQuestion.opts || [];
        if (idx < opts.length) {
          const letter = String.fromCharCode(65 + idx);
          handleSelectOption(letter);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleSelectOption = (letter: string) => {
    setSelectedOpt(letter);
    const totalTime = flushActiveTime();
    onSaveAnswer(currentQuestion.id, letter, {
      confidence,
      markedForReview,
      skipped: false,
      timeSpentSeconds: totalTime,
    });
  };

  const handleToggleConfidence = (tag: ConfidenceTag) => {
    // Confidence must default to empty, never "Maybe". Skipped questions must have no confidence.
    if (!selectedOpt && !writingText && !savedResponses[currentQuestion.id]?.selected) {
      return;
    }
    const newTag = confidence === tag ? null : tag;
    setConfidence(newTag);
    const totalTime = flushActiveTime();
    onSaveAnswer(currentQuestion.id, selectedOpt, {
      confidence: newTag,
      markedForReview,
      skipped: false,
      timeSpentSeconds: totalTime,
    });
  };

  const handleToggleReview = () => {
    const nextVal = !markedForReview;
    setMarkedForReview(nextVal);
    const totalTime = flushActiveTime();
    const hasAnswer = selectedOpt !== null || writingText !== '';
    onSaveAnswer(currentQuestion.id, selectedOpt || writingText || null, {
      confidence: hasAnswer ? confidence : null,
      markedForReview: nextVal,
      skipped: !hasAnswer,
      choiceIndex: chosenChoiceIndex,
      timeSpentSeconds: totalTime,
    });
  };

  const handleClear = () => {
    setSelectedOpt(null);
    setConfidence(null);
    setWritingText('');
    setChosenChoiceIndex(undefined);
    const totalTime = flushActiveTime();
    onSaveAnswer(currentQuestion.id, null, {
      confidence: null,
      markedForReview,
      skipped: true,
      choiceIndex: undefined,
      timeSpentSeconds: totalTime,
    });
  };

  // Writing text change handler
  const handleWritingChange = (text: string) => {
    setWritingText(text);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);

    const newTimeline = [...editTimeline, { ts: new Date().toISOString(), length: text.length }].slice(-50);
    setEditTimeline(newTimeline);

    if (textDebounceRef.current) clearTimeout(textDebounceRef.current);
    textDebounceRef.current = setTimeout(() => {
      const totalTime = flushActiveTime();
      onSaveAnswer(currentQuestion.id, text, {
        choiceIndex: chosenChoiceIndex,
        markedForReview,
        skipped: !text,
        timeSpentSeconds: totalTime,
        writingStats: {
          wordCount: words,
          pasteCount,
          editTimeline: newTimeline,
        },
      });
    }, 2000);
  };

  // Track paste events without blocking
  const handlePaste = () => {
    const newPasteCount = pasteCount + 1;
    setPasteCount(newPasteCount);
  };

  // Associated Set details (Passage, Table, Puzzle)
  const currentSetData = currentQuestion.set ? sets[currentQuestion.set] : null;

  // Question counts for review modal
  const attemptedCount = questions.filter(
    (q) => savedResponses[q.id]?.selected !== undefined && savedResponses[q.id]?.selected !== null && savedResponses[q.id]?.selected !== ''
  ).length;
  const markedCount = questions.filter((q) => savedResponses[q.id]?.markedForReview).length;
  const unattemptedCount = questions.length - attemptedCount;

  const stemText =
    language === 'hi' && currentQuestion.stem_hi ? currentQuestion.stem_hi : currentQuestion.stem;

  const optsList =
    language === 'hi' && currentQuestion.opts_hi ? currentQuestion.opts_hi : currentQuestion.opts || [];

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Marking Banner & Action bar */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200">{t.markingScheme}</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Diagnostic evaluation</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMobilePaletteOpen(!isMobilePaletteOpen)}
            className="md:hidden px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 font-semibold text-[11px] text-slate-700 dark:text-slate-300"
          >
            {t.paletteTitle} ({currentIndex + 1}/{questions.length})
          </button>

          <button
            onClick={() => setShowReviewModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <span>{t.submitSection}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main CBT Workspace: Split Screen on desktop if set passage exists */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Main Column: Question & Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Passage / Table / Puzzle Column (if question belongs to a set) */}
          {currentSetData ? (
            <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-6 overflow-y-auto">
              <div className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                {currentSetData.table ? <TableIcon className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                <span>
                  {currentSetData.title || currentSetData.table?.title || `Reference Material (${currentQuestion.set})`}
                </span>
              </div>

              {/* Table Data */}
              {currentSetData.table && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 my-3">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                        {currentSetData.table.headers.map((h: string, idx: number) => (
                          <th key={idx} className="p-2.5 border-b border-slate-200 dark:border-slate-700">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSetData.table.rows.map((row: any[], rIdx: number) => (
                        <tr
                          key={rIdx}
                          className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          {row.map((cell: any, cIdx: number) => (
                            <td key={cIdx} className="p-2.5 font-mono text-slate-700 dark:text-slate-300">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Passage Text */}
              {currentSetData.text && (
                <div className="text-sm md:text-base leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line font-serif">
                  {currentSetData.text}
                </div>
              )}
            </div>
          ) : null}

          {/* Question & Input Controls Column */}
          <div
            className={`flex-1 flex flex-col overflow-y-auto p-5 md:p-8 bg-slate-50 dark:bg-slate-950 ${
              currentSetData ? 'md:w-1/2' : 'max-w-4xl mx-auto w-full'
            }`}
          >
            {/* Question Header & ID */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                  Q{currentIndex + 1}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {currentQuestion.id} • {currentQuestion.topic || 'General'}
                </span>
              </div>

              {/* Keyboard shortcuts reminder */}
              <div className="hidden lg:flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                <span>[1-5] Choose</span>
                <span>[N] Next</span>
                <span>[P] Prev</span>
                <span>[M] Mark</span>
              </div>
            </div>

            {/* Question Stem */}
            <div className="text-base md:text-lg font-medium text-slate-900 dark:text-white leading-relaxed mb-6 whitespace-pre-line">
              {stemText}
            </div>

            {/* Reference passage for Précis (W2) */}
            {currentQuestion.passage && (
              <div className="mb-6 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs md:text-sm font-serif leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-line max-h-60 overflow-y-auto">
                <span className="block font-sans font-bold text-xs uppercase tracking-wider text-blue-600 mb-2">
                  Passage for Précis:
                </span>
                {currentQuestion.passage}
              </div>
            )}

            {/* 1. MCQ OPTIONS */}
            {currentQuestion.type === 'mcq' && (
              <div className="space-y-3 mb-6">
                {optsList.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = selectedOpt === letter;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full p-4 rounded-xl border text-left text-sm md:text-base font-medium flex items-center space-x-3.5 transition-all transform active:scale-[0.99] ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-600 text-blue-950 dark:text-blue-50 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="flex-1 leading-snug">{opt}</span>
                    </button>
                  );
                })}

                {/* Optional Confidence Tag Row (One Tap: Sure, Maybe, Guess) */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {t.confidenceTitle}
                    </span>
                    <div className="flex items-center space-x-2">
                      {(['Sure', 'Maybe', 'Guess'] as ConfidenceTag[]).map((tag) => {
                        const isChosen = confidence === tag;
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleToggleConfidence(tag)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isChosen
                                ? tag === 'Sure'
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                  : tag === 'Maybe'
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                  : 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                            }`}
                          >
                            {tag === 'Sure' ? t.sure : tag === 'Maybe' ? t.maybe : t.guess}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CHOOSE ONE LONG TEXT (e.g. C2 ESI Descriptive, C3 FS1, C4 Essay) */}
            {currentQuestion.type === 'choose_one_long_text' && (
              <div className="space-y-4 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {t.selectPrompt}
                </span>
                <div className="space-y-2">
                  {currentQuestion.choices?.map((ch, idx) => {
                    const isPicked = chosenChoiceIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setChosenChoiceIndex(idx);
                          const totalTime = flushActiveTime();
                          onSaveAnswer(currentQuestion.id, writingText, {
                            choiceIndex: idx,
                            markedForReview,
                            timeSpentSeconds: totalTime,
                          });
                        }}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs md:text-sm font-medium transition-all flex items-start space-x-3 ${
                          isPicked
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-100 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full border border-blue-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                          {isPicked ? '✓' : idx + 1}
                        </span>
                        <span className="flex-1 leading-snug">{ch}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                    <span>Write your response below:</span>
                    <span>
                      Words: <strong className="text-slate-800 dark:text-slate-200">{wordCount}</strong>
                      {currentQuestion.word_limit && (
                        <span className="ml-1 opacity-80">
                          (target: {currentQuestion.word_limit[0]}–{currentQuestion.word_limit[1]} words)
                        </span>
                      )}
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    spellCheck={false}
                    onPaste={handlePaste}
                    value={writingText}
                    onChange={(e) => handleWritingChange(e.target.value)}
                    placeholder={t.writePlaceholder}
                    className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                </div>
              </div>
            )}

            {/* 3. LONG TEXT / ESSAY / CASE ANALYSIS */}
            {(currentQuestion.type === 'long_text' ||
              currentQuestion.type === 'long_answer' ||
              currentQuestion.type === 'essay') && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Type your detailed answer or case analysis below:</span>
                  <span>
                    Words: <strong className="text-slate-800 dark:text-slate-200">{wordCount}</strong>
                    {currentQuestion.word_limit && (
                      <span className="ml-1 opacity-80">
                        (target: {currentQuestion.word_limit[0]}–{currentQuestion.word_limit[1]} words)
                      </span>
                    )}
                  </span>
                </div>
                <textarea
                  rows={12}
                  spellCheck={false}
                  onPaste={handlePaste}
                  value={writingText}
                  onChange={(e) => handleWritingChange(e.target.value)}
                  placeholder={t.writePlaceholder || 'Type your comprehensive answer here...'}
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            )}

            {/* 4. SHORT ANSWER / CONCISE EXPLANATION */}
            {(currentQuestion.type === 'short_answer' ||
              currentQuestion.type === 'short_text' ||
              currentQuestion.type === 'text') && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Type your concise answer below:</span>
                  <span>
                    Words: <strong className="text-slate-800 dark:text-slate-200">{wordCount}</strong>
                    {currentQuestion.word_limit && (
                      <span className="ml-1 opacity-80">
                        (target: {currentQuestion.word_limit[0]}–{currentQuestion.word_limit[1]} words)
                      </span>
                    )}
                  </span>
                </div>
                <textarea
                  rows={5}
                  spellCheck={false}
                  onPaste={handlePaste}
                  value={writingText}
                  onChange={(e) => handleWritingChange(e.target.value)}
                  placeholder="Type your concise answer here..."
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Desktop Rail: Question Palette */}
        <div className="hidden md:flex w-72 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>{t.paletteTitle}</span>
            <span className="text-[11px] font-normal text-slate-500">
              {attemptedCount}/{questions.length} answered
            </span>
          </div>

          {/* Palette Status Legend */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 grid grid-cols-2 gap-1.5 text-[10px] text-slate-500">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>{t.answered}</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span>{t.unanswered}</span>
            </span>
            <span className="flex items-center space-x-1.5 col-span-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>{t.marked}</span>
            </span>
          </div>

          {/* Palette Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const resp = savedResponses[q.id];
                const isAnswered =
                  resp?.selected !== undefined && resp?.selected !== null && resp?.selected !== '';
                const isMarked = !!resp?.markedForReview;
                const isCurrent = currentIndex === idx;

                let btnStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                if (isMarked && isAnswered) {
                  btnStyle = 'bg-purple-600 text-white border-purple-600 ring-2 ring-emerald-400';
                } else if (isMarked) {
                  btnStyle = 'bg-purple-600 text-white border-purple-600';
                } else if (isAnswered) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-600';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => switchQuestion(idx)}
                    className={`h-9 rounded-lg font-bold text-xs border transition-all relative flex items-center justify-center ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-blue-500 scale-105' : 'hover:opacity-80'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && isAnswered && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Question Palette */}
      {isMobilePaletteOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden flex justify-end">
          <div className="w-72 bg-white dark:bg-slate-900 h-full p-4 flex flex-col shadow-xl animate-slide-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-sm text-slate-900 dark:text-white">{t.paletteTitle}</span>
              <button
                onClick={() => setIsMobilePaletteOpen(false)}
                className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="flex-1 py-4 overflow-y-auto grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const resp = savedResponses[q.id];
                const isAnswered =
                  resp?.selected !== undefined && resp?.selected !== null && resp?.selected !== '';
                const isMarked = !!resp?.markedForReview;
                const isCurrent = currentIndex === idx;

                let btnStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
                if (isMarked) btnStyle = 'bg-purple-600 text-white';
                else if (isAnswered) btnStyle = 'bg-emerald-600 text-white';

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      switchQuestion(idx);
                      setIsMobilePaletteOpen(false);
                    }}
                    className={`h-10 rounded-lg font-bold text-xs border ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-blue-500' : ''
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CBT Navigation Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.previous}</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none flex items-center space-x-1"
          >
            <span>{t.next}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.clear}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleReview}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors flex items-center space-x-1.5 ${
              markedForReview
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{markedForReview ? t.unmarkReview : t.markForReview}</span>
          </button>
        </div>
      </div>

      {/* Section Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              {t.reviewTitle}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Review your progress in <strong>{sectionTitle}</strong> before final lock.
            </p>

            <div className="grid grid-cols-3 gap-2.5 text-center mb-6">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 block">
                  {attemptedCount}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-500">
                  {t.attemptedCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-xl font-bold text-slate-700 dark:text-slate-300 block">
                  {unattemptedCount}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-500">
                  {t.unattemptedCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                <span className="text-xl font-bold text-purple-600 dark:text-purple-400 block">
                  {markedCount}
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-500">
                  {t.markedCount}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 mb-6 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{t.reviewWarning}</span>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReviewModal(false);
                  onSubmitSection();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
              >
                {t.confirmSubmit}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 20-Minute Pooled Buffer Modal */}
      {showBufferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm uppercase tracking-wider mb-2">
              <Clock className="w-5 h-5 animate-pulse" />
              <span>Section Time Expired</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Use Pooled Buffer Time?
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              Your scheduled time for <strong>{sectionTitle}</strong> has ended. You have{' '}
              <strong className="text-amber-600 font-bold">
                {Math.floor(bufferAvailableSeconds / 60)} minutes
              </strong>{' '}
              of pooled buffer remaining across the entire assessment.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowBufferModal(false);
                  onUseBuffer();
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
              >
                <Clock className="w-4 h-4" />
                <span>Spend Buffer on {sectionTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBufferModal(false);
                  onSubmitSection();
                }}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Submit Section & Move On
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
