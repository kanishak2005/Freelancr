import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { PaymentService } from "./payment.service";

export class PaymentController {
  static async createOrder(
    req: AuthRequest,
    res: Response
  ) {
    const result = await PaymentService.createOrder(
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
    req: Request,
    res: Response
  ) {
    const result = await PaymentService.verifyPayment(
      req.body.razorpay_order_id,
      req.body.razorpay_payment_id,
      req.body.razorpay_signature
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }

  static async getPayment(
    req: Request,
    res: Response
  ) {
    const payment = await PaymentService.getPayment(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      data: payment,
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
    req: Request,
    res: Response
  ) {
    const result =
      await PaymentService.refund(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
}