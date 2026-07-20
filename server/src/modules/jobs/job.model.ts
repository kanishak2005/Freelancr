import mongoose, { Schema } from "mongoose";
import { IJob } from "./job.types";

const jobSchema = new Schema<IJob>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    skills: [
      {
        type: String,
      },
    ],

    budget: {
      type: Number,
      required: true,
      min: 0,
    },

    budgetType: {
      type: String,
      enum: ["fixed", "hourly"],
      default: "fixed",
    },

    experienceLevel: {
      type: String,
      enum: [
        "entry",
        "intermediate",
        "expert",
      ],
      default: "entry",
    },

    duration: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    isRemote: {
      type: Boolean,
      default: true,
    },

    attachments: [
      {
        type: String,
      },
    ],

    client: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
  type: String,
  enum: [
    "open",
    "in_progress",
    "completed",
    "cancelled",
  ],
  default: "open",
},

    proposalsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Job = mongoose.model<IJob>(
  "Job",
  jobSchema
);