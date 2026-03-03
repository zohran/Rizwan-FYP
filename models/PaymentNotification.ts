import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentNotification extends Document {
  userId: mongoose.Types.ObjectId;
  billingId?: mongoose.Types.ObjectId;
  amount: number;
  message: string;
  type: 'session' | 'all';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentNotificationSchema = new Schema<IPaymentNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    billingId: { type: Schema.Types.ObjectId, ref: 'Billing' },
    amount: { type: Number, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['session', 'all'], required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentNotification ??
  mongoose.model<IPaymentNotification>('PaymentNotification', PaymentNotificationSchema);
