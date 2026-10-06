import { Router } from "express";

import { PaymentController } from "./payment.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";

import {
  createOrderValidation,
  verifyPaymentValidation,
  refundValidation,
} from "./payment.validation";

const router = Router();

router.post(
  "/create-order",
  authenticate,
  createOrderValidation,
  validate,
  PaymentController.createOrder
);

router.post(
  "/verify",
  authenticate,
  verifyPaymentValidation,
  validate,
  PaymentController.verify
);

router.get(
  "/my-payments",
  authenticate,
  PaymentController.myPayments
);

router.get(
  "/:id",
  authenticate,
  PaymentController.getPayment
);

router.patch(
  "/refund/:id",
  authenticate,
  refundValidation,
  validate,
  PaymentController.refund
);

export default router;