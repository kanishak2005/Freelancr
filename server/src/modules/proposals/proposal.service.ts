import { ProposalRepository } from "./proposal.repository";
import { JobRepository } from "../jobs/job.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class ProposalService {
  static async apply(
    freelancerId: string,
    data: any
  ) {
    const job = await JobRepository.findById(data.job);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    const existing =
      await ProposalRepository.findExisting(
        data.job,
        freelancerId
      );

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "You have already applied for this job"
      );
    }

    return ProposalRepository.create({
      ...data,
      freelancer: freelancerId,
    });
  }

  static async getProposal(id: string) {
    const proposal =
      await ProposalRepository.findById(id);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    return proposal;
  }

  static async getMyProposals(
    freelancerId: string
  ) {
    return ProposalRepository.findByFreelancer(
      freelancerId
    );
  }

  static async getJobProposals(
    jobId: string
  ) {
    return ProposalRepository.findByJob(jobId);
  }

  static async updateProposal(
    id: string,
    freelancerId: string,
    data: any
  ) {
    const proposal =
      await ProposalRepository.findById(id);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    if (
      proposal.freelancer._id.toString() !==
      freelancerId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    return ProposalRepository.update(id, data);
  }

  static async withdrawProposal(
    id: string,
    freelancerId: string
  ) {
    const proposal =
      await ProposalRepository.findById(id);

    if (!proposal) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Proposal not found"
      );
    }

    if (
      proposal.freelancer._id.toString() !==
      freelancerId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized"
      );
    }

    await ProposalRepository.delete(id);

    return {
      message: "Proposal withdrawn successfully",
    };
  }
}