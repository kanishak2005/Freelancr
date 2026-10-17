import { Schema, model, Document, Types } from "mongoose";

export interface IWallet extends Document {
  user: Types.ObjectId; // Freelancer ID
  availableBalanceMinor: number; // Integer paise available for cashout
  pendingEarningsMinor: number; // Integer paise awaiting approval or completion
  lifetimeEarningsMinor: number; // Total approved gross earnings
  totalWithdrawnMinor: number; // Total successfully paid cashouts
  reservedCashoutMinor: number; // In processing/pending cashout requests
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const walletSchema = new Schema<IWallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    availableBalanceMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pendingEarningsMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lifetimeEarningsMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalWithdrawnMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedCashoutMinor: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Wallet = model<IWallet>("Wallet", walletSchema);
