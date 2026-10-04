import mongoose, {
  Schema,
} from "mongoose";

import type {
  IReview,
  ReviewRole,
} from "./review.types";

const reviewSchema =
  new Schema<IReview>(
    {
      reviewer: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      reviewee: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      contract: {
        type: Schema.Types.ObjectId,
        ref: "Contract",
        required: true,
      },

      job: {
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true,
      },

      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },

      comment: {
        type: String,
        required: true,
        trim: true,
        minlength: 5,
        maxlength: 1000,
      },

      reviewerRole: {
        type: String,
        enum: [
          "client",
          "freelancer",
        ] as ReviewRole[],
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

reviewSchema.index(
  {
    reviewer: 1,
    contract: 1,
  },
  {
    unique: true,
  }
);

export const Review =
  mongoose.model<IReview>(
    "Review",
    reviewSchema
  );