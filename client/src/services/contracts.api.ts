import { api } from "../lib/axios";

export interface ContractUser {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
}

export interface ContractJob {
  _id: string;
  title: string;
  description?: string;
}

export interface ContractProposal {
  _id: string;
}

export type ContractStatus =
  | "active"
  | "completed"
  | "cancelled"
  | "disputed";

export type ContractFundingStatus = "pending_funding" | "funded";

export interface Contract {
  _id: string;

  job:
    | string
    | ContractJob;

  proposal:
    | string
    | ContractProposal;

  client:
    | string
    | ContractUser;

  freelancer:
    | string
    | ContractUser;

  title: string;
  description: string;

  amount: number;

  deliveryTime: number;

  status: ContractStatus;
  fundingStatus?: ContractFundingStatus;
  executionMode?: "simple" | "milestone";
  allocatedMilestoneAmount?: number;

  freelancerConfirmedAt?: string;
  clientApprovedAt?: string;

  startDate: string;
  endDate?: string;

  createdAt: string;
  updatedAt: string;
}

export interface ContractTimelineActor {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
  role?: string;
}

export interface ContractTimelineItem {
  _id: string;
  action: string;
  timestamp: string;
  actor?: ContractTimelineActor;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
}

export interface ContractMilestone {
  _id: string;
  contract: string;
  title: string;
  description?: string;
  amount: number;
  dueDate?: string;
  status: "planned" | "in_progress" | "submitted" | "change_requested" | "approved" | "cancelled";
  sequence: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContractDeliverableFile {
  url: string;
  publicId: string;
  resourceType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface ContractDeliverable {
  _id: string;
  contract: string;
  milestone?: string | ContractMilestone;
  submittedBy: string | ContractUser;
  files: ContractDeliverableFile[];
  message: string;
  status: "submitted" | "change_requested" | "approved" | "withdrawn";
  submittedAt: string;
  reviewedAt?: string;
  reviewMessage?: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetContractsParams {
  page?: number;
  limit?: number;
  status?: ContractStatus;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedContractsResult {
  contracts: Contract[];
  pagination?: PaginationMeta;
}

export interface CreateContractPayload {
  proposalId: string;
  executionMode?: "simple" | "milestone";
}

export const createContract = async (
  payload: CreateContractPayload
): Promise<Contract> => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: Contract;
  }>("/contracts", payload);

  return response.data.data;
};

export const getMyContracts = async (
  params?: GetContractsParams
): Promise<PaginatedContractsResult> => {
  const response = await api.get<{
    success: boolean;
    data: Contract[];
    pagination?: PaginationMeta;
  }>("/contracts", { params });

  return {
    contracts: Array.isArray(response.data.data) ? response.data.data : [],
    pagination: response.data.pagination,
  };
};

export const getContract = async (
  contractId: string
) => {
  const response = await api.get<{
    success: boolean;
    data: Contract;
  }>(`/contracts/${contractId}`);

  return response.data.data;
};

export const completeContract = async (
  contractId: string
) => {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: Contract;
  }>(`/contracts/${contractId}/complete`);

  return response.data;
};

export const confirmContractCompletion = async (
  contractId: string
) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: Contract;
  }>(`/contracts/${contractId}/confirm-completion`);

  return response.data;
};

export const cancelContract = async (
  contractId: string
) => {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: Contract;
  }>(`/contracts/${contractId}/cancel`);

  return response.data;
};

export const getContractTimeline = async (
  contractId: string
): Promise<ContractTimelineItem[]> => {
  const response = await api.get<{
    success: boolean;
    data: ContractTimelineItem[];
  }>(`/contracts/${contractId}/timeline`);

  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const getContractMilestones = async (
  contractId: string
): Promise<ContractMilestone[]> => {
  const response = await api.get<{
    success: boolean;
    data: ContractMilestone[];
  }>(`/contracts/${contractId}/milestones`);

  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const createContractMilestone = async (
  contractId: string,
  payload: { title: string; amount: number; sequence: number; description?: string; dueDate?: string }
): Promise<ContractMilestone> => {
  const response = await api.post<{
    success: boolean;
    data: ContractMilestone;
  }>(`/contracts/${contractId}/milestones`, payload);

  return response.data.data;
};

export const getContractDeliverables = async (
  contractId: string
): Promise<ContractDeliverable[]> => {
  const response = await api.get<{
    success: boolean;
    data: ContractDeliverable[];
  }>(`/contracts/${contractId}/deliverables`);

  return Array.isArray(response.data.data) ? response.data.data : [];
};

export const submitContractDeliverable = async (
  contractId: string,
  payload: {
    files: ContractDeliverableFile[];
    message?: string;
    milestone?: string;
  }
): Promise<ContractDeliverable> => {
  const response = await api.post<{
    success: boolean;
    data: ContractDeliverable;
  }>(`/contracts/${contractId}/deliverables`, payload);

  return response.data.data;
};

export const approveContractDeliverable = async (
  contractId: string,
  deliverableId: string,
  message?: string
): Promise<ContractDeliverable> => {
  const response = await api.post<{
    success: boolean;
    data: ContractDeliverable;
  }>(`/contracts/${contractId}/deliverables/${deliverableId}/approve`, { message });

  return response.data.data;
};

export const requestDeliverableChanges = async (
  contractId: string,
  deliverableId: string,
  message: string
): Promise<ContractDeliverable> => {
  const response = await api.post<{
    success: boolean;
    data: ContractDeliverable;
  }>(`/contracts/${contractId}/deliverables/${deliverableId}/request-changes`, { message });

  return response.data.data;
};
