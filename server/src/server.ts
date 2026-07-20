import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./database/connectDB";

const startServer = async () => {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(
        `🚀 Freelancr API running on http://localhost:${env.PORT}`
      );
    });
  } catch (error) {
    console.error(error);
  }
};

startServer();