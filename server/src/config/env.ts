import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT) || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",

  MONGODB_URI: process.env.MONGODB_URI || "",

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "",

  CLIENT_URL:
    process.env.CLIENT_URL ||
    "http://localhost:5173",

  RAZORPAY_KEY_ID:
    process.env.RAZORPAY_KEY_ID || "",

  RAZORPAY_KEY_SECRET:
    process.env.RAZORPAY_KEY_SECRET || "",

  RAZORPAY_WEBHOOK_SECRET: 
    process.env.RAZORPAY_WEBHOOK_SECRET || "",

  CLOUDINARY_CLOUD_NAME:
    process.env.CLOUDINARY_CLOUD_NAME || "",

  CLOUDINARY_API_KEY:
    process.env.CLOUDINARY_API_KEY || "",

  CLOUDINARY_API_SECRET:
    process.env.CLOUDINARY_API_SECRET || "",

  MAIL_HOST:
    process.env.MAIL_HOST || "",

  MAIL_PORT:
    Number(process.env.MAIL_PORT) || 587,

  MAIL_USER:
    process.env.MAIL_USER || "",

  MAIL_PASSWORD:
    process.env.MAIL_PASSWORD || "",

  MAIL_FROM:
    process.env.MAIL_FROM || "",
};