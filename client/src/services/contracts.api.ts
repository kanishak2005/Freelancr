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

  status:
    | "active"
    | "completed"
    | "cancelled";

  startDate: string;
  endDate?: string;

  createdAt: string;
  updatedAt: string;
}

export const getMyContracts = async () => {
  const response = await api.get<{
    success: boolean;
    data: Contract[];
  }>("/contracts");

  return response.data.data;
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
