import { Types } from "mongoose";
import { JobRepository } from "./job.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class JobService {
  static async createJob(
    clientId: string,
    data: any
  ) {
    const jobData = {
      title: data.title,
      description: data.description,
      category: data.category,
      budget: data.budget,
      budgetType: data.budgetType,
      experienceLevel: data.experienceLevel,
      client: new Types.ObjectId(clientId),
    };

    return JobRepository.create(jobData);
  }

  static async updateJob(
    jobId: string,
    clientId: string,
    data: any
  ) {
    const job = await JobRepository.findById(jobId);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    if (job.client._id.toString() !== clientId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not allowed to update this job"
      );
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.budget !== undefined) {
      updateData.budget = data.budget;
    }

    return JobRepository.update(
      jobId,
      updateData
    );
  }

  static async deleteJob(
    jobId: string,
    clientId: string
  ) {
    const job = await JobRepository.findById(jobId);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    if (job.client._id.toString() !== clientId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not allowed to delete this job"
      );
    }

    if (job.status !== "open") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Cannot delete a job that is already in progress or completed"
      );
    }

    await JobRepository.delete(jobId);

    return {
      message: "Job deleted successfully",
    };
  }

  static async getJob(jobId: string) {
    const job = await JobRepository.findById(jobId);

    if (!job) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Job not found"
      );
    }

    return job;
  }

  static async getAllJobs(
    options?: any,
    userContext?: { id?: string; role?: string }
  ) {
    const filters = {
      q: options?.q || options?.keyword,
      category: options?.category,
      budgetMin:
        options?.budgetMin !== undefined
          ? Number(options.budgetMin)
          : undefined,
      budgetMax:
        options?.budgetMax !== undefined
          ? Number(options.budgetMax)
          : undefined,
      budgetType: options?.budgetType,
      experienceLevel: options?.experienceLevel,
      isRemote:
        options?.isRemote !== undefined
          ? options.isRemote === "true" || options.isRemote === true
          : undefined,
      status: options?.status,
      proposalCountMax:
        options?.proposalCountMax !== undefined
          ? Number(options.proposalCountMax)
          : undefined,
      sort: options?.sort,
    };

    return JobRepository.findWithTrustAndMatching(
      filters,
      options,
      userContext
    );
  }

  static async getMyJobs(
    clientId: string,
    options?: any
  ) {
    return JobRepository.findByClient(clientId, options);
  }

  static async searchJobs(
    keyword: string,
    options?: any
  ) {
    const escapedKeyword = (keyword || "").replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    return JobRepository.search(escapedKeyword, options);
  }

  static async filterJobs(filters: any, options?: any) {
    const allowedFilters: Record<string, unknown> = {};

    if (
      typeof filters.category === "string" &&
      filters.category.trim()
    ) {
      allowedFilters.category =
        filters.category.trim();
    }

    if (
      typeof filters.budgetType === "string" &&
      ["fixed", "hourly"].includes(
        filters.budgetType
      )
    ) {
      allowedFilters.budgetType =
        filters.budgetType;
    }

    if (
      typeof filters.experienceLevel === "string" &&
      ["entry", "intermediate", "expert"].includes(
        filters.experienceLevel
      )
    ) {
      allowedFilters.experienceLevel =
        filters.experienceLevel;
    }

    if (
      typeof filters.status === "string" &&
      [
        "open",
        "in_progress",
        "completed",
        "cancelled",
      ].includes(filters.status)
    ) {
      allowedFilters.status =
        filters.status;
    }

    return JobRepository.filter(
      allowedFilters,
      options
    );
  }
}
