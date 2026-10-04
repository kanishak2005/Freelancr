import {
  useState,
  type FormEvent,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getCurrentUser,
  loginUser,
} from "../services/auth.api";

import {
  setCredentials,
} from "../store/slices/authSlice";

import { useAppDispatch } from "../store/hooks";
import { socket } from "../lib/socket";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await loginUser({
        email,
        password,
      });

      const token =
        response.data?.accessToken ||
        response.data?.token;

      if (!token) {
        throw new Error(
          "Access token was not returned by the server."
        );
      }

      localStorage.setItem(
        "accessToken",
        token
      );
      socket.auth = {
  token,
};

if (!socket.connected) {
  socket.connect();
}

      const user =
        await getCurrentUser();

      dispatch(setCredentials(user));

      navigate("/");
    } catch (error: any) {
      console.error(
        "Login failed:",
        error
      );

      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold">
          Welcome Back
        </h1>

        <p className="mb-6 text-gray-500">
          Login to your Freelancr account.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              className="w-full rounded-lg border px-4 py-2 outline-none focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          <div className="mt-2 text-right">
  <Link
    to="/forgot-password"
    className="text-sm text-blue-600 hover:underline"
  >
    Forgot Password?
  </Link>
</div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-indigo-600"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}