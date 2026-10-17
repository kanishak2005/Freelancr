import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { JobService } from "./job.service";
import { SavedJobService } from "./savedJob.service";

export class JobController {
  static async createJob(req: AuthRequest, res: Response) {

  const job = await JobService.createJob(
    req.user!.id,
    req.body
  );

  return res.status(201).json({
    success: true,
    message: "Job created successfully",
    data: job,
  });
}

  static async updateJob(req: AuthRequest, res: Response) {
    const job = await JobService.updateJob(
      req.params.id as string,
      req.user!.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Job updated successfully",
      data: job,
    });
  }

  static async deleteJob(req: AuthRequest, res: Response) {
    const result = await JobService.deleteJob(
      req.params.id as string,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  static async getJob(req: Request, res: Response) {
    const job = await JobService.getJob(req.params.id as string);

    return res.status(200).json({
      success: true,
      data: job,
    });
  }

  static async getAllJobs(req: Request, res: Response) {
    const authReq = req as AuthRequest;
    const userContext = authReq.user
      ? { id: authReq.user.id, role: authReq.user.role }
      : undefined;

    const result = await JobService.getAllJobs(req.query, userContext);

    return res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  }

  static async saveJob(req: AuthRequest, res: Response) {
    const result = await SavedJobService.saveJob(
      req.user!.id,
      req.params.id as string
    );
    return res.status(200).json(result);
  }

  static async unsaveJob(req: AuthRequest, res: Response) {
    const result = await SavedJobService.unsaveJob(
      req.user!.id,
      req.params.id as string
    );
    return res.status(200).json(result);
  }

  static async getSavedJobs(req: AuthRequest, res: Response) {
    const result = await SavedJobService.getSavedJobs(
      req.user!.id,
      req.query
    );

    return res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  }

  static async getMyJobs(req: AuthRequest, res: Response) {
    const result = await JobService.getMyJobs(req.user!.id, req.query);

    return res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  }

  static async searchJobs(req: Request, res: Response) {
    const result = await JobService.searchJobs(
      req.query.keyword as string,
      req.query
    );

    return res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  }

  static async filterJobs(req: Request, res: Response) {
    const result = await JobService.filterJobs(req.query, req.query);

    return res.status(200).json({
      success: true,
      data: result.jobs,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    });
  }
}

