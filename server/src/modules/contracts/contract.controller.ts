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
        req.body.proposalId
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
    const contracts =
      await ContractService.getMyContracts(
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: contracts,
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
      message: "Contract completed successfully",
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
}