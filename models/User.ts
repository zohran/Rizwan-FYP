import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'client';

export interface IUser extends Document {
  username: string;
  password: string;
  role: UserRole;
  isBlocked: boolean;
  failedAttempts: number;
  blockUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'client'], required: true },
    isBlocked: { type: Boolean, default: false },
    failedAttempts: { type: Number, default: 0 },
    blockUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
