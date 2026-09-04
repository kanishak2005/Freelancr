import { Router } from "express";

import { AnalyticsController } from "./analytics.controller";

import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";

const router = Router();


// All analytics routes require admin access
router.use(
  authenticate,
  authorize("admin")
);


// Platform overview
router.get(
  "/overview",
  AnalyticsController.getPlatformOverview
);


// User analytics
router.get(
  "/users",
  AnalyticsController.getUserAnalytics
);


// Job analytics
router.get(
  "/jobs",
  AnalyticsController.getJobAnalytics
);


// Proposal analytics
router.get(
  "/proposals",
  AnalyticsController.getProposalAnalytics
);


// Contract analytics
router.get(
  "/contracts",
  AnalyticsController.getContractAnalytics
);


// Payment analytics
router.get(
  "/payments",
  AnalyticsController.getPaymentAnalytics
);


export default router;