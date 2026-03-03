import mongoose, { Document, Schema } from 'mongoose';

export interface ILog extends Document {
  userId: mongoose.Types.ObjectId;
  loginTime: Date;
  logoutTime: Date;
  duration: number;
  machineId: string;
  billingAmount: number;
  /** Base64 data URL of login capture, copied from Session */
  imageUrl: string;
  eventType: string;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date, required: true },
    duration: { type: Number, required: true },
    machineId: { type: String, required: true },
    billingAmount: { type: Number, default: 0 },
    imageUrl: { type: String, default: '' },
    eventType: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Log ?? mongoose.model<ILog>('Log', LogSchema);
