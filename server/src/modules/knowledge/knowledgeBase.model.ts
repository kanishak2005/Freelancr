import { Schema, model, Document, Types } from "mongoose";

export type KnowledgeCategory =
  | "general"
  | "registration"
  | "onboarding"
  | "profile"
  | "jobs"
  | "proposals"
  | "contracts"
  | "payments"
  | "messages"
  | "support";

export type KnowledgeStatus = "draft" | "published" | "archived";

export interface IKnowledgeBaseEntry extends Document {
  canonicalQuestion: string;
  alternateQuestions: string[];
  keywords: string[];
  category: KnowledgeCategory;
  answer: string;
  status: KnowledgeStatus;
  viewCount: number;
  helpfulCount: number;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeBaseEntrySchema = new Schema<IKnowledgeBaseEntry>(
  {
    canonicalQuestion: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
      unique: true,
      index: true,
    },
    alternateQuestions: [
      {
        type: String,
        trim: true,
        maxlength: 300,
      },
    ],
    keywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    category: {
      type: String,
      enum: [
        "general",
        "registration",
        "onboarding",
        "profile",
        "jobs",
        "proposals",
        "contracts",
        "payments",
        "messages",
        "support",
      ],
      default: "general",
      index: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

knowledgeBaseEntrySchema.index({ status: 1, category: 1 });
knowledgeBaseEntrySchema.index({ keywords: 1 });

export const KnowledgeBaseEntry = model<IKnowledgeBaseEntry>(
  "KnowledgeBaseEntry",
  knowledgeBaseEntrySchema
);

