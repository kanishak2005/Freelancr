import { Response, Request } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { PaymentService } from "./payment.service";
import { PayoutService } from "./payout.service";
import { PayoutEligibilityService } from "./payoutEligibility.service";
import { WalletService } from "./wallet.service";
import { PlatformFinanceService } from "./platformFinance.service";
import { ContractRepository } from "../contracts/contract.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class PaymentController {
  
  static async createOrder(
    req: AuthRequest,
    res: Response
  ) {

    const result =
      await PaymentService.createOrder(
        req.user!.id,
        req.body.contract
      );

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: result,
    });
  }


  static async verify(
  req: AuthRequest,
  res: Response
) {

    const result =
  await PaymentService.verifyPayment(
    req.user!.id,
    req.body.razorpay_order_id,
    req.body.razorpay_payment_id,
    req.body.razorpay_signature
  );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.payment,
    });
  }


  static async getPayment(
    req: AuthRequest,
    res: Response
  ) {

    const payment =
      await PaymentService.getPayment(
        req.params.id as string,
        req.user!.id,
        req.user!.role
      );

    return res.status(200).json({
      success: true,
      data: payment,
    });
  }

  static async webhook(req: Request, res: Response) {
    const result = await PaymentService.handleWebhook(
      req.body,
      req.headers["x-razorpay-signature"] as string,
      req.headers["x-razorpay-event-id"] as string
    );

    return res.status(200).json({
      success: true,
      message: result?.message || "Webhook processed successfully",
    });
  }

  static async myPayments(
    req: AuthRequest,
    res: Response
  ) {

    const payments =
      await PaymentService.getMyPayments(
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: payments,
    });
  }


  static async refund(
    req: AuthRequest,
    res: Response
  ) {

    const result =
  await PaymentService.refund(
    req.params.id as string,
    req.user!.id,
    req.body.amount
  );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.payment,
    });
  }

  static async getMyPayouts(
    req: AuthRequest,
    res: Response
  ) {
    const result = await PayoutService.getMyPayouts(
      req.user!.id,
      {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      }
    );

    return res.status(200).json({
      success: true,
      data: result.payouts,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }

  static async getEligibility(
    req: AuthRequest,
    res: Response
  ) {
    const contract = await ContractRepository.findById(
      req.params.contractId as string
    );

    if (!contract) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Contract not found");
    }

    const clientId =
      (contract.client as any)?._id?.toString() ??
      contract.client?.toString();
    const freelancerId =
      (contract.freelancer as any)?._id?.toString() ??
      contract.freelancer?.toString();
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (
      userId !== clientId &&
      userId !== freelancerId &&
      userRole !== "admin"
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized to view financial eligibility for this contract"
      );
    }

    const result = await PayoutEligibilityService.evaluateEligibility({
      contractId: req.params.contractId as string,
      milestoneId: req.query.milestoneId as string | undefined,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async executePayout(
    req: AuthRequest,
    res: Response
  ) {
    const payout = await PayoutService.executePayout(
      req.params.id as string,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      message: "Payout execution triggered successfully",
      data: payout,
    });
  }

  static async reconcilePayout(
    req: AuthRequest,
    res: Response
  ) {
    const result = await PayoutService.reconcilePayout(
      req.params.id as string,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      message: "Payout reconciled successfully",
      data: result,
    });
  }

  static async getAdminPayouts(
    req: AuthRequest,
    res: Response
  ) {
    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.contract) {
      filter.contract = req.query.contract;
    }

    const result = await PayoutService.getAdminPayouts(filter, {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    });

    return res.status(200).json({
      success: true,
      data: result.payouts,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  }

  // ==========================================
  // FREELANCER WALLET
  // ==========================================

  static async getMyWallet(req: AuthRequest, res: Response) {
    const data = await WalletService.getWalletDetails(req.user!.id);
    return res.status(200).json({
      success: true,
      data,
    });
  }

  static async requestCashout(req: AuthRequest, res: Response) {
    const amount = Number(req.body.amount);
    const beneficiaryNotes = req.body.beneficiaryNotes as string | undefined;
    const result = await WalletService.requestCashout(req.user!.id, amount, beneficiaryNotes);
    return res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  }

  static async getMyCashouts(req: AuthRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;

    const result = await WalletService.getMyCashouts(req.user!.id, {
      page,
      limit,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  }

  static async cancelCashout(req: AuthRequest, res: Response) {
    const result = await WalletService.cancelCashout(
      req.params.id as string,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  }

  static async getAdminCashouts(req: AuthRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const status = req.query.status as string | undefined;

    const result = await WalletService.getAdminCashouts({
      page,
      limit,
      status,
    });

    return res.status(200).json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  }

  static async approveCashout(req: AuthRequest, res: Response) {
    const result = await WalletService.approveCashout(
      req.params.id as string,
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  }

  static async rejectCashout(req: AuthRequest, res: Response) {
    const reason = req.body.reason as string;
    const result = await WalletService.rejectCashout(
      req.params.id as string,
      req.user!.id,
      reason
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  }

  static async approveEarningsToWallet(req: AuthRequest, res: Response) {
    const result = await WalletService.approveEarningsToWallet(
      req.params.id as string,
      req.user!.id
    );
    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  }

  // ==========================================
  // ADMIN PLATFORM FINANCE
  // ==========================================

  static async getPlatformFinance(req: AuthRequest, res: Response) {
    const data = await PlatformFinanceService.getPlatformFinanceOverview();
    return res.status(200).json({
      success: true,
      data,
    });
  }

  static async getPlatformLedger(req: AuthRequest, res: Response) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const eventType = req.query.eventType as string | undefined;
    const contractId = req.query.contractId as string | undefined;

    const data = await PlatformFinanceService.getPlatformLedger({
      page,
      limit,
      eventType,
      contractId,
    });

    return res.status(200).json({
      success: true,
      data: data.entries,
      pagination: data.pagination,
    });
  }
}