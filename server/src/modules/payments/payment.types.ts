import { Document, Types } from "mongoose";

export type PaymentStatus =
  | "created"
  | "paid"
  | "failed"
  | "partially_refunded"
  | "refunded";

export interface IPayment extends Document {
  contract: Types.ObjectId;
  client: Types.ObjectId;
  freelancer: Types.ObjectId;

  amount: number;
  refundedAmount: number;
  currency: "INR";

  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;

  status: PaymentStatus;

  paidAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}