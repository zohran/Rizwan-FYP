import mongoose, { Document, Schema } from 'mongoose';

export interface IAlert extends Document {
  type: string;
  userId?: mongoose.Types.ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const AlertSchema = new Schema<IAlert>(
  {
    type: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Alert ??
  mongoose.model<IAlert>('Alert', AlertSchema);
