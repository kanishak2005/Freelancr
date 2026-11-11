import React, { useState } from "react";
import type { FreelancerOnboardingDto } from "../../../services/user.api";

interface StepPreferencesReviewProps {
  data: FreelancerOnboardingDto;
  onChange: (field: keyof FreelancerOnboardingDto, value: any) => void;
  onSubmit: () => void;
  onBack: () => void;
  onJumpToStep: (step: number) => void;
  submitting: boolean;
  error?: string;
}

const CATEGORY_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "Backend & API",
  "DevOps & Cloud",
  "UI/UX Design",
  "Data Science & AI",
  "Cybersecurity",
  "QA & Testing",
];

export default function StepPreferencesReview({
  data,
  onChange,
  onSubmit,
  onBack,
  onJumpToStep,
  submitting,
  error,
}: StepPreferencesReviewProps) {
  const [localError, setLocalError] = useState("");

  const selectedCategories = data.preferredCategories || [];

  const handleToggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      onChange(
        "preferredCategories",
        selectedCategories.filter((c) => c !== cat)
      );
    } else {
      if (selectedCategories.length >= 20) return;
      onChange("preferredCategories", [...selectedCategories, cat]);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (data.minBudget !== undefined && data.minBudget < 0) {
      setLocalError("Minimum budget cannot be negative.");
      return;
    }
    if (data.maxBudget !== undefined && data.maxBudget < 0) {
      setLocalError("Maximum budget cannot be negative.");
      return;
    }
    if (
      data.minBudget !== undefined &&
      data.maxBudget !== undefined &&
      data.minBudget > data.maxBudget
    ) {
      setLocalError("Minimum budget cannot exceed maximum budget.");
      return;
    }
    if (data.hourlyRate !== undefined && data.hourlyRate < 0) {
      setLocalError("Hourly rate cannot be negative.");
      return;
    }

    onSubmit();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Work Preferences & Profile Review</h2>
        <p className="text-sm text-slate-500 mt-1">
          Finalize your work arrangement, rate expectations, and review your profile before completing onboarding.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* Work Arrangement */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Work Arrangement
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: "remote", label: "Remote", desc: "100% location independent" },
              { value: "hybrid", label: "Hybrid", desc: "Remote + on-site mix" },
              { value: "on-site", label: "On-Site", desc: "In-office work" },
            ] as const
          ).map((arr) => (
            <button
              key={arr.value}
              type="button"
              onClick={() => onChange("workArrangement", arr.value)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                (data.workArrangement || "remote") === arr.value
                  ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 font-bold"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="text-xs font-bold text-slate-900">{arr.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{arr.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Hourly Rate & Budget Expectations (in INR) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="pref-hourly-rate" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Hourly Rate (₹ / hr)
          </label>
          <input
            id="pref-hourly-rate"
            type="number"
            min="0"
            step="50"
            value={data.hourlyRate !== undefined ? data.hourlyRate : ""}
            onChange={(e) =>
              onChange("hourlyRate", e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined)
            }
            placeholder="e.g. 1500"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
          />
        </div>

        <div>
          <label htmlFor="pref-min-budget" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Min Project Budget (₹)
          </label>
          <input
            id="pref-min-budget"
            type="number"
            min="0"
            step="1000"
            value={data.minBudget !== undefined ? data.minBudget : ""}
            onChange={(e) =>
              onChange("minBudget", e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined)
            }
            placeholder="e.g. 10000"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
          />
        </div>

        <div>
          <label htmlFor="pref-max-budget" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Max Project Budget (₹)
          </label>
          <input
            id="pref-max-budget"
            type="number"
            min="0"
            step="1000"
            value={data.maxBudget !== undefined ? data.maxBudget : ""}
            onChange={(e) =>
              onChange("maxBudget", e.target.value ? Math.max(0, parseFloat(e.target.value)) : undefined)
            }
            placeholder="e.g. 100000"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
          />
        </div>
      </div>

      {/* Preferred Job Categories */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Preferred Work Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleToggleCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/30"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                }`}
              >
                {isSelected ? "✓ " : "+ "}
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* REVIEW SUMMARY ACCORDION / CARD */}
      <div className="pt-4 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Profile Summary Review</h3>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <div>
              <span className="font-bold text-slate-800">Title: </span>
              <span className="text-slate-600">{data.title || "Not specified"}</span>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <div>
              <span className="font-bold text-slate-800">Skills ({data.skillProficiencies?.length || 0}): </span>
              <span className="text-slate-600">
                {data.skillProficiencies?.map((s) => s.name).join(", ") || "None"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <div>
              <span className="font-bold text-slate-800">Education ({data.education?.length || 0}): </span>
              <span className="text-slate-600">
                {data.education?.map((e) => e.degree).join(", ") || "None"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <div>
              <span className="font-bold text-slate-800">Employment: </span>
              <span className="text-slate-600">
                {data.employmentHistory?.length
                  ? `${data.employmentHistory.length} role(s) specified`
                  : "None (Fresher / Student)"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold text-slate-800">Projects ({data.projects?.length || 0}): </span>
              <span className="text-slate-600">
                {data.projects?.map((p) => p.title).join(", ") || "None"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onJumpToStep(4)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          id="complete-onboarding-submit-btn"
          disabled={submitting}
          className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Completing Profile...</span>
            </span>
          ) : (
            "Complete Onboarding & Go to Dashboard"
          )}
        </button>
      </div>
    </form>
  );
}

