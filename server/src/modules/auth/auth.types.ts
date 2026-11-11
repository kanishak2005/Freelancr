export interface RegisterUserDto {
  fullName: string;
  email: string;
  password: string;
  role: "client" | "freelancer";
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface GoogleAuthDto {
  credential: string;
  role?: "client" | "freelancer";
}

export interface SendRegistrationOtpDto {
  email: string;
}

export interface VerifyRegistrationOtpDto {
  email: string;
  otp: string;
}

export interface CompleteRegistrationDto {
  registrationToken: string;
  email: string;
  fullName: string;
  password: string;
  role: "client" | "freelancer";
}

export interface SanitizedUserDto {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  role: "client" | "freelancer" | "admin";
  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  skills: string[];
  isVerified: boolean;
  isActive: boolean;
  onboardingStatus?: string;
  city?: string;
  country?: string;
  freelancerProfile?: any;
  companyProfile?: any;
  authProvider?: "local" | "google";
  createdAt?: Date;
  updatedAt?: Date;
}
