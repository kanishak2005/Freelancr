import { Schema, model } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: String,
    message: String,
    type: String,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ================= INDEXES =================

NotificationSchema.index({ recipient: 1 });
NotificationSchema.index({
  recipient: 1,
  type: 1,
});

NotificationSchema.index({
  recipient: 1,
  isRead: 1,
});

NotificationSchema.index({
  createdAt: -1,
});

// ===========================================

export const Notification = model(
  "Notification",
  NotificationSchema
);