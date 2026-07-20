import { Document, Types } from "mongoose";

export type ProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface IProposal extends Document {
  job: Types.ObjectId;

  freelancer: Types.ObjectId;

  coverLetter: string;

  bidAmount: number;

  deliveryTime: number;

  attachments: string[];

  status: ProposalStatus;

  createdAt: Date;

  updatedAt: Date;
}