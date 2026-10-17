import { Schema, model, Document, Types } from "mongoose";

export type CommissionStatus =
  | "earned"             // Earned upon verified client payment capture
  | "pending_settlement"// In Razorpay rolling settlement queue (T+2/T+3)
  | "settled"           // Confirmed settled to platform bank account
  | "refunded";         // Reversed due to contract refund/chargeback

export interface ICommission extends Document {
  payment: Types.ObjectId;
  contract: Types.ObjectId;
  milestone?: Types.ObjectId;
  grossAmount: number;         // Gross contract amount (e.g., ₹10,000)
  feeRatePercentage: number;   // Configured rate (e.g., 10%)
  commissionAmount: number;    // Calculated fee in standard units (e.g., ₹1,000)
  commissionAmountMinor: number; // Integer minor units (e.g., 100000 paise)
  netFreelancerAmount: number; // Amount payable to freelancer (e.g., ₹9,000)
  currency: string;
  status: CommissionStatus;
  settlementBatchId?: string;
  settledAt?: Date;
  refundedAt?: Date;
  idempotencyKey: string;      // Unique reference (e.g. `comm_orderId`)
  createdAt: Date;
  updatedAt: Date;
}

const commissionSchema = new Schema<ICommission>(
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
      index: true,
    },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: "Milestone",
      default: null,
      index: true,
    },
    grossAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    feeRatePercentage: {
      type: Number,
      default: 10, // Standard 10% marketplace fee policy
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionAmountMinor: {
      type: Number,
      required: true,
      min: 0,
    },
    netFreelancerAmount: {
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
      enum: ["earned", "pending_settlement", "settled", "refunded"],
      default: "earned",
      index: true,
    },
    settlementBatchId: {
      type: String,
      default: null,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

commissionSchema.index({ status: 1, createdAt: -1 });
commissionSchema.index({ contract: 1, payment: 1 });

export const Commission = model<ICommission>("Commission", commissionSchema);
