import mongoose, { Schema, Model } from 'mongoose';

export interface IResponse {
  attemptId: string;
  itemId: string;
  partId: string;
  sectionId: string;
  selected?: any;
  reason?: string;
  choiceIndex?: number;
  confidence?: 'Sure' | 'Maybe' | 'Guess';
  timeSpentSeconds: number;
  visits: number;
  changes: Array<{ ts: Date; value: any; confidence?: string }>;
  firstAnswerTs?: Date;
  skipped: boolean;
  markedForReview: boolean;
  writingStats?: {
    wordCount: number;
    pasteCount: number;
    editTimeline: Array<{ ts: Date; length: number }>;
  };
  audioGridFsId?: string;
  lastSavedAt: Date;
  clientEventId?: string;
}

const ResponseSchema = new Schema<IResponse>(
  {
    attemptId: { type: String, required: true, index: true },
    itemId: { type: String, required: true, index: true },
    partId: { type: String, required: true },
    sectionId: { type: String, required: true },
    selected: { type: Schema.Types.Mixed },
    reason: { type: String },
    choiceIndex: { type: Number },
    confidence: { type: String, enum: ['Sure', 'Maybe', 'Guess'] },
    timeSpentSeconds: { type: Number, default: 0 },
    visits: { type: Number, default: 0 },
    changes: [
      {
        ts: { type: Date, default: Date.now },
        value: { type: Schema.Types.Mixed },
        confidence: { type: String },
      },
    ],
    firstAnswerTs: { type: Date },
    skipped: { type: Boolean, default: false },
    markedForReview: { type: Boolean, default: false },
    writingStats: {
      wordCount: { type: Number, default: 0 },
      pasteCount: { type: Number, default: 0 },
      editTimeline: [
        {
          ts: { type: Date, default: Date.now },
          length: { type: Number, default: 0 },
        },
      ],
    },
    audioGridFsId: { type: String },
    lastSavedAt: { type: Date, default: Date.now },
    clientEventId: { type: String },
  },
  { timestamps: true }
);

ResponseSchema.index({ attemptId: 1, itemId: 1 }, { unique: true });

export const ResponseModel: Model<IResponse> =
  mongoose.models.Response || mongoose.model<IResponse>('Response', ResponseSchema);
