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

  static async getAllUsers(options?: any) {
    return UserRepository.findAll(options);
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

  /**
   * Evaluates persisted freelancer profile completion against PRD 02 criteria:
   * - fullName: trimmed string of at least 3 characters
   * - bio: trimmed string of at least 50 characters
   * - location: trimmed string of at least 2 characters
   * - skills: array containing at least one non-empty skill string
   */
  static checkProfileCompletion(user: any): {
    isComplete: boolean;
    missingFields: string[];
  } {
    const missingFields: string[] = [];

    const fullName = typeof user?.fullName === "string" ? user.fullName.trim() : "";
    if (fullName.length < 3) {
      missingFields.push("fullName");
    }

    const bio = typeof user?.bio === "string" ? user.bio.trim() : "";
    if (bio.length < 50) {
      missingFields.push("bio");
    }

    const location = typeof user?.location === "string" ? user.location.trim() : "";
    if (location.length < 2) {
      missingFields.push("location");
    }

    const skills = Array.isArray(user?.skills)
      ? user.skills.filter((s: any) => typeof s === "string" && s.trim().length > 0)
      : [];
    if (skills.length < 1) {
      missingFields.push("skills");
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }
}

