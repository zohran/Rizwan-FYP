import mongoose, { Document, Schema } from 'mongoose';
import { DEFAULT_RATE_PER_MINUTE } from '@/lib/constants';

export interface IBillingRate extends Document {
  ratePerMinute: number;
  updatedBy: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const BillingRateSchema = new Schema<IBillingRate>(
  {
    ratePerMinute: { type: Number, required: true, default: DEFAULT_RATE_PER_MINUTE },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.BillingRate ??
  mongoose.model<IBillingRate>('BillingRate', BillingRateSchema);
