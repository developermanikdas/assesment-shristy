import mongoose, { Schema, Model } from 'mongoose';

export interface ISectionTimer {
  sectionId: string;
  startedAt?: Date;
  durationSeconds: number;
  bufferUsedSeconds: number;
  submittedAt?: Date;
  status: 'not_started' | 'active' | 'buffer_active' | 'submitted' | 'locked';
}

export interface IAttempt {
  token: string;
  pinHash?: string;
  nickname: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  currentPartId: string;
  currentSectionId: string;
  startedAt?: Date;
  completedAt?: Date;
  pooledBufferTotalSeconds: number;
  pooledBufferUsedSeconds: number;
  sectionTimers: ISectionTimer[];
  notepad: string;
  language: 'en' | 'hi';
  deviceInfo?: Record<string, any>;
  d01Items?: any[];
  integritySummary?: {
    tabBlurCount: number;
    fullscreenExitCount: number;
    totalTimeUnfocusedSeconds: number;
  };
}

const SectionTimerSchema = new Schema<ISectionTimer>(
  {
    sectionId: { type: String, required: true },
    startedAt: { type: Date },
    durationSeconds: { type: Number, required: true },
    bufferUsedSeconds: { type: Number, default: 0 },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: ['not_started', 'active', 'buffer_active', 'submitted', 'locked'],
      default: 'not_started',
    },
  },
  { _id: false }
);

const AttemptSchema = new Schema<IAttempt>(
  {
    token: { type: String, required: true, unique: true, index: true },
    pinHash: { type: String },
    nickname: { type: String, required: true },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'abandoned'],
      default: 'not_started',
      index: true,
    },
    currentPartId: { type: String, default: 'A' },
    currentSectionId: { type: String, default: 'A' },
    startedAt: { type: Date },
    completedAt: { type: Date },
    pooledBufferTotalSeconds: { type: Number, default: 20 * 60 },
    pooledBufferUsedSeconds: { type: Number, default: 0 },
    sectionTimers: [SectionTimerSchema],
    notepad: { type: String, default: '' },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    deviceInfo: { type: Schema.Types.Mixed },
    d01Items: { type: [Schema.Types.Mixed] },
    integritySummary: {
      tabBlurCount: { type: Number, default: 0 },
      fullscreenExitCount: { type: Number, default: 0 },
      totalTimeUnfocusedSeconds: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const Attempt: Model<IAttempt> =
  mongoose.models.Attempt || mongoose.model<IAttempt>('Attempt', AttemptSchema);
