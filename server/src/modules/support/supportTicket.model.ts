import { Schema, model, Document, Types } from "mongoose";

export type TicketCategory =
  | "account"
  | "billing"
  | "contract"
  | "technical"
  | "other";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_for_user"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface ITicketReply {
  _id?: Types.ObjectId;
  author: Types.ObjectId;
  authorRole: "client" | "freelancer" | "admin";
  message: string;
  attachments?: {
    url: string;
    publicId: string;
    name?: string;
  }[];
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  user: Types.ObjectId;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedAdmin?: Types.ObjectId;
  attachments?: {
    url: string;
    publicId: string;
    name?: string;
  }[];
  replies: ITicketReply[];
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ticketReplySchema = new Schema<ITicketReply>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorRole: {
      type: String,
      enum: ["client", "freelancer", "admin"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      maxlength: 3000,
    },
    attachments: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        name: { type: String },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const supportTicketSchema = new Schema<ISupportTicket>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["account", "billing", "contract", "technical", "other"],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "waiting_for_user", "resolved", "closed"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    assignedAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    attachments: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
        name: { type: String },
      },
    ],
    replies: [ticketReplySchema],
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1 });

export const SupportTicket = model<ISupportTicket>(
  "SupportTicket",
  supportTicketSchema
);
