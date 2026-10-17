import { Schema, model, Document, Types } from "mongoose";

export type LedgerEventType =
  | "client_funding_captured"
  | "platform_commission_earned"
  | "freelancer_earnings_approved"
  | "wallet_credited"
  | "cashout_requested"
  | "cashout_paid"
  | "cashout_failed"
  | "cashout_reversed"
  | "refund_issued";

export interface IFinancialLedger extends Document {
  eventType: LedgerEventType;
  amountMinor: number; // Integer paise
  currency: string;
  user?: Types.ObjectId; // User associated (freelancer/client)
  contract?: Types.ObjectId;
  payment?: Types.ObjectId;
  payout?: Types.ObjectId;
  wallet?: Types.ObjectId;
  referenceId: string; // Idempotency reference or external ID
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const financialLedgerSchema = new Schema<IFinancialLedger>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    amountMinor: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    contract: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      index: true,
      default: null,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      index: true,
      default: null,
    },
    payout: {
      type: Schema.Types.ObjectId,
      ref: "Payout",
      index: true,
      default: null,
    },
    wallet: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      index: true,
      default: null,
    },
    referenceId: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only immutable ledger
  }
);

// Compound index for idempotency
financialLedgerSchema.index({ eventType: 1, referenceId: 1 }, { unique: true });

export const FinancialLedger = model<IFinancialLedger>(
  "FinancialLedger",
  financialLedgerSchema
);
