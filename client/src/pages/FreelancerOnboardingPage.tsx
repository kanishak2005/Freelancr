import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setCredentials } from "../store/slices/authSlice";
import { completeFreelancerOnboarding, type FreelancerOnboardingDto } from "../services/user.api";

import StepBasics from "../components/onboarding/freelancer/StepBasics";
import StepSkills from "../components/onboarding/freelancer/StepSkills";
import StepEducationExperience from "../components/onboarding/freelancer/StepEducationExperience";
import StepProjects from "../components/onboarding/freelancer/StepProjects";
import StepPreferencesReview from "../components/onboarding/freelancer/StepPreferencesReview";

const STEPS = [
  { id: 1, name: "Basics" },
  { id: 2, name: "Skills" },
  { id: 3, name: "Education" },
  { id: 4, name: "Projects" },
  { id: 5, name: "Review" },
];

export default function FreelancerOnboardingPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Intermediate wizard state kept purely in React memory
  const [formData, setFormData] = useState<FreelancerOnboardingDto>({
    title: "",
    bio: "",
    city: "",
    country: "",
    availability: "available",
    experienceLevel: "entry",
    skills: [],
    skillProficiencies: [],
    education: [],
    employmentHistory: [],
    projects: [],
    preferredCategories: [],
    workArrangement: "remote",
    remoteOnly: false,
    hourlyRate: undefined,
    minBudget: undefined,
    maxBudget: undefined,
  });

  const handleFieldChange = (field: keyof FreelancerOnboardingDto, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNext = () => {
    setError("");
    setCurrentStep((prev) => Math.min(5, prev + 1));
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
      const payload: FreelancerOnboardingDto = {
        title: formData.title?.trim() || undefined,
        bio: formData.bio?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        country: formData.country?.trim() || undefined,
        availability: formData.availability,
        experienceLevel: formData.experienceLevel,
        skills: formData.skills && formData.skills.length > 0 ? formData.skills : undefined,
        skillProficiencies:
          formData.skillProficiencies && formData.skillProficiencies.length > 0
            ? formData.skillProficiencies
            : undefined,
        education:
          formData.education && formData.education.length > 0 ? formData.education : undefined,
        employmentHistory:
          formData.employmentHistory && formData.employmentHistory.length > 0
            ? formData.employmentHistory
            : undefined,
        projects:
          formData.projects && formData.projects.length > 0 ? formData.projects : undefined,
        preferredCategories:
          formData.preferredCategories && formData.preferredCategories.length > 0
            ? formData.preferredCategories
            : undefined,
        workArrangement: formData.workArrangement,
        remoteOnly: formData.remoteOnly,
        hourlyRate: formData.hourlyRate,
        minBudget: formData.minBudget,
        maxBudget: formData.maxBudget,
      };

      const res = await completeFreelancerOnboarding(payload);

      // On successful backend update, update Redux user and route to dashboard
      if (res.data) {
        dispatch(
          setCredentials({
            id: res.data.id || currentUser?.id || "",
            fullName: res.data.fullName || currentUser?.fullName || "",
            username: res.data.username || currentUser?.username || "",
            email: res.data.email || currentUser?.email || "",
            role: res.data.role || "freelancer",
            avatar: res.data.avatar || currentUser?.avatar,
            onboardingStatus: "completed",
          })
        );

        navigate("/dashboard", { replace: true });
      }
    } catch (err: unknown) {
      console.error("Freelancer onboarding submission failed:", err);
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      setError(
        apiErr?.response?.data?.message ||
          apiErr?.message ||
          "Failed to complete onboarding. Please check your inputs and try again."
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
            Freelancer Onboarding
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Build Your Professional Profile
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
            Complete these 5 quick steps to start collaborating on client projects.
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
            <StepBasics
              data={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              error={error}
            />
          )}

          {currentStep === 2 && (
            <StepSkills
              data={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              onBack={handleBack}
              error={error}
            />
          )}

          {currentStep === 3 && (
            <StepEducationExperience
              data={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              onBack={handleBack}
              error={error}
            />
          )}

          {currentStep === 4 && (
            <StepProjects
              data={formData}
              onChange={handleFieldChange}
              onNext={handleNext}
              onBack={handleBack}
              error={error}
            />
          )}

          {currentStep === 5 && (
            <StepPreferencesReview
              data={formData}
              onChange={handleFieldChange}
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

