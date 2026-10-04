import {
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  resetPassword,
} from "../services/auth.api";

export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!token) {
      setError(
        "Invalid or missing password reset token."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await resetPassword(
        token,
        password
      );

      setSuccess(
        response.message ||
          "Password reset successful."
      );

      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (error: any) {
      console.error(
        "Password reset failed:",
        error
      );

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">

        <h1 className="mb-2 text-3xl font-bold">
          Reset Password
        </h1>

        <p className="mb-6 text-gray-500">
          Enter your new password below.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {!token ? (
          <div>
            <p className="mb-4 text-sm text-red-600">
              This password reset link is invalid or
              missing its token.
            </p>

            <Link
              to="/forgot-password"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">
                New Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                minLength={6}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:border-indigo-500"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Confirm Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                required
                minLength={6}
                className="w-full rounded-lg border px-4 py-2 outline-none focus:border-indigo-500"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading
                ? "Resetting..."
                : "Reset Password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Back to Login
          </Link>
        </div>

      </div>
    </main>
  );
}
