import { Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { DeliverableService } from "./deliverable.service";

export class DeliverableController {
  static async submit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contractId = (req.params.contractId || req.body.contractId) as string;

      const deliverable = await DeliverableService.submitDeliverable(
        req.user!.id,
        {
          contractId,
          milestoneId: (req.body.milestone || req.body.milestoneId) as string | undefined,
          files: req.body.files,
          message: req.body.message,
        }
      );

      return res.status(201).json({
        success: true,
        message: "Deliverable submitted successfully",
        data: deliverable,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getByContract(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contractId = req.params.contractId as string;
      const milestoneId = req.query.milestone as string | undefined;

      const deliverables = await DeliverableService.getDeliverablesByContract(
        req.user!.id,
        req.user!.role,
        contractId,
        milestoneId
      );

      return res.status(200).json({
        success: true,
        message: "Deliverables retrieved successfully",
        data: deliverables,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deliverableId = req.params.id as string;

      const deliverable = await DeliverableService.getDeliverableById(
        req.user!.id,
        req.user!.role,
        deliverableId
      );

      return res.status(200).json({
        success: true,
        message: "Deliverable retrieved successfully",
        data: deliverable,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deliverableId = req.params.id as string;
      const routeContractId = req.params.contractId as string | undefined;

      const deliverable = await DeliverableService.approveDeliverable(
        req.user!.id,
        deliverableId,
        req.body?.message,
        routeContractId
      );

      return res.status(200).json({
        success: true,
        message: "Deliverable approved successfully",
        data: deliverable,
      });
    } catch (error) {
      next(error);
    }
  }

  static async requestChanges(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const deliverableId = req.params.id as string;
      const routeContractId = req.params.contractId as string | undefined;

      const deliverable = await DeliverableService.requestChanges(
        req.user!.id,
        deliverableId,
        req.body?.message,
        routeContractId
      );

      return res.status(200).json({
        success: true,
        message: "Changes requested on deliverable successfully",
        data: deliverable,
      });
    } catch (error) {
      next(error);
    }
  }
}


