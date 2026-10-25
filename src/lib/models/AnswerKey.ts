import mongoose, { Schema, Model } from 'mongoose';

export interface IAnswerKey {
  id: string; // Question ID
  ans?: string;
  model_answer?: string;
  rubric?: Record<string, number>;
}

const AnswerKeySchema = new Schema<IAnswerKey>(
  {
    id: { type: String, required: true, unique: true, index: true },
    ans: { type: String },
    model_answer: { type: String },
    rubric: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'answer_keys' }
);

export const AnswerKey: Model<IAnswerKey> =
  mongoose.models.AnswerKey || mongoose.model<IAnswerKey>('AnswerKey', AnswerKeySchema);
