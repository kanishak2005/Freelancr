import { Request, Response, NextFunction } from "express";
import { ApiError } from "../shared";

export const errorMiddleware = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("ERROR:", err);

  const statusCode =
    err instanceof ApiError
      ? err.statusCode
      : err.statusCode || 500;

  const message =
    err instanceof ApiError
      ? err.message
      : err.message || "Internal Server Error";

  return res.status(statusCode).json({
    success: false,
    message,
    error:
      process.env.NODE_ENV === "development"
        ? err.error || err
        : undefined,
  });
};