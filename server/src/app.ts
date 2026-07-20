import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import jobRoutes from "./modules/jobs/job.routes";
import proposalRoutes from "./modules/proposals/proposal.routes";
import contractRoutes from "./modules/contracts/contract.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import chatRoutes from "./modules/chat/chat.routes";
//import notificationRoutes from "./modules/notifications/notification.routes";
import uploadRoutes from "./modules/uploads/upload.routes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"))
);

// Routes MUST come after express.json()
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/proposals", proposalRoutes);
app.use("/api/v1/contracts", contractRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use(
  "/api/v1/reviews",
  reviewRoutes
);
app.use("/api/v1/chat", chatRoutes);
//app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/upload", uploadRoutes);

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
  });
});

export default app;