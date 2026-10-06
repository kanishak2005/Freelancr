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

  static async getAllJobs() {
    return JobRepository.findAll();
  }

  static async getMyJobs(
    clientId: string
  ) {
    return JobRepository.findByClient(clientId);
  }

  static async searchJobs(
    keyword: string
  ) {
    const escapedKeyword = keyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    return JobRepository.search(escapedKeyword);
  }

  static async filterJobs(filters: any) {
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
      allowedFilters
    );
  }
}
