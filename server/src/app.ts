import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import jobRoutes from "./modules/jobs/job.routes";
import proposalRoutes from "./modules/proposals/proposal.routes";
import contractRoutes from "./modules/contracts/contract.routes";
import milestoneRoutes from "./modules/milestones/milestone.routes";
import deliverableRoutes from "./modules/deliverables/deliverable.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import chatRoutes from "./modules/chat/chat.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import uploadRoutes from "./modules/uploads/upload.routes";
import adminRoutes from "./modules/admin/admin.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import supportRoutes from "./modules/support/supportTicket.routes";
import disputeRoutes from "./modules/disputes/dispute.routes";
import mongoose from "mongoose";
import { errorMiddleware } from "./middleware/error.middleware";
import { PaymentController } from "./modules/payments/payment.controller";
import { JobController } from "./modules/jobs/job.controller";
import { authenticate } from "./middleware/auth.middleware";
import { env } from "./config/env";
import { requestIdMiddleware } from "./middleware/requestId.middleware";
import { mongoSanitize } from "./middleware/mongoSanitize.middleware";

const app = express();

app.use(requestIdMiddleware);

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(morgan("dev"));
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.webhook
);

app.use(express.json({ limit: "10mb" }));
app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);
app.use(cookieParser());
app.use(mongoSanitize);

// Routes MUST come after express.json()
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/saved-jobs", authenticate, JobController.getSavedJobs);
app.use("/api/v1/proposals", proposalRoutes);
app.use("/api/v1/contracts", contractRoutes);
app.use("/api/v1/milestones", milestoneRoutes);
app.use("/api/v1/deliverables", deliverableRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use(
  "/api/v1/reviews",
  reviewRoutes
);
app.use("/api/v1/chat", chatRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/notifications", notificationRoutes
);  
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/support", supportRoutes);
app.use("/api/v1/disputes", disputeRoutes);

// Kubernetes / Cloud Health Probes (PRD 09)
app.get("/health/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/health/ready", async (_req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  if (!isDbReady) {
    return res.status(503).json({ status: "unhealthy", reason: "database_disconnected" });
  }

  try {
    // Live reachability check with bounded 2000ms timeout
    const db = mongoose.connection.db;
    if (db) {
      await Promise.race([
        db.admin().ping(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Ping timeout")), 2000)
        ),
      ]);
    }
    return res.status(200).json({ status: "ready" });
  } catch (error) {
    return res.status(503).json({ status: "unhealthy", reason: "database_unreachable" });
  }
});

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Freelancr API 🚀",
    documentation: "/api/v1/health",
    version: "v1",
  });
});

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Freelancr API is running 🚀",
    version: "v1",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.use(errorMiddleware);

export default app;
