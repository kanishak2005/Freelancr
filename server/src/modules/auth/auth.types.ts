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