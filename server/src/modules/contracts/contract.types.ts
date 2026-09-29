import { Document, Types } from "mongoose";

export type ContractStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "disputed";

export interface IContract extends Document {
  job: Types.ObjectId;
  proposal: Types.ObjectId;
  client: Types.ObjectId;
  freelancer: Types.ObjectId;

  title: string;
  description: string;

  amount: number;
  deliveryTime: number;

  status: ContractStatus;

  startDate: Date;
  endDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}