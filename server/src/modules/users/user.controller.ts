import { Request, Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { UserService } from "./user.service";
import { AuthRequest } from "../../middleware/auth.middleware";

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
  static async uploadResume(
  req: AuthRequest,
  res: Response
) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const user =
    await UserService.uploadResume(
      req.user!.id,
      req.file
    );

  return res.status(200).json({
    success: true,
    message: "Resume uploaded successfully",
    data: user,
  });
}
static async addPortfolio(
  req: AuthRequest,
  res: Response
) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No image uploaded",
    });
  }

  const user =
    await UserService.addPortfolio(
      req.user!.id,
      req.body.title,
      req.file
    );

  return res.status(200).json({
    success: true,
    message: "Portfolio added",
    data: user,
  });
}
static async removePortfolio(
  req: AuthRequest,
  res: Response
) {
  const user =
    await UserService.removePortfolio(
      req.user!.id,
      req.params.publicId
    );

  return res.status(200).json({
    success: true,
    message: "Portfolio removed",
    data: user,
  });
}
}