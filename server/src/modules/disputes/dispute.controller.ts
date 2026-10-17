import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { DisputeService } from "./dispute.service";
import { HTTP_STATUS } from "../../shared";

export class DisputeController {
  static async openDispute(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const dispute = await DisputeService.openDispute({
      contractId: req.body.contractId,
      userId: req.user.id,
      reason: req.body.reason,
      description: req.body.description,
      evidence: req.body.evidence,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: "Dispute opened successfully. Contract actions and payouts are locked pending review.",
      data: dispute,
    });
  }

  static async addEvidence(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const dispute = await DisputeService.addEvidence({
      disputeId: req.params.id as string,
      userId: req.user.id,
      url: req.body.url,
      publicId: req.body.publicId,
      name: req.body.name,
      notes: req.body.notes,
    });

    return res.status(200).json({
      success: true,
      message: "Evidence submitted successfully",
      data: dispute,
    });
  }

  static async getMyDisputes(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;

    const result = await DisputeService.getUserDisputes(req.user.id, { page, limit, status });

    return res.status(200).json({
      success: true,
      data: result.disputes,
      pagination: result.pagination,
    });
  }

  static async getDisputeById(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const dispute = await DisputeService.getDisputeById(req.params.id as string, req.user.id, req.user.role);

    return res.status(200).json({
      success: true,
      data: dispute,
    });
  }

  // Admin routes
  static async getAllDisputes(req: AuthRequest, res: Response) {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const status = req.query.status as string;
    const reason = req.query.reason as string;

    const result = await DisputeService.getAllDisputes({ page, limit, status, reason });

    return res.status(200).json({
      success: true,
      data: result.disputes,
      pagination: result.pagination,
    });
  }

  static async resolveDispute(req: AuthRequest, res: Response) {
    if (!req.user) return res.status(401).json({ success: false, message: "Unauthorized" });

    const dispute = await DisputeService.resolveDispute({
      disputeId: req.params.id as string,
      adminId: req.user.id,
      status: req.body.status,
      resolution: req.body.resolution,
      resolutionNotes: req.body.resolutionNotes,
    });

    return res.status(200).json({
      success: true,
      message: "Dispute resolved successfully",
      data: dispute,
    });
  }
}
