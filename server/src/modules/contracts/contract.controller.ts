import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ContractService } from "./contract.service";

export class ContractController {

  static async create(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.createFromProposal(
        req.user!.id,
        req.body.proposalId,
        req.body.executionMode
      );

    return res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: contract,
    });
  }

  static async get(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.getContract(
        req.params.id as string,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: contract,
    });
  }

  static async getMine(
    req: AuthRequest,
    res: Response
  ) {
    const result: any =
      await ContractService.getMyContracts(
        req.user!.id,
        req.query
      );

    if (result && result.contracts && result.totalPages !== undefined) {
      return res.status(200).json({
        success: true,
        data: result.contracts,
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

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async complete(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.completeContract(
        req.params.id as string,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: "Contract completion/approval recorded successfully",
      data: contract,
    });
  }

  static async confirmCompletion(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.confirmCompletion(
        req.params.id as string,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: "Contract completion confirmed successfully",
      data: contract,
    });
  }

  static async cancel(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.cancelContract(
        req.params.id as string,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: "Contract cancelled successfully",
      data: contract,
    });
  }

  static async getTimeline(
    req: AuthRequest,
    res: Response
  ) {
    const timeline =
      await ContractService.getTimeline(
        req.params.id as string,
        req.user!.id,
        req.user!.role
      );

    return res.status(200).json({
      success: true,
      data: timeline,
    });
  }
}
