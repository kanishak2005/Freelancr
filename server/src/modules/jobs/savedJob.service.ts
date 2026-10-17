import { Types } from "mongoose";
import { SavedJob } from "./savedJob.model";
import { Job } from "./job.model";
import { ApiError, HTTP_STATUS } from "../../shared";
import {
  getPaginationParams,
  createPaginationMeta,
  type PaginationOptions,
} from "../../utils/pagination";

export class SavedJobService {
  /**
   * Idempotent job saving.
   * If already saved, succeeds without error.
   */
  static async saveJob(userId: string, jobId: string) {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid job ID");
    }

    const jobExists = await Job.findById(jobId).select("_id");
    if (!jobExists) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Job not found");
    }

    await SavedJob.updateOne(
      {
        user: new Types.ObjectId(userId),
        job: new Types.ObjectId(jobId),
      },
      {
        $setOnInsert: {
          user: new Types.ObjectId(userId),
          job: new Types.ObjectId(jobId),
        },
      },
      { upsert: true }
    );

    return {
      success: true,
      message: "Job saved successfully",
      isSaved: true,
    };
  }

  /**
   * Idempotent job unsaving.
   * If already unsaved, succeeds without error.
   */
  static async unsaveJob(userId: string, jobId: string) {
    if (!Types.ObjectId.isValid(jobId)) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid job ID");
    }

    await SavedJob.deleteOne({
      user: new Types.ObjectId(userId),
      job: new Types.ObjectId(jobId),
    });

    return {
      success: true,
      message: "Job removed from saved jobs",
      isSaved: false,
    };
  }

  /**
   * Retrieves saved jobs for an authenticated user with pagination and populated job + client info.
   */
  static async getSavedJobs(userId: string, options?: PaginationOptions) {
    const { page, limit, skip } = getPaginationParams(options);
    const filter = { user: new Types.ObjectId(userId) };

    const [savedRecords, total] = await Promise.all([
      SavedJob.find(filter)
        .populate({
          path: "job",
          populate: {
            path: "client",
            select: "fullName username avatar",
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SavedJob.countDocuments(filter),
    ]);

    // Extract valid populated jobs
    const jobs = savedRecords
      .map((record) => {
        const jobDoc = record.job as any;
        if (!jobDoc) return null;
        const jobObj = jobDoc.toObject ? jobDoc.toObject() : jobDoc;
        return {
          ...jobObj,
          isSaved: true,
          savedAt: record.createdAt,
        };
      })
      .filter(Boolean);

    return {
      jobs,
      ...createPaginationMeta(total, page, limit),
    };
  }

  /**
   * Helper to retrieve a Set of saved job IDs for a given user out of a batch of job IDs.
   */
  static async getUserSavedJobIdSet(
    userId: string,
    jobIds: (Types.ObjectId | string)[]
  ): Promise<Set<string>> {
    if (!userId || !jobIds.length) return new Set();

    const objectIds = jobIds.map((id) =>
      typeof id === "string" ? new Types.ObjectId(id) : id
    );

    const saved = await SavedJob.find({
      user: new Types.ObjectId(userId),
      job: { $in: objectIds },
    }).select("job");

    return new Set(saved.map((s) => s.job.toString()));
  }
}
