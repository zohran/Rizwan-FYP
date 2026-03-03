import mongoose, { Document, Schema } from 'mongoose';

export type SessionStatus = 'active' | 'ended' | 'terminated';

export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  machineId: string;
  imageUrl: string;
  startTime: Date;
  endTime: Date;
  selectedDuration: number;
  remainingTime: number;
  status: SessionStatus;
  billingAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    machineId: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    selectedDuration: { type: Number, required: true },
    remainingTime: { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'ended', 'terminated'],
      default: 'active',
    },
    billingAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Session ??
  mongoose.model<ISession>('Session', SessionSchema);
