import mongoose, { Schema } from "mongoose";
import { IContract } from "./contract.types";

const contractSchema = new Schema<IContract>(
  {
    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    freelancer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    proposal: {
      type: Schema.Types.ObjectId,
      ref: "Proposal",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    agreedAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "completed",
        "cancelled",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

export const Contract = mongoose.model<IContract>(
  "Contract",
  contractSchema
);