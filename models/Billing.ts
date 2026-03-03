import mongoose, { Document, Schema } from 'mongoose';

export interface IBilling extends Document {
  sessionId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ratePerMinute: number;
  totalMinutes: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const BillingSchema = new Schema<IBilling>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ratePerMinute: { type: Number, required: true },
    totalMinutes: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Billing ??
  mongoose.model<IBilling>('Billing', BillingSchema);
