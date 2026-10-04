import { api } from "../lib/axios";

export interface AdminDashboard {
  users: {
    total: number;
    clients: number;
    freelancers: number;
    admins: number;
    active: number;
    inactive: number;
    verified: number;
  };

  jobs: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
}

export interface AdminUser {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  role: "client" | "freelancer" | "admin";
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminJobClient {
  _id: string;
  fullName?: string;
  username?: string;
  email?: string;
}

export interface AdminJob {
  _id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budget: {
    min: number;
    max?: number;
  };
  budgetType: "fixed" | "hourly";
  experienceLevel: string;
  duration: string | number;
  location?: string;
  isRemote: boolean;
  status: "open" | "in_progress" | "completed" | "cancelled";
  proposalsCount: number;
  client: string | AdminJobClient;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  pagination: AdminPagination;
}

export interface AdminJobsResponse {
  jobs: AdminJob[];
  pagination: AdminPagination;
}

export const getAdminDashboard = async () => {
  const response = await api.get<{
    success: boolean;
    data: AdminDashboard;
  }>("/admin/dashboard");

  return response.data.data;
};

export const getAdminUsers = async (params?: {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
}) => {
  const response = await api.get<{
    success: boolean;
    data: AdminUsersResponse;
  }>("/admin/users", { params });

  return response.data.data;
};

export const getAdminUser = async (userId: string) => {
  const response = await api.get<{
    success: boolean;
    data: AdminUser;
  }>(`/admin/users/${userId}`);

  return response.data.data;
};

export const updateAdminUserStatus = async (
  userId: string,
  isActive: boolean
) => {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: AdminUser;
  }>(`/admin/users/${userId}/status`, { isActive });

  return response.data;
};

export const verifyAdminUser = async (
  userId: string,
  isVerified: boolean
) => {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: AdminUser;
  }>(`/admin/users/${userId}/verify`, { isVerified });

  return response.data;
};

export const deleteAdminUser = async (userId: string) => {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/admin/users/${userId}`);

  return response.data;
};

export const getAdminJobs = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const response = await api.get<{
    success: boolean;
    data: AdminJobsResponse;
  }>("/admin/jobs", { params });

  return response.data.data;
};

export const updateAdminJobStatus = async (
  jobId: string,
  status: AdminJob["status"]
) => {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: AdminJob;
  }>(`/admin/jobs/${jobId}/status`, { status });

  return response.data;
};

export const deleteAdminJob = async (jobId: string) => {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/admin/jobs/${jobId}`);

  return response.data;
};
