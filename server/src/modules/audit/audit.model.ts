import { Schema, model, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  action: string;
  actor?: Types.ObjectId;
  actorRole?: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    actorRole: {
      type: String,
      default: "",
    },
    targetType: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    requestId: {
      type: String,
      default: "",
    },
    ip: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
