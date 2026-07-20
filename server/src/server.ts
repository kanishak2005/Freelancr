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

    server.listen(env.PORT, () => {
      console.log(
        `🚀 Freelancr API running on http://localhost:${env.PORT}`
      );
    });
  } catch (error) {
    console.error(error);
  }
};

startServer();