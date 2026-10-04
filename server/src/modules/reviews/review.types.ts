import { Document, Types } from "mongoose";

export type ReviewRole =
  | "client"
  | "freelancer";

export interface IReview extends Document {
  reviewer: Types.ObjectId;
  reviewee: Types.ObjectId;
  contract: Types.ObjectId;
  job: Types.ObjectId;
  rating: number;
  comment: string;
  reviewerRole: ReviewRole;
  createdAt: Date;
  updatedAt: Date;
}