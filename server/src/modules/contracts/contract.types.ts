import { Document, Types } from "mongoose";

export type ContractStatus =
  | "pending"
  | "active"
  | "completed"
  | "cancelled";

export interface IContract extends Document {
  client: Types.ObjectId;

  freelancer: Types.ObjectId;

  job: Types.ObjectId;

  proposal: Types.ObjectId;

  title: string;

  description: string;

  agreedAmount: number;

  startDate: Date;

  endDate: Date;

  status: ContractStatus;

  createdAt: Date;

  updatedAt: Date;
}