import { api } from "../lib/axios";

export interface JobClient {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
  rating?: number;
  reviewCount?: number;
  completedProjects?: number;
}

export interface MatchScoreResult {
  score: number;
  breakdown: {
    skills: { weight: number; score: number };
    experience: { weight: number; score: number };
    category: { weight: number; score: number };
    budget: { weight: number; score: number };
    preferences: { weight: number; score: number };
  };
  matchedSkills: string[];
  missingSkills: string[];
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
  isSaved?: boolean;
  savedAt?: string;
  matchScore?: MatchScoreResult | null;
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

export const getAllJobs = async (
  params?: Record<string, string | number | boolean | undefined>
) => {
  const response = await api.get<{
    success: boolean;
    data: Job[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/jobs", { params });

  return response.data.data;
};

export const saveJob = async (jobId: string) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    isSaved: boolean;
  }>(`/jobs/${jobId}/save`);

  return response.data;
};

export const unsaveJob = async (jobId: string) => {
  const response = await api.delete<{
    success: boolean;
    message: string;
    isSaved: boolean;
  }>(`/jobs/${jobId}/save`);

  return response.data;
};

export const getSavedJobs = async () => {
  const response = await api.get<{
    success: boolean;
    data: Job[];
  }>("/jobs/saved");

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
  keyword: string,
  signal?: AbortSignal
) => {
  const response = await api.get<{
    success: boolean;
    data: Job[];
    pagination?: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }>("/jobs/search", {
    params: {
      keyword,
    },
    signal,
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