'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, FileEdit, Trash2 } from 'lucide-react';
import { translations, Language } from '@/lib/i18n';

interface NotepadModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  initialContent: string;
  language: Language;
  onNotepadChange: (content: string) => void;
}

export const NotepadModal: React.FC<NotepadModalProps> = ({
  isOpen,
  onClose,
  token,
  initialContent,
  language,
  onNotepadChange,
}) => {
  const t = translations[language];
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    onNotepadChange(val);
    setSaveStatus('saving');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/attempt/${token}/notepad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notepad: val }),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Notepad autosave failed:', err);
      }
    }, 1500);
  };

  const handleClear = () => {
    if (confirm('Clear rough work notes?')) {
      setContent('');
      onNotepadChange('');
      fetch(`/api/attempt/${token}/notepad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notepad: '' }),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col h-[75vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2">
            <FileEdit className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              {t.notepadTitle}
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              ({saveStatus === 'saved' ? 'Saved' : 'Saving...'})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleClear}
              title="Clear notepad"
              className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Text Area for Calculations & Notes */}
        <div className="flex-1 p-4 flex flex-col">
          <textarea
            value={content}
            onChange={handleChange}
            placeholder={t.notepadPlaceholder}
            className="flex-1 w-full p-4 font-mono text-xs md:text-sm leading-relaxed rounded-xl border border-slate-200 dark:border-slate-800 bg-amber-50/20 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs text-slate-500">
          <span>Saved with your attempt automatically</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
