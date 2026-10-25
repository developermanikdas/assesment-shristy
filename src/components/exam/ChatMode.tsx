'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle,
  HelpCircle,
  Bot,
  User,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { QuestionItem, ConfidenceTag } from '@/types';
import { translations, Language } from '@/lib/i18n';
import { AudioRecorder } from './AudioRecorder';

interface ChatModeProps {
  questions: QuestionItem[];
  partTitle: string;
  partId: string;
  language: Language;
  token: string;
  savedResponses: Record<string, any>;
  onSaveAnswer: (
    itemId: string,
    value: any,
    extra?: {
      reason?: string;
      choiceIndex?: number;
      skipped?: boolean;
      timeSpentSeconds?: number;
      confidence?: ConfidenceTag | null;
    }
  ) => void;
  onPartComplete: () => void;
}

export const ChatMode: React.FC<ChatModeProps> = ({
  questions,
  partTitle,
  partId,
  language,
  token,
  savedResponses,
  onSaveAnswer,
  onPartComplete,
}) => {
  const t = translations[language];
  const [currentIndex, setCurrentIndex] = useState(0);

  // Local answer states for active question
  const currentQuestion = questions[currentIndex] || questions[0];
  const qId = currentQuestion?.id;

  const [currentVal, setCurrentVal] = useState<any>(null);
  const [currentReason, setCurrentReason] = useState<string>('');
  const [currentChoiceIndex, setCurrentChoiceIndex] = useState<number | undefined>(undefined);
  const [wordCount, setWordCount] = useState<number>(0);

  // Time tracking: visible time per question, pausing on tab blur/window blur/hidden
  const timeSpentMapRef = React.useRef<Record<string, number>>({});
  const activeStartTimeRef = React.useRef<number | null>(Date.now());
  const isTabVisibleRef = React.useRef<boolean>(true);

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
  const flushActiveTime = React.useCallback(
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

  // Sync state when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    const existing = savedResponses[currentQuestion.id];
    if (existing) {
      setCurrentVal(existing.selected ?? null);
      setCurrentReason(existing.reason ?? '');
      setCurrentChoiceIndex(existing.choiceIndex ?? undefined);
      if (typeof existing.selected === 'string') {
        const words = existing.selected.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
      }
    } else {
      if (currentQuestion.type === 'multi') {
        setCurrentVal([]);
      } else {
        setCurrentVal(null);
      }
      setCurrentReason('');
      setCurrentChoiceIndex(undefined);
      setWordCount(0);
    }
  }, [currentIndex, currentQuestion, savedResponses]);

  if (!currentQuestion) {
    return <div className="p-8 text-center text-slate-500">Loading section questions...</div>;
  }

  const stemText =
    language === 'hi' && currentQuestion.stem_hi ? currentQuestion.stem_hi : currentQuestion.stem;

  const optsList =
    language === 'hi' && currentQuestion.opts_hi ? currentQuestion.opts_hi : currentQuestion.opts || [];

  const handleNext = () => {
    // Save answer with accumulated visible time
    const totalTime = flushActiveTime();
    onSaveAnswer(currentQuestion.id, currentVal, {
      reason: currentReason || undefined,
      choiceIndex: currentChoiceIndex,
      skipped: false,
      timeSpentSeconds: totalTime,
    });

    if (currentIndex < questions.length - 1) {
      activeStartTimeRef.current = Date.now();
      setCurrentIndex(currentIndex + 1);
    } else {
      onPartComplete();
    }
  };

  const handleBack = () => {
    flushActiveTime();
    if (currentIndex > 0) {
      activeStartTimeRef.current = Date.now();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    const totalTime = flushActiveTime();
    onSaveAnswer(currentQuestion.id, null, {
      skipped: true,
      timeSpentSeconds: totalTime,
      confidence: null,
    });
    if (currentIndex < questions.length - 1) {
      activeStartTimeRef.current = Date.now();
      setCurrentIndex(currentIndex + 1);
    } else {
      onPartComplete();
    }
  };

  const isOptional = currentQuestion.optional || (!currentQuestion.required && currentQuestion.type !== 'consent');
  const progressPercent = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      {/* Progress Bar & Counter */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
          <span>
            {partTitle} • Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="font-mono">{progressPercent}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Conversational Stream */}
      <div className="space-y-6">
        {/* Mentor Bubble */}
        <div className="flex items-start space-x-3.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-900 text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm mt-0.5">
            RBI
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm p-5 md:p-6 shadow-sm max-w-2xl">
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Question {currentQuestion.id}</span>
              {currentQuestion.section && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 lowercase">
                  #{currentQuestion.section}
                </span>
              )}
            </div>

            <p className="text-base md:text-lg font-medium text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
              {stemText}
            </p>

            {/* Model answer or error prompt if spot-the-error */}
            {currentQuestion.topic === 'spot-the-error' && (
              <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-medium">
                Identify the error and write the correct calculation or logic below.
              </span>
            )}
          </div>
        </div>

        {/* Candidate Response Area (Inline Controls) */}
        <div className="flex items-start justify-end space-x-3.5 pl-6 md:pl-12">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-4">
              Your Response
            </span>

            {/* 1. CONSENT TYPE */}
            {currentQuestion.type === 'consent' && (
              <label className="flex items-start space-x-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:border-blue-500 transition-colors">
                <input
                  type="checkbox"
                  checked={currentVal === true}
                  onChange={(e) => setCurrentVal(e.target.checked)}
                  className="w-5 h-5 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                  I understand and give my informed consent to proceed with this diagnostic baseline assessment.
                </span>
              </label>
            )}

            {/* 2. SELECT (Single choice chips) */}
            {currentQuestion.type === 'select' && (
              <div className="flex flex-wrap gap-2.5">
                {optsList.map((opt, i) => {
                  const isSelected = currentVal === opt;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentVal(opt)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all text-left flex items-center space-x-2 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4 text-white" /> : null}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. MULTI (Multiple choice chips/checkboxes) */}
            {currentQuestion.type === 'multi' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {optsList.map((opt, i) => {
                  const arr = Array.isArray(currentVal) ? currentVal : [];
                  const isSelected = arr.includes(opt);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const newArr = isSelected ? arr.filter((x: string) => x !== opt) : [...arr, opt];
                        setCurrentVal(newArr);
                      }}
                      className={`p-3 rounded-xl text-sm font-medium border transition-all text-left flex items-center space-x-2.5 ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-200'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-400 bg-white dark:bg-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="flex-1 text-xs md:text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 4. SCALE (1 to 5 buttons) */}
            {(currentQuestion.type === 'scale' || currentQuestion.type === 'likert') && (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2 md:gap-3">
                  {[1, 2, 3, 4, 5].map((num) => {
                    const isSelected = Number(currentVal) === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCurrentVal(num)}
                        className={`py-3 rounded-xl font-bold text-sm md:text-base border transition-all flex flex-col items-center justify-center space-y-1 ${
                          isSelected
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md transform scale-[1.02]'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span>{num}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 px-1">
                  <span>1 ({currentQuestion.type === 'likert' ? 'Strongly Disagree' : 'Beginner / Low'})</span>
                  <span>5 ({currentQuestion.type === 'likert' ? 'Strongly Agree' : 'Confident / High'})</span>
                </div>
              </div>
            )}

            {/* 5. TEXT / SHORT TEXT */}
            {(currentQuestion.type === 'text' || currentQuestion.type === 'short_text') && (
              <input
                type="text"
                value={currentVal || ''}
                onChange={(e) => setCurrentVal(e.target.value)}
                placeholder={t.chatInputPlaceholder}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            )}

            {/* 6. NUMBER */}
            {currentQuestion.type === 'number' && (
              <input
                type="number"
                value={currentVal !== null && currentVal !== undefined ? currentVal : ''}
                onChange={(e) => setCurrentVal(e.target.value === '' ? null : Number(e.target.value))}
                placeholder="Enter numerical value..."
                className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            )}

            {/* 7. LONG TEXT (with word counter) */}
            {currentQuestion.type === 'long_text' && (
              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={currentVal || ''}
                  onChange={(e) => {
                    const text = e.target.value;
                    setCurrentVal(text);
                    const words = text.trim().split(/\s+/).filter(Boolean).length;
                    setWordCount(words);
                  }}
                  placeholder={t.writePlaceholder}
                  className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Word count: <strong className="text-slate-800 dark:text-slate-200">{wordCount}</strong>
                    {currentQuestion.word_limit && (
                      <span className="ml-1 opacity-75">
                        (target: {currentQuestion.word_limit[0]}–{currentQuestion.word_limit[1]} words)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* 8. MCQ PLUS REASON (e.g. D07, D08 Situational Judgement) */}
            {currentQuestion.type === 'mcq_plus_reason' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500">Select one option:</span>
                  {optsList.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = currentVal === letter;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentVal(letter)}
                        className={`w-full p-3 rounded-xl text-left border text-sm font-medium flex items-center space-x-3 transition-colors ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-600 text-blue-900 dark:text-blue-100'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {letter}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-semibold text-slate-500">
                    {currentQuestion.reason_prompt || 'In 1–2 lines, explain why:'}
                  </span>
                  <input
                    type="text"
                    value={currentReason}
                    onChange={(e) => setCurrentReason(e.target.value)}
                    placeholder="Briefly state your reasoning..."
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* 9. AUDIO OPTIONAL (Voice recorder for D09) */}
            {currentQuestion.type === 'audio_optional' && (
              <AudioRecorder
                token={token}
                itemId={currentQuestion.id}
                language={language}
                hasExistingAudio={!!savedResponses[currentQuestion.id]?.hasAudio}
                onUploaded={(audioId) => {
                  setCurrentVal('[Audio Uploaded]');
                  const totalTime = flushActiveTime();
                  onSaveAnswer(currentQuestion.id, '[Audio Uploaded]', {
                    skipped: false,
                    timeSpentSeconds: totalTime,
                  });
                  if (currentIndex < questions.length - 1) {
                    activeStartTimeRef.current = Date.now();
                    setCurrentIndex(currentIndex + 1);
                  } else {
                    onPartComplete();
                  }
                }}
                onSkip={handleSkip}
              />
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentIndex === 0}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t.back}</span>
              </button>

              <div className="flex items-center space-x-2.5">
                {isOptional && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    {t.skip}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={currentQuestion.type === 'consent' && currentVal !== true}
                  className="px-5 py-2.5 text-xs md:text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white shadow-sm flex items-center space-x-1.5 transition-all disabled:opacity-50"
                >
                  <span>
                    {currentIndex === questions.length - 1 ? 'Complete Section' : t.saveAndContinue}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
