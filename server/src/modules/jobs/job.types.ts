import { Document, Types } from "mongoose";

export type JobStatus = "open" | "closed" | "draft";

export type BudgetType = "fixed" | "hourly";

export type ExperienceLevel =
  | "entry"
  | "intermediate"
  | "expert";

export interface IJob extends Document {
  title: string;

  description: string;

  category: string;

  skills: string[];

  budget: number;

  budgetType: BudgetType;

  experienceLevel: ExperienceLevel;

  duration: string;

  location: string;

  isRemote: boolean;

  attachments: string[];

  client: Types.ObjectId;

  status: JobStatus;

  proposalsCount: number;

  createdAt: Date;

  updatedAt: Date;
}