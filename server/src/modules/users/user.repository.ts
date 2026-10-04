import { User } from "./user.model";
import { IUser } from "./user.types";

export class UserRepository {
  static async create(user: IUser) {
    return User.create(user);
  }

  static async findByEmail(email: string) {
    return User.findOne({ email });
  }

  static async findByEmailWithPassword(email: string) {
    return User.findOne({ email }).select("+password +refreshToken");
  }

  static async findByUsername(username: string) {
    return User.findOne({ username }).select(
      "fullName username role avatar bio location skills resume portfolio isVerified createdAt updatedAt"
    );
  }

  static async findById(id: string) {
    return User.findById(id);
  }

  static async findByIdWithPassword(id: string) {
    return User.findById(id).select(
      "+password +refreshToken +passwordResetToken +passwordResetExpires"
    );
  }

  static async updateRefreshToken(
    id: string,
    refreshToken: string
  ) {
    return User.findByIdAndUpdate(
      id,
      { refreshToken },
      { new: true }
    );
  }

  static async removeRefreshToken(id: string) {
    return User.findByIdAndUpdate(
      id,
      { refreshToken: "" },
      { new: true }
    );
  }

  static async findByRefreshToken(refreshToken: string) {
    return User.findOne({ refreshToken }).select("+refreshToken");
  }

  static async updatePassword(
    id: string,
    password: string
  ) {
    return User.findByIdAndUpdate(
      id,
      {
        password,
        refreshToken: "",
        passwordResetToken: "",
        passwordResetExpires: null,
      },
      { new: true }
    );
  }

  static async saveResetToken(
    id: string,
    token: string,
    expires: Date
  ) {
    return User.findByIdAndUpdate(
      id,
      {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
      { new: true }
    );
  }

  static async findByResetToken(token: string) {
    return User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    }).select(
      "+password +passwordResetToken +passwordResetExpires"
    );
  }

  static async clearResetToken(id: string) {
    return User.findByIdAndUpdate(
      id,
      {
        passwordResetToken: "",
        passwordResetExpires: null,
      },
      { new: true }
    );
  }

  static async updateProfile(
    id: string,
    data: any
  ) {
    return User.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  static async findAll() {
    return User.find()
      .select(
        "fullName username role avatar bio location skills resume portfolio isVerified createdAt updatedAt"
      )
      .sort({
        createdAt: -1,
      });
  }

  static async deleteUser(id: string) {
    return User.findByIdAndDelete(id);
  }

  static async updateResume(
    id: string,
    resume: string,
    publicId: string
  ) {
    return User.findByIdAndUpdate(
      id,
      {
        resume,
        resumePublicId: publicId,
      },
      {
        new: true,
      }
    );
  }

  static async addPortfolio(
    id: string,
    item: any
  ) {
    return User.findByIdAndUpdate(
      id,
      {
        $push: {
          portfolio: item,
        },
      },
      {
        new: true,
      }
    );
  }

  static async removePortfolio(
    id: string,
    publicId: string
  ) {
    return User.findByIdAndUpdate(
      id,
      {
        $pull: {
          portfolio: {
            publicId,
          },
        },
      },
      {
        new: true,
      }
    );
  }
}

