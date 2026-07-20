import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRepository } from "../modules/users/user.repository";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("================================");
    console.log("Authorization Header:");
    console.log(req.headers.authorization);

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    console.log("Token:");
    console.log(token);

    console.log("JWT ACCESS SECRET:");
    console.log(process.env.JWT_ACCESS_SECRET);

    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as any;

    console.log("Decoded:");
    console.log(decoded);

    const user = await UserRepository.findById(decoded.id);

    console.log("User Found:");
    console.log(user);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (err) {
    console.log("JWT ERROR:");
    console.log(err);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};