import { Request, Response } from "express";
import { AnalyticsService } from "./analytics.service";

export class AnalyticsController {

  static async getPlatformOverview(
    _req: Request,
    res: Response
  ) {
    const analytics =
      await AnalyticsService.getPlatformOverview();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  }


  static async getUserAnalytics(
    _req: Request,
    res: Response
  ) {
    const analytics =
      await AnalyticsService.getUserAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  }


  static async getJobAnalytics(
    _req: Request,
    res: Response
  ) {
    const analytics =
      await AnalyticsService.getJobAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  }


  static async getProposalAnalytics(
    _req: Request,
    res: Response
  ) {
    const analytics =
      await AnalyticsService.getProposalAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  }


  static async getContractAnalytics(
    _req: Request,
    res: Response
  ) {
    const analytics =
      await AnalyticsService.getContractAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  }


  static async getPaymentAnalytics(
    _req: Request,
    res: Response
  ) {
    const analytics =
      await AnalyticsService.getPaymentAnalytics();

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  }
}