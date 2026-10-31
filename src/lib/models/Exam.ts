import mongoose, { Schema, Model } from 'mongoose';

export interface IExamItem {
  id: string;
  type: 'mcq' | 'short_answer' | 'short_text' | 'long_answer' | 'long_text' | 'essay' | 'choose_one_long_text' | string;
  topic?: string;
  stem: string;
  stem_hi?: string;
  opts?: string[];
  opts_hi?: string[];
  ans?: string;
  explanation?: string;
  marks?: number;
  neg?: number;
  expected_seconds?: number;
  word_limit?: [number, number];
  model_answer?: string;
  rubric?: Record<string, number>;
  passage?: string;
  choices?: string[];
  sectionId?: string;
  partId?: string;
}

export interface IExamSection {
  id: string;
  title: string;
  description?: string;
  timeMinutes: number;
  items: IExamItem[];
}

export interface IExam {
  examId: string;
  title: string;
  subject?: string;
  version?: string;
  instructions?: string;
  durationMinutes: number;
  totalMarks: number;
  negativeMarking?: number;
  confidenceTracking?: boolean;
  confidenceTags?: string[];
  isDemo?: boolean;
  sections: IExamSection[];
  createdAt: Date;
  updatedAt: Date;
}

const ExamItemSchema = new Schema<IExamItem>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true },
    topic: { type: String },
    stem: { type: String, required: true },
    stem_hi: { type: String },
    opts: [{ type: String }],
    opts_hi: [{ type: String }],
    ans: { type: String },
    explanation: { type: String },
    marks: { type: Number, default: 1 },
    neg: { type: Number, default: 0 },
    expected_seconds: { type: Number },
    word_limit: [{ type: Number }],
    model_answer: { type: String },
    rubric: { type: Schema.Types.Mixed },
    passage: { type: String },
    choices: [{ type: String }],
    sectionId: { type: String },
    partId: { type: String },
  },
  { _id: false }
);

const ExamSectionSchema = new Schema<IExamSection>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    timeMinutes: { type: Number, required: true },
    items: [ExamItemSchema],
  },
  { _id: false }
);

const ExamSchema = new Schema<IExam>(
  {
    examId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    subject: { type: String },
    version: { type: String, default: '1.0' },
    instructions: { type: String },
    durationMinutes: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    negativeMarking: { type: Number, default: 0 },
    confidenceTracking: { type: Boolean, default: true },
    confidenceTags: [{ type: String }],
    isDemo: { type: Boolean, default: false, index: true },
    sections: [ExamSectionSchema],
  },
  { timestamps: true }
);

export const Exam: Model<IExam> =
  mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema);

