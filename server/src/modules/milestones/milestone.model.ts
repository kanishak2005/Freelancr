import { Schema, model } from "mongoose";
import { IMilestone } from "./milestone.types";

const milestoneSchema = new Schema<IMilestone>(
  {
    contract: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        "planned",
        "in_progress",
        "submitted",
        "change_requested",
        "approved",
        "cancelled",
      ],
      default: "planned",
    },
    sequence: {
      type: Number,
      required: true,
      min: 1,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

milestoneSchema.index({ contract: 1, sequence: 1 }, { unique: true });
milestoneSchema.index({ contract: 1, status: 1 });

export const Milestone = model<IMilestone>("Milestone", milestoneSchema);
