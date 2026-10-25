export type ConfidenceTag = 'Sure' | 'Maybe' | 'Guess';
export type DifficultyCode = 'F' | 'S' | 'H';

export type ItemType =
  | 'consent'
  | 'text'
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'select'
  | 'multi'
  | 'scale'
  | 'likert'
  | 'mcq'
  | 'mcq_plus_reason'
  | 'choose_one_long_text'
  | 'reflection_template'
  | 'audio_optional';

export interface SetData {
  id: string;
  title?: string;
  text?: string;
  table?: {
    title?: string;
    headers: string[];
    rows: (string | number)[][];
  };
}

export interface QuestionItem {
  id: string;
  partId?: string;
  sectionId?: string;
  type: ItemType;
  topic?: string;
  diff?: DifficultyCode;
  stem: string;
  stem_hi?: string;
  opts?: string[];
  opts_hi?: string[];
  marks?: number;
  neg?: number;
  t?: number; // expected seconds
  word_limit?: [number, number];
  choices?: string[];
  passage?: string;
  reason_prompt?: string;
  selection_rule?: string;
  count?: number;
  min?: number;
  max?: number;
  tag?: string;
  section?: string; // Part E section name (background, resources, etc.)
  optional?: boolean;
  refresh?: boolean;
  reverse_scored?: boolean;
  required?: boolean;
  set?: string;
  // Note: ans, model_answer, rubric are NOT present in client-facing QuestionItem
}

export interface AnswerKeyItem {
  id: string; // matches question id
  ans?: string;
  model_answer?: string;
  rubric?: Record<string, number>;
}

export interface SectionMeta {
  id: string;
  title: string;
  time_min: number;
  instructions: string;
  items: QuestionItem[];
  sets?: Record<string, any>;
}

export interface PartMeta {
  id: string;
  title: string;
  time_min: number;
  sections: SectionMeta[];
}

export interface SectionTimerState {
  sectionId: string;
  startedAt?: string;
  durationSeconds: number;
  bufferUsedSeconds: number;
  submittedAt?: string;
  status: 'not_started' | 'active' | 'buffer_active' | 'submitted' | 'locked';
}

export interface AttemptState {
  id: string;
  token: string;
  nickname: string;
  hasPin: boolean;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  currentPartId: string;
  currentSectionId: string;
  startedAt?: string;
  completedAt?: string;
  pooledBufferTotalSeconds: number;
  pooledBufferRemainingSeconds: number;
  sectionTimers: Record<string, SectionTimerState>;
  notepad?: string;
  language: 'en' | 'hi';
}

export interface ResponseRecord {
  itemId: string;
  selected?: any;
  reason?: string;
  choiceIndex?: number;
  confidence?: ConfidenceTag | null;
  timeSpentSeconds: number;
  visits: number;
  changes: Array<{ ts: string; value: any; confidence?: string }>;
  firstAnswerTs?: string;
  skipped: boolean;
  markedForReview: boolean;
  writingStats?: {
    wordCount: number;
    pasteCount: number;
    editTimeline: Array<{ ts: string; length: number }>;
  };
  audioGridFsId?: string;
  audioDurationSeconds?: number;
  lastSavedAt: string;
}

export interface EventLogRecord {
  type: string;
  ts: string;
  payload?: Record<string, any>;
}

export interface SectionScoreSummary {
  sectionId: string;
  title: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  skipped: number;
  netScore: number;
  maxScore: number;
  accuracy: number;
  attemptRate: number;
  avgTimePerQuestionSeconds: number;
  avgTimeCorrectSeconds: number;
  avgTimeWrongSeconds: number;
}

export interface TopicBreakdown {
  topic: string;
  n: number;
  attempted: number;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
  band: 'green' | 'amber' | 'red';
  label: string;
  isLowData?: boolean;
}

export interface DifficultyBreakdown {
  diff: DifficultyCode;
  diffLabel: string;
  attempted: number;
  correct: number;
  wrong: number;
  total: number;
  accuracy: number;
  band: 'green' | 'amber' | 'red';
}

export interface ConfidenceMatrix {
  Sure: { correct: number; wrong: number; total: number; accuracy: number };
  Maybe: { correct: number; wrong: number; total: number; accuracy: number };
  Guess: { correct: number; wrong: number; total: number; accuracy: number };
  Untagged: { correct: number; wrong: number; total: number; accuracy: number };
}

export interface StaminaWindow {
  windowIndex: number;
  label: string; // e.g. "0-30 min"
  questionsAnswered: number;
  correct: number;
  accuracy: number;
  avgSecondsPerQuestion: number;
}

export interface SelfRatingCorrelation {
  itemId: string;
  subject: string;
  selfRating: number; // 1-5
  actualAccuracy: number; // 0-100%
  calibration: 'well-calibrated' | 'overconfident' | 'underconfident';
}
