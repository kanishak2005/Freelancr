import { UserRepository } from "./user.repository";
import { ApiError, HTTP_STATUS } from "../../shared";

export class UserService {
  static async getProfile(userId: string) {
    const user = await UserRepository.findById(userId);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    return user;
  }

  static async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      bio?: string;
      phone?: string;
      location?: string;
      skills?: string[];
      avatar?: string;
    }
  ) {
    const updatedUser =
      await UserRepository.updateProfile(userId, data);

    if (!updatedUser) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    return updatedUser;
  }

  static async getUserByUsername(username: string) {
    const user =
      await UserRepository.findByUsername(username);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    return user;
  }

  static async getAllUsers() {
    return UserRepository.findAll();
  }

  static async deleteMyAccount(userId: string) {
    const deleted =
      await UserRepository.deleteUser(userId);

    if (!deleted) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    return {
      message: "Account deleted successfully",
    };
  }
}