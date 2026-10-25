import mongoose, { Schema, Model } from 'mongoose';

export interface IQuestion {
  id: string;
  partId: string;
  sectionId: string;
  type: string;
  topic?: string;
  diff?: string;
  stem: string;
  stem_hi?: string;
  opts?: string[];
  opts_hi?: string[];
  marks?: number;
  neg?: number;
  t?: number;
  word_limit?: [number, number];
  choices?: string[];
  passage?: string;
  reason_prompt?: string;
  selection_rule?: string;
  count?: number;
  min?: number;
  max?: number;
  tag?: string;
  section?: string;
  optional?: boolean;
  refresh?: boolean;
  reverse_scored?: boolean;
  required?: boolean;
  set?: string;
  order: number;
}

const QuestionSchema = new Schema<IQuestion>(
  {
    id: { type: String, required: true, unique: true, index: true },
    partId: { type: String, required: true, index: true },
    sectionId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    topic: { type: String },
    diff: { type: String },
    stem: { type: String, required: true },
    stem_hi: { type: String },
    opts: [{ type: String }],
    opts_hi: [{ type: String }],
    marks: { type: Number },
    neg: { type: Number },
    t: { type: Number },
    word_limit: [{ type: Number }],
    choices: [{ type: String }],
    passage: { type: String },
    reason_prompt: { type: String },
    selection_rule: { type: String },
    count: { type: Number },
    min: { type: Number },
    max: { type: Number },
    tag: { type: String },
    section: { type: String },
    optional: { type: Boolean, default: false },
    refresh: { type: Boolean, default: false },
    reverse_scored: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    set: { type: String },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
