'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, UploadCloud, CheckCircle, SkipForward } from 'lucide-react';
import { translations, Language } from '@/lib/i18n';

interface AudioRecorderProps {
  token: string;
  itemId: string;
  language: Language;
  hasExistingAudio: boolean;
  onUploaded: (audioId: string) => void;
  onSkip: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  token,
  itemId,
  language,
  hasExistingAudio,
  onUploaded,
  onSkip,
}) => {
  const t = translations[language];
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(hasExistingAudio);
  const [errorMsg, setErrorMsg] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start 90s countdown timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 89) {
            stopRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Mic access error:', err);
      setErrorMsg('Microphone access denied or not available. You can safely skip this optional question.');
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleReset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setUploaded(false);
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `voice-note-${itemId}.webm`);
      formData.append('itemId', itemId);

      const res = await fetch(`/api/attempt/${token}/audio`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload audio');
      }

      setUploaded(true);
      onUploaded(data.audioId);
    } catch (err: any) {
      console.error('Audio upload error:', err);
      setErrorMsg('Failed to upload recording. Please try again or skip.');
    } finally {
      setIsUploading(false);
    }
  };

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 max-w-lg my-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
          <Mic className="w-4 h-4 text-amber-500" />
          <span>{t.recordVoice}</span>
        </span>
        <span className="text-[11px] text-slate-500">{t.maxDurationNote}</span>
      </div>

      {errorMsg && (
        <div className="mb-3 p-3 text-xs bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900">
          {errorMsg}
        </div>
      )}

      {/* Recording State */}
      {isRecording ? (
        <div className="space-y-4 text-center py-4">
          <div className="flex items-center justify-center space-x-3">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatSecs(recordingSeconds)} / 1:30
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-rose-500 h-full transition-all duration-300"
              style={{ width: `${(recordingSeconds / 90) * 100}%` }}
            />
          </div>

          <button
            onClick={stopRecording}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs flex items-center space-x-2 mx-auto shadow-md transition-colors"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>{t.stopRecording}</span>
          </button>
        </div>
      ) : audioUrl ? (
        /* Preview & Upload State */
        <div className="space-y-4 py-2">
          <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {!uploaded ? (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-sm transition-colors disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? 'Uploading...' : 'Save & Attach Recording'}</span>
              </button>
            ) : (
              <div className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center space-x-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>{t.audioRecorded}</span>
              </div>
            )}

            <button
              onClick={handleReset}
              className="py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.reRecord}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Ready to Record State */
        <div className="flex items-center space-x-3 py-3">
          <button
            onClick={startRecording}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all"
          >
            <Mic className="w-4 h-4 text-amber-300" />
            <span>{t.recordVoice} (max 90s)</span>
          </button>

          <button
            onClick={onSkip}
            className="py-3 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition-colors flex items-center space-x-1"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>{t.skip}</span>
          </button>
        </div>
      )}
    </div>
  );
};
