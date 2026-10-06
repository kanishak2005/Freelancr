import crypto from "crypto";

import { PaymentRepository } from "./payment.repository";
import { ContractRepository } from "../contracts/contract.repository";
import { ApiError, HTTP_STATUS } from "../../shared";
import razorpay from "../../config/razorpay";
import { NotificationService } from "../notifications/notification.service";
import { env } from "../../config/env";
export class PaymentService {

  // ==========================================
  // CREATE RAZORPAY ORDER
  // ==========================================
  static async handleWebhook(
  rawBody: Buffer,
  signature: string
) {
  if (!signature) {
    throw new ApiError(400, "Missing Razorpay webhook signature");
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new ApiError(400, "Invalid webhook signature");
  }

  const payload = JSON.parse(rawBody.toString("utf8"));

  const event = payload.event;

  if (event === "payment.captured") {
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity) {
      throw new ApiError(400, "Invalid payment webhook payload");
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    if (!orderId) {
      throw new ApiError(400, "Order ID missing from webhook");
    }

    const payment = await PaymentRepository.findByOrderId(orderId);

    if (!payment) {
      throw new ApiError(404, "Payment record not found");
    }

    if (payment.status === "paid") {
      return;
    }

    await PaymentRepository.updateByOrderId(orderId, {
      razorpayPaymentId: paymentId,
      status: "paid",
      paidAt: new Date(),
    });
  }

  if (event === "payment.failed") {
    const paymentEntity = payload.payload?.payment?.entity;

    if (!paymentEntity) {
      throw new ApiError(400, "Invalid payment webhook payload");
    }

    const orderId = paymentEntity.order_id;

    if (!orderId) {
      return;
    }

    const payment = await PaymentRepository.findByOrderId(orderId);

    if (!payment) {
      return;
    }

    if (payment.status === "paid") {
      return;
    }

    await PaymentRepository.updateByOrderId(orderId, {
      status: "failed",
    });
  }
}

  static async createOrder(
    userId: string,
    contractId: string
  ) {

    const contract =
      await ContractRepository.findById(contractId);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    // Verify that the logged-in user is the client
    const clientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    if (clientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the client can make this payment"
      );
    }

    // Payment is only allowed for active contracts
    if (contract.status !== "active") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment can only be made for an active contract"
      );
    }

    // Check whether this contract is already paid
    const existingPayments =
      await PaymentRepository.findByUser(userId);

    const alreadyPaid =
      existingPayments.some(
        (payment: any) =>
          payment.contract?._id?.toString() ===
            contract._id.toString() &&
          payment.status === "paid"
      );

    if (alreadyPaid) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "This contract has already been paid"
      );
    }

    // IMPORTANT:
    // Amount comes from the contract, not the frontend.
    const amount = contract.amount;

    if (!amount || amount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid contract amount"
      );
    }

    // Razorpay uses paise
    const options = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `contract_${contract._id}`,
    };

    const order =
      await razorpay.orders.create(options);

    const payment =
      await PaymentRepository.create({
        contract: contract._id,
        client: contract.client,
        freelancer: contract.freelancer,
        amount,
        currency: "INR",
        razorpayOrderId: order.id,
        status: "created",
      });

    return {
      payment,
      order,
    };
  }


  // ==========================================
  // VERIFY RAZORPAY PAYMENT
  // ==========================================

   static async verifyPayment(
    userId: string,
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string
  ) {
    const payment =
      await PaymentRepository.findByOrderId(
        razorpay_order_id
      );

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Payment not found"
      );
    }

    const clientId =
      (payment.client as any)?._id?.toString() ??
      payment.client?.toString();

    if (clientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You are not authorized to verify this payment"
      );
    }

      if (
      payment.status === "paid" ||
      payment.status === "partially_refunded"
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment has already been verified"
      );
    }

    if (payment.status === "refunded") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment has already been refunded"
      );
    }

    if (!razorpay_payment_id || !razorpay_signature) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment verification details are required"
      );
    }

    const secret =
      env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Razorpay secret is not configured"
      );
    }

    const generatedSignature =
      crypto
        .createHmac("sha256", secret)
        .update(
          `${payment.razorpayOrderId}|${razorpay_payment_id}`
        )
        .digest("hex");

    const expectedBuffer =
      Buffer.from(generatedSignature);

    const receivedBuffer =
      Buffer.from(razorpay_signature);

    if (
      expectedBuffer.length !==
      receivedBuffer.length ||
      !crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      )
    ) {
      await PaymentRepository.updateByOrderId(
        payment.razorpayOrderId,
        {
          status: "failed",
        }
      );

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid payment signature"
      );
    }

    const existingPayment =
      await PaymentRepository.findByPaymentId(
        razorpay_payment_id
      );

    if (
      existingPayment &&
      existingPayment._id.toString() !==
        payment._id.toString()
    ) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "This Razorpay payment is already associated with another payment"
      );
    }

    let razorpayPayment: any;

    try {
      razorpayPayment =
        await razorpay.payments.fetch(
          razorpay_payment_id
        );
    } catch (error) {
      console.error(
        "Failed to fetch Razorpay payment:",
        error
      );

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Unable to verify payment with Razorpay"
      );
    }

    if (
      razorpayPayment.order_id !==
      payment.razorpayOrderId
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment does not belong to this order"
      );
    }

    const expectedAmount =
      Math.round(payment.amount * 100);

    if (
      Number(razorpayPayment.amount) !==
      expectedAmount
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment amount does not match the order"
      );
    }

    if (
      razorpayPayment.currency !==
      payment.currency
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment currency does not match the order"
      );
    }

    if (
      razorpayPayment.status !== "captured"
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment has not been captured by Razorpay"
      );
    }

    const updatedPayment =
      await PaymentRepository.updateByOrderId(
        razorpay_order_id,
        {
          razorpayPaymentId:
            razorpay_payment_id,

          razorpaySignature:
            razorpay_signature,

          status: "paid",

          paidAt: new Date(),
        }
      );

    if (!updatedPayment) {
      throw new ApiError(
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        "Failed to update payment"
      );
    }

    const contract =
      await ContractRepository.findById(
        updatedPayment.contract.toString()
      );

    if (contract) {
      await NotificationService.createNotification({
        recipient: contract.freelancer,
        sender: contract.client,
        title: "Payment Received",
        message: `Payment for the contract "${contract.title}" has been received.`,
        type: "payment",
      });
    }

    await NotificationService.createNotification({
      recipient: payment.freelancer.toString(),
      sender: payment.client.toString(),
      title: "Payment Received",
      message: `Payment of ₹${payment.amount} has been successfully received for the contract "${(payment.contract as any).title}".`,
      type: "payment",
    });

    return {
      message: "Payment verified successfully",
      payment: updatedPayment,
    };
  }


  // ==========================================
  // GET PAYMENT
  // ==========================================

  static async getPayment(
    id: string,
    userId: string
  ) {

    const payment =
      await PaymentRepository.findById(id);

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Payment not found"
      );
    }

    const clientId =
      (payment.client as any)._id?.toString() ??
      payment.client.toString();

    const freelancerId =
      (payment.freelancer as any)._id?.toString() ??
      payment.freelancer.toString();

    if (
      clientId !== userId &&
      freelancerId !== userId
    ) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Not authorized to view this payment"
      );
    }

    return payment;
  }


  // ==========================================
  // GET MY PAYMENTS
  // ==========================================

  static async getMyPayments(
    userId: string
  ) {

    return PaymentRepository.findByUser(
      userId
    );
  }


  // ==========================================
  // REFUND PAYMENT
  // ==========================================

     static async refund(
    id: string,
    userId: string,
    requestedAmount?: number
  ) {
    const payment =
      await PaymentRepository.findById(id);

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Payment not found"
      );
    }

    const clientId =
      (payment.client as any)._id?.toString() ??
      payment.client.toString();

    if (clientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only the client can request a refund"
      );
    }

    if (
      payment.status !== "paid" &&
      payment.status !== "partially_refunded"
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment is not refundable"
      );
    }

    if (!payment.razorpayPaymentId) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Razorpay payment ID is missing"
      );
    }

    let razorpayPayment: any;

    try {
      razorpayPayment =
        await razorpay.payments.fetch(
          payment.razorpayPaymentId
        );
    } catch (error: any) {
      console.error("Failed to fetch Razorpay payment:", {
        statusCode: error?.statusCode,
        code: error?.error?.code,
        description: error?.error?.description,
        reason: error?.error?.reason,
      });

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Unable to verify payment with Razorpay"
      );
    }

    if (
      razorpayPayment.order_id !==
      payment.razorpayOrderId
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment does not belong to this order"
      );
    }

    if (
      razorpayPayment.status !== "captured"
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment has not been captured by Razorpay"
      );
    }

    const originalAmount =
      Math.round(payment.amount * 100);

    const amountAlreadyRefunded =
      Number(
        razorpayPayment.amount_refunded ?? 0
      );

    const remainingAmount =
      originalAmount - amountAlreadyRefunded;

    if (remainingAmount <= 0) {
      await PaymentRepository.update(
        id,
        {
          status: "refunded",
          refundedAmount: payment.amount,
        }
      );

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment has already been fully refunded"
      );
    }

    const refundAmount =
      requestedAmount === undefined
        ? remainingAmount
        : Math.round(requestedAmount * 100);

    if (refundAmount <= 0) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Refund amount must be greater than 0"
      );
    }

    if (refundAmount > remainingAmount) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        `Refund amount cannot exceed the remaining refundable amount of ₹${remainingAmount / 100}`
      );
    }

    try {
      await razorpay.payments.refund(
        payment.razorpayPaymentId,
        {
          amount: refundAmount,
        }
      );
    } catch (error: any) {
      console.error("Razorpay refund failed:", {
        statusCode: error?.statusCode,
        code: error?.error?.code,
        description: error?.error?.description,
        reason: error?.error?.reason,
      });

      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Refund could not be processed by Razorpay"
      );
    }

    const totalRefunded =
      amountAlreadyRefunded + refundAmount;

    const refundedAmountInRupees =
      totalRefunded / 100;

    const fullyRefunded =
      totalRefunded >= originalAmount;

    const updatedPayment =
      await PaymentRepository.update(
        id,
        {
          refundedAmount: refundedAmountInRupees,
          status: fullyRefunded
            ? "refunded"
            : "partially_refunded",
        }
      );

    if (updatedPayment) {
      await NotificationService.createNotification({
        recipient: payment.freelancer,
        sender: payment.client,
        title: fullyRefunded
          ? "Payment Refunded"
          : "Partial Payment Refund",
        message: fullyRefunded
          ? `The payment for the contract "${(payment.contract as any).title}" has been fully refunded.`
          : `A partial refund of ₹${refundAmount / 100} was processed for the contract "${(payment.contract as any).title}".`,
        type: "payment",
      });
    }

    return {
      message: fullyRefunded
        ? "Payment refunded successfully"
        : "Partial refund processed successfully",
      payment: updatedPayment,
    };
  }
}

