import { useState, useEffect } from "react";

interface OtpVerificationStepProps {
  email: string;
  resendAvailableAt: string;
  loading: boolean;
  error: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
}

export default function OtpVerificationStep({
  email,
  resendAvailableAt,
  loading,
  error,
  onVerify,
  onResend,
  onChangeEmail,
}: OtpVerificationStepProps) {
  const [otp, setOtp] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!resendAvailableAt) return 0;
    const diff = Math.ceil((new Date(resendAvailableAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  // Server-driven countdown timer recalculating remaining seconds
  useEffect(() => {
    if (!resendAvailableAt) {
      setSecondsRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const diff = Math.ceil((new Date(resendAvailableAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    };

    setSecondsRemaining(calculateRemaining());

    const timer = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [resendAvailableAt]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || otp.trim().length !== 6) return;
    onVerify(otp.trim());
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(val);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Verify your email</h2>
        <p className="mt-1 text-xs text-slate-500">
          We sent a 6-digit verification code to
        </p>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{email}</span>
          <button
            type="button"
            onClick={onChangeEmail}
            disabled={loading}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline disabled:opacity-50"
          >
            Change
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in"
        >
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="otp-input" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
            Enter 6-Digit Code
          </label>
          <input
            id="otp-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            value={otp}
            onChange={handleOtpChange}
            disabled={loading}
            placeholder="000000"
            className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition disabled:bg-slate-50"
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          id="verify-otp-submit-btn"
          disabled={loading || otp.length !== 6}
          className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Verifying code...</span>
            </span>
          ) : (
            "Verify & Continue"
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-slate-500 mb-2">Didn't receive the email?</p>
        <button
          type="button"
          id="resend-otp-btn"
          onClick={onResend}
          disabled={loading || secondsRemaining > 0}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {secondsRemaining > 0
            ? `Resend code in ${secondsRemaining}s`
            : "Resend verification code"}
        </button>
      </div>
    </div>
  );
}

