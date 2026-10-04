import { api } from "../lib/axios";
import type { AuthUser } from "../store/slices/authSlice";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: "client" | "freelancer";
}

interface BackendUser {
  _id?: string;
  id?: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user?: BackendUser;
    accessToken?: string;
    token?: string;
  };
}

const normalizeUser = (
  user: BackendUser
): AuthUser => {
  return {
    id: user.id || user._id || "",
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
  };
};

export const registerUser = async (
  payload: RegisterPayload
) => {
  const response = await api.post<AuthResponse>(
    "/auth/register",
    payload
  );

  const data = response.data;

  return {
    ...data,
    data: {
      ...data.data,
      user: data.data.user
        ? normalizeUser(data.data.user)
        : undefined,
    },
  };
};

export const loginUser = async (
  payload: LoginPayload
) => {
  const response = await api.post<AuthResponse>(
    "/auth/login",
    payload
  );

  const data = response.data;

  return {
    ...data,
    data: {
      ...data.data,
      user: data.data.user
        ? normalizeUser(data.data.user)
        : undefined,
    },
  };
};

export const getCurrentUser = async () => {
  const response = await api.get<{
    success: boolean;
    data: BackendUser;
  }>("/auth/me");

  return normalizeUser(response.data.data);
};

export const logoutUser = async () => {
  const response = await api.post("/auth/logout");

  return response.data;
};

export const forgotPassword = async (
  email: string
) => {
  const response = await api.post<{
    success: boolean;
    message: string;
  }>("/auth/forgot-password", {
    email,
  });

  return response.data;
};

export const resetPassword = async (
  token: string,
  newPassword: string
) => {
  const response = await api.post<{
    success: boolean;
    message: string;
  }>("/auth/reset-password", {
    token,
    newPassword,
  });

  return response.data;
};
