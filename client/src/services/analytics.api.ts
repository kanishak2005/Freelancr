import { api } from "../lib/axios";

export interface PlatformOverview {
  users: {
    total: number;
    clients: number;
    freelancers: number;
    admins: number;
    active: number;
    verified: number;
  };

  jobs: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };

  proposals: {
    total: number;
  };

  contracts: {
    total: number;
    active: number;
    completed: number;
  };

  payments: {
    total: number;
    paid: number;
  };
}

export interface UserAnalytics {
  total: number;
  clients: number;
  freelancers: number;
  admins: number;
  active: number;
  inactive: number;
  verified: number;
  unverified: number;
}

export interface JobAnalytics {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface ProposalAnalytics {
  total: number;
}

export interface ContractAnalytics {
  total: number;
  active: number;
  completed: number;
}

export interface PaymentAnalytics {
  total: number;
  paid: number;
}

export const getPlatformOverview = async () => {
  const response = await api.get<{
    success: boolean;
    data: PlatformOverview;
  }>("/analytics/overview");

  return response.data.data;
};

export const getUserAnalytics = async () => {
  const response = await api.get<{
    success: boolean;
    data: UserAnalytics;
  }>("/analytics/users");

  return response.data.data;
};

export const getJobAnalytics = async () => {
  const response = await api.get<{
    success: boolean;
    data: JobAnalytics;
  }>("/analytics/jobs");

  return response.data.data;
};

export const getProposalAnalytics = async () => {
  const response = await api.get<{
    success: boolean;
    data: ProposalAnalytics;
  }>("/analytics/proposals");

  return response.data.data;
};

export const getContractAnalytics = async () => {
  const response = await api.get<{
    success: boolean;
    data: ContractAnalytics;
  }>("/analytics/contracts");

  return response.data.data;
};

export const getPaymentAnalytics = async () => {
  const response = await api.get<{
    success: boolean;
    data: PaymentAnalytics;
  }>("/analytics/payments");

  return response.data.data;
};
