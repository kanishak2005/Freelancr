import http from "http";
import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./database/connectDB";
import { initSocket } from "./services/socket.service";

const startServer = async () => {
  try {
    await connectDB();

    const server = http.createServer(app);

    initSocket(server);

    const serverInstance = server.listen(env.PORT, () => {
      console.log(
        `🚀 Freelancr API running on http://localhost:${env.PORT}`
      );
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
      serverInstance.close(async () => {
        console.log("🔒 HTTP server closed.");
        try {
          const mongoose = await import("mongoose");
          await mongoose.default.connection.close(false);
          console.log("💾 MongoDB connection closed.");
          process.exit(0);
        } catch (err) {
          console.error("❌ Error closing MongoDB connection:", err);
          process.exit(1);
        }
      });

      // Force exit after 10s if shutdown hangs
      setTimeout(() => {
        console.error("⚠️ Forcefully terminating after timeout.");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error("Fatal startup error:", error);
    process.exit(1);
  }
};

startServer();