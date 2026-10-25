import mongoose, { Schema, Model } from 'mongoose';

export interface ISet {
  id: string;
  title?: string;
  text?: string;
  table?: {
    title?: string;
    headers: string[];
    rows: (string | number)[][];
  };
}

const SetSchema = new Schema<ISet>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String },
    text: { type: String },
    table: {
      title: { type: String },
      headers: [{ type: String }],
      rows: [[Schema.Types.Mixed]],
    },
  },
  { timestamps: true }
);

export const SetModel: Model<ISet> =
  mongoose.models.Set || mongoose.model<ISet>('Set', SetSchema);
