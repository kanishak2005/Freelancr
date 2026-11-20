import { Schema, model, Document, Types } from "mongoose";

export type EscalationStatus = "pending" | "reviewed" | "converted_to_faq" | "dismissed";

export interface IChatbotEscalation extends Document {
  question: string;
  normalizedQuestion: string;
  category?: string;
  user?: Types.ObjectId;
  userRole?: string;
  status: EscalationStatus;
  reviewedBy?: Types.ObjectId;
  adminNotes?: string;
  linkedKnowledgeEntry?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const chatbotEscalationSchema = new Schema<IChatbotEscalation>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    normalizedQuestion: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    userRole: {
      type: String,
      enum: ["client", "freelancer", "admin", "anonymous"],
      default: "anonymous",
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "converted_to_faq", "dismissed"],
      default: "pending",
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    linkedKnowledgeEntry: {
      type: Schema.Types.ObjectId,
      ref: "KnowledgeBaseEntry",
    },
  },
  {
    timestamps: true,
  }
);

chatbotEscalationSchema.index({ status: 1, createdAt: -1 });

export const ChatbotEscalation = model<IChatbotEscalation>(
  "ChatbotEscalation",
  chatbotEscalationSchema
);

