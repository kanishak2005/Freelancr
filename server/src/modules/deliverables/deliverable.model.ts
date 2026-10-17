import { Schema, model } from "mongoose";
import { IDeliverable, IDeliverableFile } from "./deliverable.types";

const deliverableFileSchema = new Schema<IDeliverableFile>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    resourceType: {
      type: String,
      enum: ["image", "raw", "video", "auto"],
      default: "raw",
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const deliverableSchema = new Schema<IDeliverable>(
  {
    contract: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: "Milestone",
      default: undefined,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    files: {
      type: [deliverableFileSchema],
      required: true,
      validate: {
        validator: function (files: IDeliverableFile[]) {
          return Array.isArray(files) && files.length > 0;
        },
        message: "At least one deliverable file is required",
      },
    },
    message: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["submitted", "change_requested", "approved", "withdrawn"],
      default: "submitted",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    reviewMessage: {
      type: String,
      maxlength: 2000,
    },
    revision: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying revisions for a contract/milestone (non-unique to allow history)
deliverableSchema.index({ contract: 1, milestone: 1, revision: -1 });
deliverableSchema.index({ contract: 1, createdAt: -1 });

export const Deliverable = model<IDeliverable>("Deliverable", deliverableSchema);
