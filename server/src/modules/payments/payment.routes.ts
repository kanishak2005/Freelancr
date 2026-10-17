import { Router } from "express";

import { PaymentController } from "./payment.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { validate } from "../../middleware/validate.middleware";
import { financialRateLimiter } from "../../middleware/rateLimit.middleware";

import {
  createOrderValidation,
  verifyPaymentValidation,
  refundValidation,
  paymentIdValidation,
  payoutIdValidation,
  payoutEligibilityValidation,
} from "./payment.validation";

const router = Router();

router.post(
  "/create-order",
  authenticate,
  authorize("client"),
  financialRateLimiter,
  createOrderValidation,
  validate,
  PaymentController.createOrder
);

router.post(
  "/verify",
  authenticate,
  authorize("client"),
  financialRateLimiter,
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
  "/my-payouts",
  authenticate,
  authorize("freelancer"),
  PaymentController.getMyPayouts
);

router.get(
  "/eligibility/:contractId",
  authenticate,
  payoutEligibilityValidation,
  validate,
  PaymentController.getEligibility
);

router.get(
  "/admin/payouts",
  authenticate,
  authorize("admin"),
  PaymentController.getAdminPayouts
);

router.post(
  "/payouts/:id/execute",
  authenticate,
  authorize("admin"),
  financialRateLimiter,
  payoutIdValidation,
  validate,
  PaymentController.executePayout
);

router.post(
  "/payouts/:id/reconcile",
  authenticate,
  authorize("admin"),
  financialRateLimiter,
  payoutIdValidation,
  validate,
  PaymentController.reconcilePayout
);

router.post(
  "/payouts/:id/approve-to-wallet",
  authenticate,
  authorize("admin"),
  financialRateLimiter,
  payoutIdValidation,
  validate,
  PaymentController.approveEarningsToWallet
);

router.get(
  "/wallet/my",
  authenticate,
  authorize("freelancer"),
  PaymentController.getMyWallet
);

router.post(
  "/wallet/cashout",
  authenticate,
  authorize("freelancer"),
  financialRateLimiter,
  PaymentController.requestCashout
);

router.get(
  "/platform/finance",
  authenticate,
  authorize("admin"),
  PaymentController.getPlatformFinance
);

router.get(
  "/platform/ledger",
  authenticate,
  authorize("admin"),
  PaymentController.getPlatformLedger
);

router.get(
  "/:id",
  authenticate,
  paymentIdValidation,
  validate,
  PaymentController.getPayment
);

router.patch(
  "/refund/:id",
  authenticate,
  authorize("client"),
  financialRateLimiter,
  paymentIdValidation,
  refundValidation,
  validate,
  PaymentController.refund
);

export default router;