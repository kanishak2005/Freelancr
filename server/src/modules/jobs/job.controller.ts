import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { JobService } from "./job.service";

export class JobController {
  static async createJob(req: AuthRequest, res: Response) {
  console.log("BODY:", req.body);

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

  static async getAllJobs(_req: Request, res: Response) {
    const jobs = await JobService.getAllJobs();

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  }

  static async getMyJobs(req: AuthRequest, res: Response) {
    const jobs = await JobService.getMyJobs(req.user!.id);

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  }

  static async searchJobs(req: Request, res: Response) {
    const jobs = await JobService.searchJobs(
      req.query.keyword as string
    );

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  }

  static async filterJobs(req: Request, res: Response) {
    const jobs = await JobService.filterJobs(req.query);

    return res.status(200).json({
      success: true,
      data: jobs,
    });
  }
}