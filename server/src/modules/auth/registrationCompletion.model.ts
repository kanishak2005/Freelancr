import { Schema, model, Document, Types } from "mongoose";

export interface IRegistrationCompletion extends Document {
  registrationTokenHash: string;
  receiptId: string;
  email: string;
  createdUserId: Types.ObjectId;
  expiresAt: Date;
  recoveryVersion: number;
  recoveryReservationId: string | null;
  recoveryLockedUntil: Date | null;
  recoveryAttemptCount: number;
  sessionIssuedAt: Date;
  encryptedRefreshToken: string;
  iv: string;
  authTag: string;
  createdAt: Date;
  updatedAt: Date;
}

const registrationCompletionSchema = new Schema<IRegistrationCompletion>(
  {
    registrationTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    receiptId: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    createdUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    recoveryVersion: {
      type: Number,
      default: 0,
      required: true,
    },
    recoveryReservationId: {
      type: String,
      default: null,
    },
    recoveryLockedUntil: {
      type: Date,
      default: null,
    },
    recoveryAttemptCount: {
      type: Number,
      default: 0,
    },
    sessionIssuedAt: {
      type: Date,
      required: true,
    },
    encryptedRefreshToken: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const RegistrationCompletion = model<IRegistrationCompletion>(
  "RegistrationCompletion",
  registrationCompletionSchema
);
