import { Request, Response, NextFunction } from "express";
import { ApiError } from "../shared";

export const errorMiddleware = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error("ERROR:", err);

  const isApiError = err instanceof ApiError;

  const rawStatusCode =
    isApiError
      ? err.statusCode
      : err.statusCode;

  const statusCode =
    typeof rawStatusCode === "number" &&
    rawStatusCode >= 400 &&
    rawStatusCode < 600
      ? rawStatusCode
      : 500;

  const message =
    isApiError
      ? err.message
      : statusCode === 500
        ? "Internal Server Error"
        : err.message || "Request failed";

  const response: {
    success: false;
    message: string;
    error?: unknown;
  } = {
    success: false,
    message,
  };

  if (process.env.NODE_ENV === "development") {
    response.error =
      err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          }
        : err;
  }

  return res.status(statusCode).json(response);
};
