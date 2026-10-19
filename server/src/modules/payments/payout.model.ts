import { Schema, model, Document, Types } from "mongoose";

export type PayoutStatus =
  | "not_due"
  | "held"
  | "eligible"
  | "processing"
  | "paid"
  | "failed"
  | "refunded";

export interface IPayout extends Document {
  payment: Types.ObjectId;
  contract: Types.ObjectId;
  milestone?: Types.ObjectId;
  freelancer: Types.ObjectId;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  currency: string;
  status: PayoutStatus;
  eligibleAt?: Date;
  processingAt?: Date;
  processedAt?: Date;
  failedAt?: Date;
  failureCode?: string;
  externalReference?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const payoutSchema = new Schema<IPayout>(
  {
    payment: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },
    contract: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: "Milestone",
      default: null,
      index: true,
    },
    freelancer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
    status: {
      type: String,
      enum: [
        "not_due",
        "held",
        "eligible",
        "processing",
        "paid",
        "failed",
        "refunded",
      ],
      default: "not_due",
      index: true,
    },
    eligibleAt: {
      type: Date,
      default: null,
    },
    processingAt: {
      type: Date,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
    failureCode: {
      type: String,
      default: "",
    },
    externalReference: {
      type: String,
      default: "",
      sparse: true,
      index: true,
    },
    idempotencyKey: {
      type: String,
      default: "",
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique indexes to prevent duplicate payable units
payoutSchema.index(
  { contract: 1, milestone: 1 },
  {
    unique: true,
    partialFilterExpression: { milestone: { $exists: true, $type: "objectId" } },
  }
);

payoutSchema.index(
  { contract: 1 },
  {
    unique: true,
    partialFilterExpression: { milestone: null },
  }
);

export const Payout = model<IPayout>("Payout", payoutSchema);
