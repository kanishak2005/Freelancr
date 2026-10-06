import mongoose, { Schema } from "mongoose";
import { IPayment } from "./payment.types";

const paymentSchema = new Schema<IPayment>(
  {
    contract: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },

    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    freelancer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      default: "",
    },

    razorpaySignature: {
      type: String,
      default: "",
    },

    status: {
  type: String,
  enum: [
    "created",
    "paid",
    "failed",
    "partially_refunded",
    "refunded",
  ],
  default: "created",
},

refundedAmount: {
  type: Number,
  default: 0,
  min: 0,
},

    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment = mongoose.model<IPayment>(
  "Payment",
  paymentSchema
);