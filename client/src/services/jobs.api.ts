import { api } from "../lib/axios";

export interface JobClient {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
}

export type JobStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";

export type BudgetType = "fixed" | "hourly";

export type ExperienceLevel =
  | "entry"
  | "intermediate"
  | "expert";

export interface Job {
  _id: string;
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
  client: JobClient;
  status: JobStatus;
  proposalsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobPayload {
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
}

export const getAllJobs = async () => {
  const response = await api.get<{
    success: boolean;
    data: Job[];
  }>("/jobs");

  return response.data.data;
};

export const getJob = async (
  jobId: string
) => {
  const response = await api.get<{
    success: boolean;
    data: Job;
  }>(`/jobs/${jobId}`);

  return response.data.data;
};

export const getMyJobs = async () => {
  const response = await api.get<{
    success: boolean;
    data: Job[];
  }>("/jobs/my-jobs");

  return response.data.data;
};

export const createJob = async (
  payload: CreateJobPayload
) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: Job;
  }>("/jobs", payload);

  return response.data;
};

export const updateJob = async (
  jobId: string,
  payload: Partial<CreateJobPayload>
) => {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: Job;
  }>(`/jobs/${jobId}`, payload);

  return response.data;
};

export const deleteJob = async (
  jobId: string
) => {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/jobs/${jobId}`);

  return response.data;
};

export const searchJobs = async (
  keyword: string
) => {
  const response = await api.get<{
    success: boolean;
    data: Job[];
  }>("/jobs/search", {
    params: {
      keyword,
    },
  });

  return response.data.data;
};

export const filterJobs = async (
  filters: Record<string, string | boolean | number>
) => {
  const response = await api.get<{
    success: boolean;
    data: Job[];
  }>("/jobs/filter", {
    params: filters,
  });

  return response.data.data;
};