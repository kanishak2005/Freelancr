import { Document, Types } from "mongoose";

export type ContractStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "disputed";

export type ContractExecutionMode =
  | "simple"
  | "milestone";

export type ContractFundingStatus = "pending_funding" | "funded";

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
  fundingStatus: ContractFundingStatus;
  executionMode: ContractExecutionMode;
  allocatedMilestoneAmount?: number;
  maintenanceLock?: boolean;
  maintenanceLockToken?: string | null;
  maintenanceLockExpiresAt?: Date | null;

  freelancerConfirmedAt?: Date | null;
  clientApprovedAt?: Date | null;

  startDate: Date;
  endDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}