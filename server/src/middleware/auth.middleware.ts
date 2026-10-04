import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { UserRepository } from "../modules/users/user.repository";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

interface AccessTokenPayload {
  id: string;
  role?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token missing",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token missing",
      });
    }

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      console.error("JWT_ACCESS_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error",
      });
    }

    const decoded = jwt.verify(
      token,
      secret
    ) as AccessTokenPayload;

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token",
      });
    }

    const user = await UserRepository.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
