import { JobRepository } from "./job.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class JobService {
  static async createJob(
    clientId: string,
    data: any
  ) {
    return JobRepository.create({
      ...data,
      client: clientId,
    });
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

    return JobRepository.update(jobId, data);
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
    return JobRepository.search(keyword);
  }

  static async filterJobs(filters: any) {
    return JobRepository.filter(filters);
  }
}