import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { UserService } from "./user.service";

export class UserController {
  static async getProfile(
    req: AuthRequest,
    res: Response
  ) {
    const user = await UserService.getProfile(
      req.user!.id
    );

    return res.status(200).json({
      success: true,
      data: user,
    });
  }

  static async updateProfile(
    req: AuthRequest,
    res: Response
  ) {
    const user = await UserService.updateProfile(
      req.user!.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: user,
    });
  }

  static async getUserByUsername(
    req: Request,
    res: Response
  ) {
    const user =
      await UserService.getUserByUsername(
        req.params.username
      );

    return res.status(200).json({
      success: true,
      data: user,
    });
  }

  static async getAllUsers(
    _req: Request,
    res: Response
  ) {
    const users = await UserService.getAllUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });
  }

  static async deleteMyAccount(
    req: AuthRequest,
    res: Response
  ) {
    const result =
      await UserService.deleteMyAccount(
        req.user!.id
      );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  }
}