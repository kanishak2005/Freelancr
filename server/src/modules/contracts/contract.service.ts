import { ContractRepository } from "./contract.repository";
import { ProposalRepository } from "../proposals/proposal.repository";
import { JobRepository } from "../jobs/job.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class ContractService {
  static async createContract(clientId: string, data: any) {
    const proposal = await ProposalRepository.findById(data.proposal);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    const job = await JobRepository.findById(
      proposal.job._id.toString()
    );

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    // Handle both populated and unpopulated client field
    const jobClientId =
      (job.client as any)._id?.toString() ??
      job.client.toString();

    console.log("Logged In User :", clientId);
    console.log("Job Owner      :", jobClientId);

    if (jobClientId !== clientId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the job owner can create a contract"
      );
    }

    await ProposalRepository.updateStatus(
      proposal._id.toString(),
      "accepted"
    );

    await JobRepository.updateStatus(
      job._id.toString(),
      "in_progress"
    );

    return ContractRepository.create({
      client: clientId,
      freelancer: proposal.freelancer._id,
      proposal: proposal._id,
      job: proposal.job._id,
      title: job.title,
      description: job.description,
      agreedAmount: proposal.bidAmount,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "pending",
    });
  }

  static async getContract(id: string) {
    const contract = await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    return contract;
  }

  static async getMyContracts(userId: string) {
    return ContractRepository.findAllByUser(userId);
  }

  static async updateContract(
    id: string,
    userId: string,
    data: any
  ) {
    const contract = await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    const contractClientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    if (contractClientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    return ContractRepository.update(id, data);
  }

  static async startContract(
    id: string,
    userId: string
  ) {
    const contract = await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    const contractClientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    if (contractClientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    return ContractRepository.update(id, {
      status: "active",
    });
  }

  static async completeContract(
    id: string,
    userId: string
  ) {
    const contract = await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    const contractClientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    if (contractClientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    await JobRepository.updateStatus(
      contract.job._id.toString(),
      "completed"
    );

    return ContractRepository.update(id, {
      status: "completed",
    });
  }

  static async cancelContract(
    id: string,
    userId: string
  ) {
    const contract = await ContractRepository.findById(id);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    const contractClientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    if (contractClientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    await JobRepository.updateStatus(
      contract.job._id.toString(),
      "open"
    );

    return ContractRepository.update(id, {
      status: "cancelled",
    });
  }
}