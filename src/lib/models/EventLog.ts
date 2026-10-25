import mongoose, { Schema, Model } from 'mongoose';

export interface IEventLog {
  attemptId: string;
  type: string;
  ts: Date;
  payload?: Record<string, any>;
}

const EventLogSchema = new Schema<IEventLog>(
  {
    attemptId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    ts: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const EventLog: Model<IEventLog> =
  mongoose.models.EventLog || mongoose.model<IEventLog>('EventLog', EventLogSchema);
