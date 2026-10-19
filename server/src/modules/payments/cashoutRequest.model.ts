import { Schema, model, Document, Types } from "mongoose";

export type CashoutStatus =
  | "pending_review" // Created by freelancer; awaiting admin inspection
  | "approved"       // Approved in-app (funds reserved/confirmed for processing)
  | "rejected"       // Rejected by admin; funds atomically restored to available balance
  | "cancelled";     // Cancelled by freelancer before review; funds restored to available balance

export interface ICashoutRequest extends Document {
  user: Types.ObjectId;             // Freelancer User ID
  wallet: Types.ObjectId;           // Wallet Document ID
  amountMinor: number;              // Integer paise (e.g. 50000 = ₹500.00)
  currency: string;                 // "INR"
  status: CashoutStatus;            // Lifecycle state
  referenceId: string;              // Unique business reference (e.g. "cashout_<userId>_<ts>")
  beneficiaryNotes?: string;        // Optional user withdrawal note / beneficiary account memo
  rejectionReason?: string;         // Mandatory note if rejected
  reviewedByAdminId?: Types.ObjectId;
  reviewedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cashoutRequestSchema = new Schema<ICashoutRequest>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    amountMinor: {
      type: Number,
      required: true,
      min: 100, // Minimum ₹1.00 (100 paise)
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "cancelled"],
      default: "pending_review",
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    beneficiaryNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    reviewedByAdminId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user query and admin review queues
cashoutRequestSchema.index({ user: 1, createdAt: -1 });
cashoutRequestSchema.index({ status: 1, createdAt: 1 });

export const CashoutRequest = model<ICashoutRequest>(
  "CashoutRequest",
  cashoutRequestSchema
);
