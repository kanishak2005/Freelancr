import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

export const DEFAULT_TIMEOUT_MS = 15000;
export const UPLOAD_TIMEOUT_MS = 60000;
const MAX_SAFE_RETRIES = 2;

// Non-retryable mutation patterns (financial, state transitions, mutations)
const NON_RETRYABLE_URL_PATTERNS = [
  /\/payments/i,
  /\/refund/i,
  /\/payout/i,
  /\/contracts\/[^/]+\/(complete|cancel)/i,
  /\/proposals\/[^/]+\/accept/i,
  /\/disputes/i,
];

export interface NormalizedApiError {
  message: string;
  statusCode?: number;
  code?: string;
  errors?: any[];
  requestId?: string;
}

export interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
  _isRetryRequest?: boolean;
}

const generateRequestId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT_MS,
});

// Auth error / logout listener callback
type AuthErrorCallback = () => void;
let onAuthErrorCallback: AuthErrorCallback | null = null;

export const setAuthErrorCallback = (callback: AuthErrorCallback | null) => {
  onAuthErrorCallback = callback;
};

// Queue coordination for 401 token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// ============================================
// REQUEST INTERCEPTOR
// ============================================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 1. Request / Correlation ID
    if (!config.headers["X-Request-ID"]) {
      config.headers["X-Request-ID"] = generateRequestId();
    }

    // 2. Auth Transport (Bearer token)
    const token = localStorage.getItem("accessToken");
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. Timeout configuration (extend for file uploads)
    if (!config.timeout) {
      const isUpload =
        config.headers["Content-Type"] === "multipart/form-data" ||
        config.url?.includes("/upload");
      config.timeout = isUpload ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as CustomRequestConfig | undefined;

    // Normalizing error details onto error object for convenience
    const status = error.response?.status;
    const responseData = error.response?.data;
    const requestId =
      (error.response?.headers?.["x-request-id"] as string | undefined) ||
      (originalRequest?.headers?.["X-Request-ID"] as string | undefined);

    const normalizedError: NormalizedApiError = {
      message:
        responseData?.message ||
        error.message ||
        "An unexpected network error occurred",
      statusCode: status,
      code: responseData?.code || error.code,
      errors: responseData?.errors,
      requestId,
    };

    (error as any).normalized = normalizedError;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // ----------------------------------------------------
    // 1. Coordinated 401 Refresh Token Rotation
    // ----------------------------------------------------
    const isAuthRoute =
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/forgot-password") ||
      originalRequest.url?.includes("/auth/reset-password");

    if (status === 401 && !isAuthRoute && !originalRequest._isRetryRequest) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            originalRequest._isRetryRequest = true;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;
      originalRequest._isRetryRequest = true;

      try {
        const refreshResponse = await axios.post<{
          success: boolean;
          data: { accessToken: string };
        }>(
          `${import.meta.env.VITE_API_URL || ""}/auth/refresh`,
          {},
          { withCredentials: true, timeout: DEFAULT_TIMEOUT_MS }
        );

        const newAccessToken = refreshResponse.data?.data?.accessToken;

        if (newAccessToken) {
          localStorage.setItem("accessToken", newAccessToken);
          processQueue(null, newAccessToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } else {
          throw new Error("Refresh token returned invalid payload");
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("accessToken");

        if (onAuthErrorCallback) {
          onAuthErrorCallback();
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // ----------------------------------------------------
    // 2. Safe Retry Policy (Idempotent GET/HEAD reads only)
    // ----------------------------------------------------
    const method = (originalRequest.method || "GET").toUpperCase();
    const isSafeMethod = method === "GET" || method === "HEAD" || method === "OPTIONS";

    const isNonRetryableUrl = NON_RETRYABLE_URL_PATTERNS.some((pattern) =>
      pattern.test(originalRequest.url || "")
    );

    // Only retry transient network errors or 502/503/504
    const isTransientError =
      !error.response ||
      status === 502 ||
      status === 503 ||
      status === 504;

    const retryCount = originalRequest._retryCount || 0;

    if (
      isSafeMethod &&
      !isNonRetryableUrl &&
      isTransientError &&
      retryCount < MAX_SAFE_RETRIES
    ) {
      originalRequest._retryCount = retryCount + 1;
      const backoffDelay = 500 * Math.pow(2, retryCount);

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);