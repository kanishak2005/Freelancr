import { Document, Types } from "mongoose";

export interface IReview extends Document {
  contract: Types.ObjectId;
  client: Types.ObjectId;
  freelancer: Types.ObjectId;

  rating: number;
  comment: string;

  createdAt: Date;
  updatedAt: Date;
}