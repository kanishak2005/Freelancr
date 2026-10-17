import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { MilestoneService } from "./milestone.service";

export class MilestoneController {
  static async create(req: AuthRequest, res: Response) {
    const contractId = (req.params.contractId || req.body.contractId) as string;

    const milestone = await MilestoneService.createMilestone(req.user!.id, {
      contractId,
      title: req.body.title,
      description: req.body.description,
      amount: Number(req.body.amount),
      dueDate: req.body.dueDate,
      sequence: Number(req.body.sequence),
    });

    return res.status(201).json({
      success: true,
      message: "Milestone created successfully",
      data: milestone,
    });
  }

  static async getByContract(req: AuthRequest, res: Response) {
    const contractId = req.params.contractId as string;

    const milestones = await MilestoneService.getMilestonesByContract(
      req.user!.id,
      contractId,
      req.user?.role
    );

    return res.status(200).json({
      success: true,
      data: milestones,
    });
  }

  static async getById(req: AuthRequest, res: Response) {
    const id = req.params.id as string;

    const milestone = await MilestoneService.getMilestoneById(
      req.user!.id,
      id,
      req.user?.role
    );

    return res.status(200).json({
      success: true,
      data: milestone,
    });
  }

  static async updatePlanned(req: AuthRequest, res: Response) {
    const id = req.params.id as string;

    const milestone = await MilestoneService.updatePlannedMilestone(
      req.user!.id,
      id,
      {
        title: req.body.title,
        description: req.body.description,
        amount:
          req.body.amount !== undefined ? Number(req.body.amount) : undefined,
        dueDate: req.body.dueDate,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Milestone updated successfully",
      data: milestone,
    });
  }

  static async cancel(req: AuthRequest, res: Response) {
    const id = req.params.id as string;

    const milestone = await MilestoneService.cancelMilestone(req.user!.id, id);

    return res.status(200).json({
      success: true,
      message: "Milestone cancelled successfully",
      data: milestone,
    });
  }
}
