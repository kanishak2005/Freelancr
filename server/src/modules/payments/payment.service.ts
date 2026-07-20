import Razorpay from "razorpay";
import crypto from "crypto";
import { PaymentRepository } from "./payment.repository";
import { ContractRepository } from "../contracts/contract.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

import { env } from "../../config/env";

import razorpay from "../../config/razorpay";

export class PaymentService {
  static async createOrder(
    userId: string,
    contractId: string
  ) {
    const contract = await ContractRepository.findById(contractId);

    if (!contract) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Contract not found"
      );
    }

    const clientId =
      (contract.client as any)._id?.toString() ??
      contract.client.toString();

    if (clientId !== userId) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "Only client can pay"
      );
    }

    const options = {
      amount: contract.agreedAmount * 100,
      currency: "INR",
      receipt: `contract_${contract._id}`,
    };

    const order = await razorpay.orders.create(options);

    const payment = await PaymentRepository.create({
      contract: contract._id,
      client: contract.client,
      freelancer: contract.freelancer,
      amount: contract.agreedAmount,
      razorpayOrderId: order.id,
      status: "created",
    });

    return {
      payment,
      order,
    };
  }

  static async verifyPayment(
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

  await PaymentRepository.markPaid(
    razorpay_order_id,
    razorpay_payment_id
  );

  return {
    message: "Payment successful (DEV MODE)",
  };
}

  static async getPayment(id: string) {
    const payment =
      await PaymentRepository.findById(id);

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Payment not found"
      );
    }

    return payment;
  }

  static async getMyPayments(userId: string) {
    return PaymentRepository.findByUser(userId);
  }

  static async refund(id: string) {
    const payment =
      await PaymentRepository.findById(id);

    if (!payment) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "Payment not found"
      );
    }

    if (payment.status !== "paid") {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Payment is not completed"
      );
    }

    // Razorpay refund API can be integrated here later.

    await PaymentRepository.updateStatus(
      id,
      "refunded"
    );

    return {
      message: "Payment refunded successfully",
    };
  }
}