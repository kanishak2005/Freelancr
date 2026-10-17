import { Document, Types } from "mongoose";

export type DeliverableStatus =
  | "submitted"
  | "change_requested"
  | "approved"
  | "withdrawn";

export type DeliverableResourceType = "image" | "raw" | "video" | "auto";

export interface IDeliverableFile {
  url: string;
  publicId: string;
  resourceType: DeliverableResourceType;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface IDeliverable extends Document {
  contract: Types.ObjectId;
  milestone?: Types.ObjectId;
  submittedBy: Types.ObjectId;
  files: IDeliverableFile[];
  message: string;
  status: DeliverableStatus;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewMessage?: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitDeliverableInput {
  contractId: string;
  milestoneId?: string;
  files: IDeliverableFile[];
  message?: string;
}
