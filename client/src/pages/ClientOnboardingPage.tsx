import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setCredentials } from "../store/slices/authSlice";
import { completeClientOnboarding, type ClientOnboardingDto } from "../services/user.api";

import StepClientIdentity from "../components/onboarding/client/StepClientIdentity";
import StepClientLocation from "../components/onboarding/client/StepClientLocation";
import StepClientPreferences from "../components/onboarding/client/StepClientPreferences";
import StepClientReview from "../components/onboarding/client/StepClientReview";

const STEPS = [
  { id: 1, name: "Identity" },
  { id: 2, name: "Location & Billing" },
  { id: 3, name: "Hiring Preferences" },
  { id: 4, name: "Review & Confirm" },
];

export default function ClientOnboardingPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Intermediate wizard state kept purely in React memory
  const [formData, setFormData] = useState<ClientOnboardingDto>({
    companyName: "",
    companyWebsite: "",
    industry: "",
    companySize: undefined,
    city: "",
    country: "",
    billingAddress: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
    preferredBudgetRange: {
      min: undefined,
      max: undefined,
    },
    preferredCategories: [],
  });

  const handleFieldChange = (field: keyof ClientOnboardingDto, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = () => {
    setError("");
    setCurrentStep((prev) => Math.min(4, prev + 1));
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleJumpToStep = (stepNumber: number) => {
    setError("");
    setCurrentStep(stepNumber);
  };

  const handleFinalSubmit = async () => {
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      // Clean payload: ensure no internal protected fields are passed
      const billing = formData.billingAddress;
      const hasBilling =
        billing &&
        (billing.street?.trim() ||
          billing.city?.trim() ||
          billing.state?.trim() ||
          billing.postalCode?.trim() ||
          billing.country?.trim());

      const budget = formData.preferredBudgetRange;
      const hasBudget =
        budget && (budget.min !== undefined || budget.max !== undefined);

      const payload: ClientOnboardingDto = {
        companyName: formData.companyName?.trim(),
        companyWebsite: formData.companyWebsite?.trim() || undefined,
        industry: formData.industry?.trim() || undefined,
        companySize: formData.companySize || undefined,
        city: formData.city?.trim() || undefined,
        country: formData.country?.trim() || undefined,
        ...(hasBilling
          ? {
              billingAddress: {
                street: billing.street?.trim() || undefined,
                city: billing.city?.trim() || undefined,
                state: billing.state?.trim() || undefined,
                postalCode: billing.postalCode?.trim() || undefined,
                country: billing.country?.trim() || undefined,
              },
            }
          : {}),
        ...(hasBudget
          ? {
              preferredBudgetRange: {
                min: budget.min,
                max: budget.max,
              },
            }
          : {}),
        preferredCategories:
          formData.preferredCategories && formData.preferredCategories.length > 0
            ? formData.preferredCategories
            : undefined,
      };

      const res = await completeClientOnboarding(payload);

      // On successful backend update, update Redux user and route to /my-jobs
      if (res.data) {
        dispatch(
          setCredentials({
            id: res.data.id || currentUser?.id || "",
            fullName: res.data.fullName || currentUser?.fullName || "",
            username: res.data.username || currentUser?.username || "",
            email: res.data.email || currentUser?.email || "",
            role: res.data.role || "client",
            avatar: res.data.avatar || currentUser?.avatar,
            onboardingStatus: "completed",
          })
        );

        navigate("/my-jobs", { replace: true });
      }
    } catch (err: unknown) {
      console.error("Client onboarding submission failed:", err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        apiErr?.response?.data?.message ||
          apiErr?.message ||
          "Failed to complete client onboarding. Please check your inputs and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="max-w-3xl mx-auto">
        {/* Brand & Progress Header */}
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
            Client Onboarding
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Complete Your Client Profile
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
            Set up your organization identity and hiring preferences to post jobs and review top talent.
          </p>

          {/* Stepper Navigation Indicator */}
          <div className="mt-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 -z-0" />
              <div
                className="absolute top-1/2 left-0 h-0.5 bg-indigo-600 -translate-y-1/2 transition-all duration-300 -z-0"
                style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
              />

              {STEPS.map((s) => {
                const isPassed = currentStep > s.id;
                const isCurrent = currentStep === s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (s.id < currentStep) handleJumpToStep(s.id);
                    }}
                    disabled={s.id > currentStep}
                    className={`relative z-10 flex flex-col items-center group focus:outline-none ${
                      s.id > currentStep ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md"
                          : isPassed
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-slate-400 border-2 border-slate-300"
                      }`}
                    >
                      {isPassed ? "✓" : s.id}
                    </div>
                    <span
                      className={`mt-2 text-[11px] font-semibold tracking-wide hidden sm:block ${
                        isCurrent ? "text-indigo-600 font-bold" : "text-slate-500"
                      }`}
                    >
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Wizard Step Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-6 sm:p-10">
          {currentStep === 1 && (
            <StepClientIdentity
              data={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              error={error}
            />
          )}

          {currentStep === 2 && (
            <StepClientLocation
              data={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              onBack={handleBack}
              error={error}
            />
          )}

          {currentStep === 3 && (
            <StepClientPreferences
              data={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              onBack={handleBack}
              error={error}
            />
          )}

          {currentStep === 4 && (
            <StepClientReview
              data={formData}
              onSubmit={handleFinalSubmit}
              onBack={handleBack}
              onJumpToStep={handleJumpToStep}
              submitting={submitting}
              error={error}
            />
          )}
        </div>
      </div>
    </main>
  );
}

