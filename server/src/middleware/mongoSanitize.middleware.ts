import { Request, Response, NextFunction } from "express";

/**
 * Recursively sanitizes an object by removing any keys that begin with '$'
 * or contain '.' to prevent MongoDB query / operator injection.
 */
function sanitize(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
    } else {
      obj[key] = sanitize(obj[key]);
    }
  }

  return obj;
}

export const mongoSanitize = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.body) {
    sanitize(req.body);
  }
  if (req.query) {
    sanitize(req.query);
  }
  if (req.params) {
    sanitize(req.params);
  }
  next();
};
