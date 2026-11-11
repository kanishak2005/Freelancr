import React from "react";
import type { ClientOnboardingDto } from "../../../services/user.api";

interface StepClientPreferencesProps {
  data: ClientOnboardingDto;
  onChange: (field: keyof ClientOnboardingDto, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
}

const CATEGORY_OPTIONS = [
  "Web Development",
  "Mobile App Development",
  "Backend & API Systems",
  "DevOps & Cloud Infrastructure",
  "UI/UX & Product Design",
  "Data Science & Machine Learning",
  "Cybersecurity & Audits",
  "QA & Test Automation",
  "Blockchain & Web3",
  "Content & Technical Writing",
];

export default function StepClientPreferences({
  data,
  onChange,
  onNext,
  onBack,
  error,
}: StepClientPreferencesProps) {
  const [localError, setLocalError] = React.useState("");

  const selectedCategories = data.preferredCategories || [];
  const budget = data.preferredBudgetRange || {};

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

  const handleBudgetChange = (field: "min" | "max", val: string) => {
    const num = val ? Math.max(0, parseFloat(val)) : undefined;
    onChange("preferredBudgetRange", {
      ...budget,
      [field]: num,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    const hasMin = budget.min !== undefined;
    const hasMax = budget.max !== undefined;

    // Reject partial updates to avoid inverted or corrupt ranges when merged with existing DB values
    if ((hasMin && !hasMax) || (!hasMin && hasMax)) {
      setLocalError("Please provide both minimum and maximum project budget, or leave both empty.");
      return;
    }

    if (hasMin && budget.min! < 0) {
      setLocalError("Minimum project budget must be a non-negative number.");
      return;
    }

    if (hasMax && budget.max! < 0) {
      setLocalError("Maximum project budget must be a non-negative number.");
      return;
    }

    // Owner approved decision: enforce min <= max strictly on frontend
    if (hasMin && hasMax && budget.min! > budget.max!) {
      setLocalError("Minimum project budget cannot exceed maximum project budget.");
      return;
    }

    onNext();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Project & Hiring Preferences</h2>
        <p className="text-sm text-slate-500 mt-1">
          Specify the types of freelance talent you plan to hire and your typical project budget expectations.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* Preferred Project Categories */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Preferred Project Categories <span className="text-slate-400 font-normal lowercase">(optional, max 20)</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {selectedCategories.length} selected
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Select the domains in which you frequently contract freelance engineers and specialists.
        </p>
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

      <hr className="border-slate-100 my-6" />

      {/* Preferred Budget Range (INR) */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Typical Project Budget Range
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            Optional
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          All monetary values are denominated in Indian Rupees (₹).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="budget-min" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Minimum Project Budget (₹)
            </label>
            <input
              id="budget-min"
              type="number"
              min="0"
              step="1000"
              value={budget.min !== undefined ? budget.min : ""}
              onChange={(e) => handleBudgetChange("min", e.target.value)}
              placeholder="e.g. 15000"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="budget-max" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Maximum Project Budget (₹)
            </label>
            <input
              id="budget-max"
              type="number"
              min="0"
              step="1000"
              value={budget.max !== undefined ? budget.max : ""}
              onChange={(e) => handleBudgetChange("max", e.target.value)}
              placeholder="e.g. 100000"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-6 border-t border-slate-100 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold transition"
        >
          Back
        </button>
        <button
          type="submit"
          id="step-client-pref-next-btn"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Continue to Review & Confirm
        </button>
      </div>
    </form>
  );
}

