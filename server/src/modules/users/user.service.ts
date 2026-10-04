import { UserRepository } from "./user.repository";
import { ApiError, HTTP_STATUS } from "../../shared";
import { UploadService } from "../uploads/upload.service";

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
    const allowedFields = {
      fullName: data.fullName,
      bio: data.bio,
      phone: data.phone,
      location: data.location,
      skills: data.skills,
      avatar: data.avatar,
    };

    const filteredData = Object.fromEntries(
      Object.entries(allowedFields).filter(
        ([, value]) => value !== undefined
      )
    );

    const updatedUser =
      await UserRepository.updateProfile(
        userId,
        filteredData
      );

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
    const user =
      await UserRepository.findById(userId);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    const resumePublicId =
      user.resumePublicId || "";

    const portfolioPublicIds =
      (user.portfolio || [])
        .map((item) => item.publicId)
        .filter(
          (publicId): publicId is string =>
            typeof publicId === "string" &&
            publicId.trim().length > 0
        );

    const deleted =
      await UserRepository.deleteUser(userId);

    if (!deleted) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    if (resumePublicId) {
      try {
        await UploadService.deleteFile(
          resumePublicId,
          "raw"
        );
      } catch {
        // Account deletion already succeeded.
        // Do not fail deletion because Cloudinary cleanup failed.
      }
    }

    for (const publicId of portfolioPublicIds) {
      try {
        await UploadService.deleteFile(
          publicId,
          "image"
        );
      } catch {
        // Account deletion already succeeded.
        // Do not fail deletion because Cloudinary cleanup failed.
      }
    }

    return {
      message: "Account deleted successfully",
    };
  }

  static async uploadResume(
    userId: string,
    file: Express.Multer.File
  ) {
    const currentUser =
      await UserRepository.findById(userId);

    if (!currentUser) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    const oldPublicId =
      currentUser.resumePublicId || "";

    const uploaded =
      await UploadService.uploadFile(
        file,
        "freelancr/resumes",
        "raw"
      );

    const updatedUser =
      await UserRepository.updateResume(
        userId,
        uploaded.secure_url,
        uploaded.public_id
      );

    if (!updatedUser) {
      try {
        await UploadService.deleteFile(
          uploaded.public_id,
          "raw"
        );
      } catch {
        // Prevent cleanup failure from hiding the original error.
      }

      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    if (
      oldPublicId &&
      oldPublicId !== uploaded.public_id
    ) {
      try {
        await UploadService.deleteFile(
          oldPublicId,
          "raw"
        );
      } catch {
        // The database already points to the new resume.
        // Do not delete the new file if old-file cleanup fails.
      }
    }

    return updatedUser;
  }

  static async addPortfolio(
    userId: string,
    title: string,
    file: Express.Multer.File
  ) {
    if (!title?.trim()) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Portfolio title is required"
      );
    }

    const uploaded =
      await UploadService.uploadFile(
        file,
        "freelancr/portfolio",
        "image"
      );

    try {
      const updatedUser =
        await UserRepository.addPortfolio(
          userId,
          {
            title: title.trim(),
            image: uploaded.secure_url,
            publicId: uploaded.public_id,
          }
        );

      if (!updatedUser) {
        throw new ApiError(
          HTTP_STATUS.NOT_FOUND,
          "User not found"
        );
      }

      return updatedUser;
    } catch (error) {
      try {
        await UploadService.deleteFile(
          uploaded.public_id,
          "image"
        );
      } catch {
        // Prevent cleanup failure from hiding the original error.
      }

      throw error;
    }
  }

  static async removePortfolio(
    userId: string,
    publicId: string
  ) {
    if (
      typeof publicId !== "string" ||
      !publicId.trim()
    ) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Public ID is required"
      );
    }

    const user =
      await UserRepository.findById(userId);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS.NOT_FOUND,
        "User not found"
      );
    }

    const portfolioItem =
      user.portfolio?.find(
        (item) => item.publicId === publicId
      );

    if (!portfolioItem) {
      throw new ApiError(
        HTTP_STATUS.FORBIDDEN,
        "You do not have permission to delete this portfolio file"
      );
    }

    await UploadService.deleteFile(
      publicId,
      "image"
    );

    return UserRepository.removePortfolio(
      userId,
      publicId
    );
  }
}

