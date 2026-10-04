import { api } from "../lib/axios";

export type ProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface ProposalJob {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  budget?: number;
  budgetType?: "fixed" | "hourly";
  status?: string;
}

export interface ProposalFreelancer {
  _id: string;
  fullName: string;
  username: string;
  avatar?: string;
}

export interface Proposal {
  _id: string;

  job:
    | string
    | ProposalJob;

  freelancer:
    | string
    | ProposalFreelancer;

  coverLetter: string;

  bidAmount: number;

  deliveryTime: number;

  attachments: string[];

  status: ProposalStatus;

  createdAt: string;

  updatedAt: string;
}

export interface CreateProposalPayload {
  job: string;
  coverLetter: string;
  bidAmount: number;
  deliveryTime: number;
  attachments?: string[];
}

export interface UpdateProposalPayload {
  coverLetter?: string;
  bidAmount?: number;
  deliveryTime?: number;
  attachments?: string[];
}

export const applyProposal = async (
  payload: CreateProposalPayload
) => {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: Proposal;
  }>("/proposals", payload);

  return response.data;
};

export const getMyProposals = async () => {
  const response = await api.get<{
    success: boolean;
    data: Proposal[];
  }>("/proposals/my");

  return response.data.data;
};

export const getJobProposals = async (
  jobId: string
) => {
  const response = await api.get<{
    success: boolean;
    data: Proposal[];
  }>(`/proposals/job/${jobId}`);

  return response.data.data;
};

export const getProposal = async (
  proposalId: string
) => {
  const response = await api.get<{
    success: boolean;
    data: Proposal;
  }>(`/proposals/${proposalId}`);

  return response.data.data;
};

export const updateProposal = async (
  proposalId: string,
  payload: UpdateProposalPayload
) => {
  const response = await api.patch<{
    success: boolean;
    message: string;
    data: Proposal;
  }>(
    `/proposals/${proposalId}`,
    payload
  );

  return response.data;
};

export const withdrawProposal = async (
  proposalId: string
) => {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(
    `/proposals/${proposalId}`
  );

  return response.data;
};