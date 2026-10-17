import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { AdminService } from "./admin.service";

export class AdminController {

  static async getDashboard(
    _req: AuthRequest,
    res: Response
  ) {

    const stats =
      await AdminService.getDashboardStats();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  }


  static async getUsers(
    req: AuthRequest,
    res: Response
  ) {

    const result =
      await AdminService.getUsers(
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
        req.query.role as string | undefined,
        req.query.isActive !== undefined
          ? req.query.isActive === "true"
          : undefined
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }


  static async getUser(
    req: AuthRequest,
    res: Response
  ) {

    const user =
      await AdminService.getUser(
        req.params.id as string
      );

    return res.status(200).json({
      success: true,
      data: user,
    });
  }


  static async updateUserStatus(
    req: AuthRequest,
    res: Response
  ) {

    const user =
      await AdminService.updateUserStatus(
        req.params.id as string,
        req.body.isActive,
        req.user?.id,
        req.user?.role,
        (req as any).id
      );

    return res.status(200).json({
      success: true,
      message: "User status updated successfully",
      data: user,
    });
  }


  static async verifyUser(
    req: AuthRequest,
    res: Response
  ) {

    const user =
      await AdminService.verifyUser(
        req.params.id as string,
        req.user?.id,
        req.user?.role,
        (req as any).id
      );

    return res.status(200).json({
      success: true,
      message: "User verified successfully",
      data: user,
    });
  }


  static async deleteUser(
    req: AuthRequest,
    res: Response
  ) {

    const result =
      await AdminService.deleteUser(
        req.params.id as string,
        req.user?.id,
        req.user?.role,
        (req as any).id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }


  static async getJobs(
    req: AuthRequest,
    res: Response
  ) {

    const result =
      await AdminService.getJobs(
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
        req.query.status as string | undefined
      );

    return res.status(200).json({
      success: true,
      data: result,
    });
  }


  static async updateJobStatus(
    req: AuthRequest,
    res: Response
  ) {

    const job =
      await AdminService.updateJobStatus(
        req.params.id as string,
        req.body.status,
        req.user?.id,
        req.user?.role,
        (req as any).id
      );

    return res.status(200).json({
      success: true,
      message: "Job status updated successfully",
      data: job,
    });
  }


  static async deleteJob(
    req: AuthRequest,
    res: Response
  ) {

    const result =
      await AdminService.deleteJob(
        req.params.id as string,
        req.user?.id,
        req.user?.role,
        (req as any).id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  static async getAuditLogs(
    req: AuthRequest,
    res: Response
  ) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const action = req.query.action as string | undefined;
    const targetType = req.query.targetType as string | undefined;

    const result = await AdminService.getAuditLogs(page, limit, action, targetType);

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  }

  static async getHealth(
    _req: AuthRequest,
    res: Response
  ) {
    const health = await AdminService.getSystemHealth();
    return res.status(200).json({
      success: true,
      data: health,
    });
  }

  static async getGatewayDiagnostics(
    _req: AuthRequest,
    res: Response
  ) {
    const diagnostics = await AdminService.getGatewayDiagnostics();
    return res.status(200).json({
      success: true,
      data: diagnostics,
    });
  }

  static async getCommissionSummary(
    _req: AuthRequest,
    res: Response
  ) {
    const summary = await AdminService.getCommissionSummary();
    return res.status(200).json({
      success: true,
      data: summary,
    });
  }

  static async getCommissionLedger(
    req: AuthRequest,
    res: Response
  ) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const result = await AdminService.getCommissionLedger(page, limit);
    return res.status(200).json({
      success: true,
      data: result.entries,
      pagination: result.pagination,
    });
  }
}