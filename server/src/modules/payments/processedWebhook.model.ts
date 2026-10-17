import { Schema, model, Document } from "mongoose";

export interface IProcessedWebhook extends Document {
  eventId: string;
  eventType: string;
  processedAt: Date;
}

const processedWebhookSchema = new Schema<IProcessedWebhook>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const ProcessedWebhook = model<IProcessedWebhook>(
  "ProcessedWebhook",
  processedWebhookSchema
);
