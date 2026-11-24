import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion, type Variants } from "framer-motion";

import {
  getCurrentUser,
  loginUser,
  googleAuthUser,
} from "../services/auth.api";

import { setCredentials } from "../store/slices/authSlice";
import { useAppDispatch } from "../store/hooks";
import { socket } from "../lib/socket";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";

export default function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuthSuccess = async (token: string) => {
    localStorage.setItem("accessToken", token);
    socket.auth = { token };

    if (!socket.connected) {
      socket.connect();
    }

    const user = await getCurrentUser();
    dispatch(setCredentials(user));

    // Role-specific redirect
    const isPending =
      typeof user.onboardingStatus === "string" &&
      user.onboardingStatus.trim().toLowerCase() === "pending";

    if (user.role === "admin") {
      navigate("/admin");
    } else if (user.role === "client") {
      if (isPending) {
        navigate("/onboarding/client");
      } else {
        navigate("/my-jobs");
      }
    } else {
      // Freelancer: If explicitly pending, route to onboarding wizard; otherwise dashboard
      if (isPending) {
        navigate("/onboarding/freelancer");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;

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
        throw new Error("Access token was not returned by the server.");
      }

      await handleAuthSuccess(token);
    } catch (err: unknown) {
      console.error("Login failed:", err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        apiErr?.response?.data?.message ||
          apiErr?.message ||
          "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential: string) => {
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await googleAuthUser({
        credential,
      });

      const token =
        response.data?.accessToken ||
        response.data?.token;

      if (!token) {
        throw new Error("Access token was not returned by Google sign-in.");
      }

      await handleAuthSuccess(token);
    } catch (err: unknown) {
      console.error("Google sign-in failed:", err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        apiErr?.response?.data?.message ||
          apiErr?.message ||
          "Google sign-in failed. Please try again or use your password."
      );
    } finally {
      setLoading(false);
    }
  };

  // Motion variants with full prefersReducedMotion safety
  const fadeIn: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.08,
      },
    },
  };

  return (
    <main className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* LEFT COLUMN: Premium Editorial Showcase Panel (Desktop lg:flex, hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 border-r border-slate-800/80 p-12 xl:p-16 flex-col justify-between overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-radial-gradient from-indigo-600/15 via-indigo-950/5 to-transparent blur-3xl pointer-events-none" />

        {/* Architectural Background Grid Texture */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
          aria-hidden="true"
        />

        {/* Brand Header */}
        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-xl"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <span className="text-2xl font-black tracking-tight text-white group-hover:text-indigo-400 transition-colors">
              Freelancr
            </span>
          </Link>
        </div>

        {/* Central Visual: Specimen Contract Card */}
        <div className="relative z-10 my-auto py-10 space-y-6 max-w-lg">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-indigo-300 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Verified Session Authentication</span>
            </span>
            <h2 className="text-3xl xl:text-4xl font-black tracking-tight text-white leading-tight">
              Where technical contracts become completed products.
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Access your active milestones, client conversations, and financial escrow balances in one unified workspace.
            </p>
          </div>

          {/* Illustrative Specimen Spec */}
          <div className="rounded-2xl border border-slate-800/90 bg-slate-900/90 p-5 backdrop-blur-md shadow-xl shadow-black/40 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold text-xs flex items-center justify-center">
                  M2
                </div>
                <div>
                  <span className="block text-xs font-bold text-white">Full-Stack Application Delivery</span>
                  <span className="text-[10px] text-slate-400 font-mono">SPECIMEN DEMONSTRATION</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-bold">
                ESCROW FUNDED
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-medium text-slate-300">
                <span>Milestone 2 Approval Status</span>
                <span className="text-indigo-400">90% Verified</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-1.5 rounded-full w-11/12" />
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Protected Release: ₹45,000</span>
              <span className="text-emerald-400 font-medium">Dispute Guard: Active</span>
            </div>
          </div>
        </div>

        {/* Footer Integrity Note */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Enterprise-Grade Milestone Escrow</span>
          <span className="font-mono text-slate-400">v2.4 Production</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Authentication Form Console (Full Width on mobile, 50% on desktop) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-8 md:px-12 xl:px-20 py-10 sm:py-16 bg-slate-900/60 lg:bg-slate-900/40">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="w-full max-w-md mx-auto space-y-6"
        >
          {/* Mobile-Only Header Brand */}
          <div className="lg:hidden text-center mb-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-xl"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-tight text-white">
                Freelancr
              </span>
            </Link>
          </div>

          {/* Form Header */}
          <motion.div variants={fadeIn} className="text-left space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Sign in to manage contracts, review proposals, and access your authenticated workspace.
            </p>
          </motion.div>

          {/* Error Alert */}
          {error && (
            <motion.div
              variants={fadeIn}
              role="alert"
              className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs sm:text-sm text-rose-300 flex items-start gap-2.5"
            >
              <svg className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </motion.div>
          )}

          {/* Authentication Card Wrapper */}
          <motion.div
            variants={fadeIn}
            className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-black/50 space-y-5"
          >
            {/* Google Single Sign-On Button */}
            <div className="space-y-4">
              <GoogleSignInButton
                text="signin_with"
                onSuccess={handleGoogleSuccess}
                onError={(msg) => setError(msg)}
                disabled={loading}
              />

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 absolute">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email & Password Credential Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
                >
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition disabled:opacity-50"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-400"
                  >
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    id="link-to-forgot-password"
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition disabled:opacity-50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none cursor-pointer p-0.5"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  "Sign in to Workspace"
                )}
              </button>
            </form>

            {/* Registration Navigation Link */}
            <div className="pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                Don't have a Freelancr account?{" "}
                <Link
                  to="/register"
                  id="link-to-register"
                  className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
