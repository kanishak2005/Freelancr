import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ContractService } from "./contract.service";

export class ContractController {
  static async create(req: AuthRequest, res: Response) {
    const contract = await ContractService.createContract(
      req.user!.id,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Contract created successfully",
      data: contract,
    });
  }

  static async get(req: Request, res: Response) {
    const contract = await ContractService.getContract(
      req.params.id
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

  static async update(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.updateContract(
        req.params.id,
        req.user!.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: "Contract updated successfully",
      data: contract,
    });
  }

  static async start(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.startContract(
        req.params.id,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: "Contract started successfully",
      data: contract,
    });
  }

  static async complete(
    req: AuthRequest,
    res: Response
  ) {
    const contract =
      await ContractService.completeContract(
        req.params.id,
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
        req.params.id,
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: "Contract cancelled successfully",
      data: contract,
    });
  }
}