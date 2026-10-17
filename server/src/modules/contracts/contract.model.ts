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

    fundingStatus: {
      type: String,
      enum: ["pending_funding", "funded"],
      default: "pending_funding",
    },

    executionMode: {
      type: String,
      enum: ["simple", "milestone"],
      default: "simple",
    },

    allocatedMilestoneAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maintenanceLock: {
      type: Boolean,
      default: false,
    },

    maintenanceLockToken: {
      type: String,
      default: null,
    },

    maintenanceLockExpiresAt: {
      type: Date,
      default: null,
    },

    freelancerConfirmedAt: {
      type: Date,
      default: null,
    },

    clientApprovedAt: {
      type: Date,
      default: null,
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

contractSchema.index({ client: 1, createdAt: -1 });
contractSchema.index({ freelancer: 1, createdAt: -1 });

export const Contract = model<IContract>(
  "Contract",
  contractSchema
);

