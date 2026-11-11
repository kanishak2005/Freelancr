import { Schema, model, Document, Types } from "mongoose";

export interface IDispatchAttempt {
  reservationId: string;
  timestamp: Date;
  outcome: "pending" | "sent" | "failed" | "uncertain";
}

export interface IEmailVerification extends Document {
  email: string;
  verificationType: "registration" | "password_reset" | "email_change";
  dispatchStatus: "idle" | "reserved" | "sent" | "failed" | "uncertain";
  dispatchVersion: number;
  reservationId: string | null;
  reservationExpiresAt: Date | null;
  resendAvailableAt: Date | null;
  dispatchAttempts: IDispatchAttempt[];
  otpHash: string | null;
  otpExpiresAt: Date | null;
  attemptsRemaining: number;
  registrationTokenHash: string | null;
  registrationTokenExpiresAt: Date | null;
  documentExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const dispatchAttemptSchema = new Schema<IDispatchAttempt>(
  {
    reservationId: { type: String, required: true },
    timestamp: { type: Date, required: true },
    outcome: {
      type: String,
      enum: ["pending", "sent", "failed", "uncertain"],
      required: true,
    },
  },
  { _id: false }
);

const emailVerificationSchema = new Schema<IEmailVerification>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    verificationType: {
      type: String,
      enum: ["registration", "password_reset", "email_change"],
      default: "registration",
      required: true,
    },
    dispatchStatus: {
      type: String,
      enum: ["idle", "reserved", "sent", "failed", "uncertain"],
      default: "idle",
      required: true,
    },
    dispatchVersion: {
      type: Number,
      default: 0,
      required: true,
    },
    reservationId: {
      type: String,
      default: null,
    },
    reservationExpiresAt: {
      type: Date,
      default: null,
    },
    resendAvailableAt: {
      type: Date,
      default: null,
    },
    dispatchAttempts: {
      type: [dispatchAttemptSchema],
      default: [],
    },
    otpHash: {
      type: String,
      default: null,
      select: false,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    attemptsRemaining: {
      type: Number,
      default: 5,
    },
    registrationTokenHash: {
      type: String,
      default: null,
      select: false,
    },
    registrationTokenExpiresAt: {
      type: Date,
      default: null,
    },
    documentExpiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

emailVerificationSchema.index(
  { email: 1, verificationType: 1 },
  { unique: true }
);

export const EmailVerification = model<IEmailVerification>(
  "EmailVerification",
  emailVerificationSchema
);

