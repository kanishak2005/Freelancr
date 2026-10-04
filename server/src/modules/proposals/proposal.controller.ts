import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ProposalService } from "./proposal.service";

export class ProposalController {
  static async apply(
    req: AuthRequest,
    res: Response
  ) {
    const proposal =
      await ProposalService.apply(
        req.user!.id,
        req.body
      );

    return res.status(201).json({
      success: true,
      message: "Proposal submitted successfully",
      data: proposal,
    });
  }

  static async getProposal(
    req: AuthRequest,
    res: Response
  ) {
    const proposal =
      await ProposalService.getProposal(
        req.params.id as string,
        req.user!.id,
        req.user!.role
      );

    return res.status(200).json({
      success: true,
      data: proposal,
    });
  }

  static async getMyProposals(
    req: AuthRequest,
    res: Response
  ) {
    const proposals =
      await ProposalService.getMyProposals(
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: proposals,
    });
  }

  static async getJobProposals(
    req: AuthRequest,
    res: Response
  ) {
    const proposals =
      await ProposalService.getJobProposals(
        req.params.jobId as string,
        req.user!.id,
        req.user!.role
      );

    return res.status(200).json({
      success: true,
      data: proposals,
    });
  }

  static async updateProposal(
    req: AuthRequest,
    res: Response
  ) {
    const proposal =
      await ProposalService.updateProposal(
        req.params.id as string,
        req.user!.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Proposal updated successfully",
      data: proposal,
    });
  }

  static async withdrawProposal(
    req: AuthRequest,
    res: Response
  ) {
    const result =
      await ProposalService.withdrawProposal(
        req.params.id as string,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
}
