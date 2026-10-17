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

  operations?: {
    openDisputes: number;
    openTickets: number;
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

export const getAdminAuditLogs = async (params?: {
  page?: number;
  limit?: number;
  action?: string;
  targetType?: string;
}) => {
  const response = await api.get<{
    success: boolean;
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>("/admin/audit", { params });

  return response.data;
};

export const getAdminHealth = async () => {
  const response = await api.get<{
    success: boolean;
    data: {
      status: string;
      timestamp: string;
      uptimeSeconds: number;
      environment: string;
      process: {
        pid: number;
        nodeVersion: string;
        memoryRssMb: number;
        memoryHeapUsedMb: number;
        memoryHeapTotalMb: number;
      };
      database: {
        status: string;
      };
    };
  }>("/admin/health");

  return response.data;
};

export interface GatewayDiagnostics {
  status: string;
  gateway: string;
  mode: "live" | "test" | "unidentified";
  keyIdMasked: string;
  hasKeySecret: boolean;
  hasWebhookSecret: boolean;
  webhookConfigured: boolean;
  verifiedPayments: {
    totalOrders: number;
    totalCaptured: number;
    lastCapturedAt: string | null;
    lastCapturedAmount: number;
    currency: string;
  };
  capabilities: {
    orderCreation: boolean;
    paymentVerification: boolean;
    webhooks: boolean;
    directRouteTransfers: boolean;
  };
}

export const getAdminGatewayDiagnostics = async () => {
  const response = await api.get<{
    success: boolean;
    data: GatewayDiagnostics;
  }>("/admin/gateway");

  return response.data.data;
};

export interface CommissionSummary {
  policy: {
    name: string;
    ratePercent: number;
    basis: string;
    rounding: string;
    currency: string;
  };
  totals: {
    earned: { minor: number; major: number; count: number };
    pendingSettlement: { minor: number; major: number; count: number };
    settledInBank: { minor: number; major: number; count: number };
    refunded: { minor: number; major: number; count: number };
  };
  reconciliationStatus: {
    honestAppraisal: string;
    requiresDedicatedKYC: boolean;
  };
}

export interface CommissionRecord {
  _id: string;
  paymentId: string;
  contractId: string;
  milestoneId?: string;
  razorpayOrderId: string;
  grossAmountMinor: number;
  commissionAmountMinor: number;
  ratePercent: number;
  status: "earned" | "pending_settlement" | "settled" | "refunded";
  currency: string;
  recognizedAt: string;
  settledAt?: string;
}

export const getAdminCommissionSummary = async () => {
  const response = await api.get<{
    success: boolean;
    data: CommissionSummary;
  }>("/admin/commission/summary");

  return response.data.data;
};

export const getAdminCommissionLedger = async (params?: { page?: number; limit?: number }) => {
  const response = await api.get<{
    success: boolean;
    data: CommissionRecord[];
    pagination: AdminPagination;
  }>("/admin/commission/ledger", { params });

  return response.data;
};

