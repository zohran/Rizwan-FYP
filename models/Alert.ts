import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  type: string;
  userId?: mongoose.Types.ObjectId;
  sessionId?: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  severity?: string;
  ruleId?: string;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    type: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session' },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    severity: { type: String },
    ruleId: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Alert ??
  mongoose.model<IAlert>('Alert', AlertSchema);
