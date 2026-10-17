import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const SAFE_REQUEST_ID_REGEX = /^[a-zA-Z0-9_\-]{1,64}$/;

export interface RequestWithId extends Request {
  id?: string;
  requestId?: string;
}

export const requestIdMiddleware = (
  req: RequestWithId,
  res: Response,
  next: NextFunction
) => {
  const incomingId =
    req.headers["x-request-id"] || req.headers["x-correlation-id"];

  let requestId: string;

  if (
    typeof incomingId === "string" &&
    SAFE_REQUEST_ID_REGEX.test(incomingId.trim())
  ) {
    requestId = incomingId.trim();
  } else {
    requestId = crypto.randomUUID();
  }

  req.id = requestId;
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  next();
};
