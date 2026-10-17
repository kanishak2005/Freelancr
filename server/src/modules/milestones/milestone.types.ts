import { Document, Types } from "mongoose";

export type MilestoneStatus =
  | "planned"
  | "in_progress"
  | "submitted"
  | "change_requested"
  | "approved"
  | "cancelled";

export interface IMilestone extends Document {
  contract: Types.ObjectId;
  title: string;
  description: string;
  amount: number;
  dueDate?: Date;
  status: MilestoneStatus;
  sequence: number;
  createdBy: Types.ObjectId;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMilestoneInput {
  contractId: string;
  title: string;
  description?: string;
  amount: number;
  dueDate?: Date | string;
  sequence: number;
}

export interface UpdatePlannedMilestoneInput {
  title?: string;
  description?: string;
  amount?: number;
  dueDate?: Date | string;
}
