import { Types } from "mongoose";
import { Job } from "./job.model";
import { IJob } from "./job.types";
import { Review } from "../reviews/review.model";
import { Contract } from "../contracts/contract.model";
import { SavedJobService } from "./savedJob.service";
import { MatchScoreService } from "./matchScore.service";
import { UserRepository } from "../users/user.repository";
import {
  getPaginationParams,
  createPaginationMeta,
  type PaginationOptions,
} from "../../utils/pagination";

export interface JobFilterParams {
  q?: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: "fixed" | "hourly";
  experienceLevel?: "entry" | "intermediate" | "expert";
  isRemote?: boolean;
  status?: string;
  proposalCountMax?: number;
  sort?: "newest" | "highest_budget" | "lowest_budget" | "lowest_competition";
}

export class JobRepository {
  static async create(job: Partial<IJob>) {
    return Job.create(job);
  }

  static async findById(id: string) {
    return Job.findById(id).populate(
      "client",
      "fullName username avatar"
    );
  }

  /**
   * Enhanced marketplace discovery query with:
   * - Explicit Mongo filter construction (escaped regex, allowlisted fields)
   * - Allowlisted sort fields
   * - Batch client trust metrics (rating, review count, completed contracts) without N+1
   * - Saved state resolution for authenticated users
   * - Pure deterministic match scoring for authenticated freelancers
   */
  static async findWithTrustAndMatching(
    filters: JobFilterParams = {},
    options?: PaginationOptions,
    userContext?: { id?: string; role?: string }
  ) {
    const { page, limit, skip } = getPaginationParams(options);

    // 1. Explicit Mongo filter construction
    const mongoFilter: Record<string, unknown> = {};

    // Search query bounded to 100 characters with escaped regex
    if (typeof filters.q === "string" && filters.q.trim()) {
      const escaped = filters.q.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      mongoFilter.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
        { skills: regex },
      ];
    }

    if (typeof filters.category === "string" && filters.category.trim()) {
      mongoFilter.category = filters.category.trim();
    }

    if (filters.budgetType && ["fixed", "hourly"].includes(filters.budgetType)) {
      mongoFilter.budgetType = filters.budgetType;
    }

    if (
      filters.experienceLevel &&
      ["entry", "intermediate", "expert"].includes(filters.experienceLevel)
    ) {
      mongoFilter.experienceLevel = filters.experienceLevel;
    }

    if (typeof filters.isRemote === "boolean") {
      mongoFilter.isRemote = filters.isRemote;
    }

    if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
      const budgetQuery: Record<string, number> = {};
      if (typeof filters.budgetMin === "number" && !isNaN(filters.budgetMin)) {
        budgetQuery.$gte = Math.max(0, filters.budgetMin);
      }
      if (typeof filters.budgetMax === "number" && !isNaN(filters.budgetMax)) {
        budgetQuery.$lte = Math.max(0, filters.budgetMax);
      }
      if (Object.keys(budgetQuery).length > 0) {
        mongoFilter.budget = budgetQuery;
      }
    }

    if (
      typeof filters.proposalCountMax === "number" &&
      !isNaN(filters.proposalCountMax)
    ) {
      mongoFilter.proposalsCount = { $lte: Math.max(0, filters.proposalCountMax) };
    }

    // Default status to 'open' unless specifically asked for another valid status
    if (
      filters.status &&
      ["open", "in_progress", "completed", "cancelled"].includes(filters.status)
    ) {
      mongoFilter.status = filters.status;
    } else {
      mongoFilter.status = "open";
    }

    // 2. Allowlisted sort criteria
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (filters.sort === "highest_budget") {
      sortObj = { budget: -1 };
    } else if (filters.sort === "lowest_budget") {
      sortObj = { budget: 1 };
    } else if (filters.sort === "lowest_competition") {
      sortObj = { proposalsCount: 1, createdAt: -1 };
    }

    // 3. Query jobs and total count in parallel
    const [rawJobs, total] = await Promise.all([
      Job.find(mongoFilter)
        .populate("client", "fullName username avatar")
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Job.countDocuments(mongoFilter),
    ]);

    // 4. Batch query client trust metrics without N+1
    const clientIds = Array.from(
      new Set(
        rawJobs
          .map((j) => (j.client as any)?._id?.toString())
          .filter(Boolean)
      )
    );
    const clientObjectIds = clientIds.map((id) => new Types.ObjectId(id));

    const [reviewAgg, contractAgg, savedJobSet, userDoc] = await Promise.all([
      clientObjectIds.length > 0
        ? Review.aggregate([
            { $match: { reviewee: { $in: clientObjectIds } } },
            {
              $group: {
                _id: "$reviewee",
                avgRating: { $avg: "$rating" },
                reviewCount: { $sum: 1 },
              },
            },
          ])
        : Promise.resolve([]),
      clientObjectIds.length > 0
        ? Contract.aggregate([
            {
              $match: {
                client: { $in: clientObjectIds },
                status: "completed",
              },
            },
            {
              $group: {
                _id: "$client",
                completedProjects: { $sum: 1 },
              },
            },
          ])
        : Promise.resolve([]),
      userContext?.id
        ? SavedJobService.getUserSavedJobIdSet(
            userContext.id,
            rawJobs.map((j) => j._id)
          )
        : Promise.resolve(new Set<string>()),
      userContext?.id && userContext.role === "freelancer"
        ? UserRepository.findById(userContext.id)
        : Promise.resolve(null),
    ]);

    const clientRatingMap = new Map<string, { rating: number; reviewCount: number }>();
    for (const r of reviewAgg) {
      clientRatingMap.set(r._id.toString(), {
        rating: Number(r.avgRating.toFixed(1)),
        reviewCount: r.reviewCount,
      });
    }

    const clientCompletedMap = new Map<string, number>();
    for (const c of contractAgg) {
      clientCompletedMap.set(c._id.toString(), c.completedProjects);
    }

    // 5. Enrich jobs projection with trust indicators and match score
    const jobs = rawJobs.map((jobDoc) => {
      const jobObj = jobDoc.toObject ? jobDoc.toObject() : jobDoc;
      const clientId = (jobObj.client as any)?._id?.toString();
      const stats = clientId ? clientRatingMap.get(clientId) : undefined;
      const completed = clientId ? clientCompletedMap.get(clientId) || 0 : 0;

      const clientObj = jobObj.client
        ? {
            ...jobObj.client,
            rating: stats ? stats.rating : 0,
            reviewCount: stats ? stats.reviewCount : 0,
            completedProjects: completed,
          }
        : undefined;

      const isSaved = savedJobSet.has(jobObj._id.toString());

      let matchScore = null;
      if (userDoc && userDoc.role === "freelancer") {
        matchScore = MatchScoreService.compute(
          {
            skills: userDoc.skills || [],
          },
          {
            skills: jobObj.skills || [],
            experienceLevel: jobObj.experienceLevel,
            category: jobObj.category,
            budget: jobObj.budget,
            budgetType: jobObj.budgetType,
            isRemote: jobObj.isRemote,
          }
        );
      }

      return {
        ...jobObj,
        client: clientObj,
        isSaved,
        matchScore,
      };
    });

    return {
      jobs,
      ...createPaginationMeta(total, page, limit),
    };
  }

  static async findAll(options?: PaginationOptions) {
    const { page, limit, skip } = getPaginationParams(options);

    const [jobs, total] = await Promise.all([
      Job.find()
        .populate(
          "client",
          "fullName username avatar"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(),
    ]);

    return {
      jobs,
      ...createPaginationMeta(total, page, limit),
    };
  }

  static async update(
    id: string,
    data: Partial<IJob>
  ) {
    return Job.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  static async delete(id: string) {
    return Job.findByIdAndDelete(id);
  }

  static async findByClient(
    clientId: string,
    options?: PaginationOptions
  ) {
    const { page, limit, skip } = getPaginationParams(options);
    const filter = { client: clientId };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    return {
      jobs,
      ...createPaginationMeta(total, page, limit),
    };
  }

  static async search(
    keyword: string,
    options?: PaginationOptions
  ) {
    const { page, limit, skip } = getPaginationParams(options);
    const filter = {
      $or: [
        {
          title: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          description: {
            $regex: keyword,
            $options: "i",
          },
        },
        {
          category: {
            $regex: keyword,
            $options: "i",
          },
        },
      ],
    };

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate(
          "client",
          "fullName username avatar"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filter),
    ]);

    return {
      jobs,
      ...createPaginationMeta(total, page, limit),
    };
  }

  static async filter(filters: any, options?: PaginationOptions) {
    const { page, limit, skip } = getPaginationParams(options);

    const [jobs, total] = await Promise.all([
      Job.find(filters)
        .populate(
          "client",
          "fullName username avatar"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit),
      Job.countDocuments(filters),
    ]);

    return {
      jobs,
      ...createPaginationMeta(total, page, limit),
    };
  }
  static async updateStatus(
  id: string,
  status: string
) {
  return Job.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
}
}