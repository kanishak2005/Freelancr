import mongoose, { Schema } from "mongoose";
import { IProposal } from "./proposal.types";

const proposalSchema = new Schema<IProposal>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },

    freelancer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    coverLetter: {
      type: String,
      required: true,
      trim: true,
    },

    bidAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    deliveryTime: {
      type: Number,
      required: true,
    },

    attachments: [
      {
        type: String,
      },
    ],

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

proposalSchema.index(
  {
    job: 1,
    freelancer: 1,
  },
  {
    unique: true,
  }
);

export const Proposal = mongoose.model<IProposal>(
  "Proposal",
  proposalSchema
);