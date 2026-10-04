import { Schema, model } from "mongoose";
import { IContract } from "./contract.types";

const contractSchema = new Schema<IContract>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    proposal: {
      type: Schema.Types.ObjectId,
      ref: "Proposal",
      required: true,
      unique: true,
    },

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

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    deliveryTime: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: [
        "active",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "active",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Contract = model<IContract>(
  "Contract",
  contractSchema
);

