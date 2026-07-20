import { Payment } from "./payment.model";
import { IPayment } from "./payment.types";

export class PaymentRepository {
  static async create(data: Partial<IPayment>) {
    return Payment.create(data);
  }

  static async findById(id: string) {
    return Payment.findById(id)
      .populate("contract")
      .populate("client", "fullName username")
      .populate("freelancer", "fullName username");
  }

  static async findByOrderId(orderId: string) {
    return Payment.findOne({ razorpayOrderId: orderId });
  }

  static async findByPaymentId(paymentId: string) {
    return Payment.findOne({
      razorpayPaymentId: paymentId,
    });
  }

  static async findByUser(userId: string) {
    return Payment.find({
      $or: [
        { client: userId },
        { freelancer: userId },
      ],
    })
      .populate("contract")
      .sort({ createdAt: -1 });
  }

  static async update(
    id: string,
    data: Partial<IPayment>
  ) {
    return Payment.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  static async updateByOrderId(
    orderId: string,
    data: Partial<IPayment>
  ) {
    return Payment.findOneAndUpdate(
      { razorpayOrderId: orderId },
      data,
      { new: true }
    );
  }
  static async markPaid(
  orderId: string,
  paymentId: string
) {
  return Payment.findOneAndUpdate(
    {
      razorpayOrderId: orderId,
    },
    {
      razorpayPaymentId: paymentId,
      status: "paid",
    },
    {
      new: true,
    }
  );
}
static async updateStatus(
  id: string,
  status: string
) {
  return Payment.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );
}
}