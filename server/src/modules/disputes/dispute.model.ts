import { Schema, model, Document, Types } from "mongoose";

export type DisputeStatus =
  | "open"
  | "under_review"
  | "awaiting_evidence"
  | "resolved"
  | "rejected"
  | "cancelled";

export type DisputeReason =
  | "non_delivery"
  | "poor_quality"
  | "payment_issue"
  | "communication"
  | "scope_breach"
  | "other";

export type DisputeResolution =
  | "refund_client"
  | "release_freelancer"
  | "split"
  | "dismissed";

export interface IDisputeEvidence {
  _id?: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  url: string;
  publicId: string;
  name?: string;
  notes?: string;
  uploadedAt: Date;
}

export interface IDispute extends Document {
  contract: Types.ObjectId;
  openedBy: Types.ObjectId;
  against: Types.ObjectId;
  reason: DisputeReason;
  description: string;
  evidence: IDisputeEvidence[];
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolutionNotes?: string;
  resolvedBy?: Types.ObjectId;
  openedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const disputeEvidenceSchema = new Schema<IDisputeEvidence>(
  {
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    name: { type: String },
    notes: { type: String, maxlength: 1000 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const disputeSchema = new Schema<IDispute>(
  {
    contract: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      index: true,
    },
    openedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    against: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      enum: [
        "non_delivery",
        "poor_quality",
        "payment_issue",
        "communication",
        "scope_breach",
        "other",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    evidence: [disputeEvidenceSchema],
    status: {
      type: String,
      enum: [
        "open",
        "under_review",
        "awaiting_evidence",
        "resolved",
        "rejected",
        "cancelled",
      ],
      default: "open",
      index: true,
    },
    resolution: {
      type: String,
      enum: ["refund_client", "release_freelancer", "split", "dismissed"],
      required: false,
    },
    resolutionNotes: {
      type: String,
      maxlength: 3000,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    openedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

disputeSchema.index({ contract: 1, status: 1 });
disputeSchema.index({ openedBy: 1, createdAt: -1 });

export const Dispute = model<IDispute>("Dispute", disputeSchema);
