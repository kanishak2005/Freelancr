export type UserRole = "client" | "freelancer" | "admin";

export interface IUser {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;

  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;

  skills: string[];

  isVerified: boolean;
  isActive: boolean;

  refreshToken?: string;

  createdAt?: Date;
  updatedAt?: Date;
  passwordResetToken?: string;

passwordResetExpires?: Date;
resume?: string;

resumePublicId?: string;

portfolio?: {
  title: string;
  image: string;
  publicId: string;
}[];
}