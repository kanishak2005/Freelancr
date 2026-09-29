import { Response, Request } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { PaymentService } from "./payment.service";

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
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      data: payment,
    });
  }

  static async webhook(req: Request, res: Response) {
  await PaymentService.handleWebhook(
    req.body,
    req.headers["x-razorpay-signature"] as string
  );

  return res.status(200).json({
    success: true,
    message: "Webhook processed successfully",
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
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.payment,
    });
  }
}