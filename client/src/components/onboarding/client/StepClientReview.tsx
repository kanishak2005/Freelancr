import React, { useState } from "react";
import type { ClientOnboardingDto } from "../../../services/user.api";

interface StepClientReviewProps {
  data: ClientOnboardingDto;
  onSubmit: () => void;
  onBack: () => void;
  onJumpToStep: (step: number) => void;
  submitting: boolean;
  error?: string;
}

export default function StepClientReview({
  data,
  onSubmit,
  onBack,
  onJumpToStep,
  submitting,
  error,
}: StepClientReviewProps) {
  const [localError, setLocalError] = useState("");

  const billing = data.billingAddress || {};
  const budget = data.preferredBudgetRange || {};
  const categories = data.preferredCategories || [];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    const name = data.companyName?.trim();
    if (!name || name.length < 2 || name.length > 200) {
      setLocalError("Company or Organization name is required (between 2 and 200 characters).");
      return;
    }

    if (budget.min !== undefined && budget.max !== undefined && budget.min > budget.max) {
      setLocalError("Minimum project budget cannot exceed maximum project budget.");
      return;
    }

    onSubmit();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Review & Complete Onboarding</h2>
        <p className="text-sm text-slate-500 mt-1">
          Review your profile and hiring preferences below. Click "Edit" next to any section to make adjustments before completing your client setup.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* Review Card Accordion */}
      <div className="space-y-4">
        {/* Section 1: Identity */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Client / Company Identity</h3>
            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Name: </span>
              <span>{data.companyName || "Not provided"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Website: </span>
              <span>{data.companyWebsite ? (
                <a href={data.companyWebsite} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                  {data.companyWebsite}
                </a>
              ) : "Not provided"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Industry: </span>
              <span>{data.industry || "Not provided"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Organization Size: </span>
              <span>{data.companySize || "Not provided"}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Location & Billing */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Location & Billing</h3>
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Primary Location: </span>
              <span>{[data.city, data.country].filter(Boolean).join(", ") || "Not specified"}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Billing Address: </span>
              <span>
                {[billing.street, billing.city, billing.state, billing.postalCode, billing.country]
                  .filter(Boolean)
                  .join(", ") || "Not provided (Optional)"}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Preferences */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Project & Budget Preferences</h3>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Typical Project Budget: </span>
              <span>
                {budget.min !== undefined && budget.max !== undefined
                  ? `₹${budget.min.toLocaleString("en-IN")} - ₹${budget.max.toLocaleString("en-IN")}`
                  : budget.min !== undefined
                  ? `Min ₹${budget.min.toLocaleString("en-IN")}`
                  : budget.max !== undefined
                  ? `Up to ₹${budget.max.toLocaleString("en-IN")}`
                  : "Flexible"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Preferred Domains ({categories.length}): </span>
              <span>{categories.join(", ") || "All project categories"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & Submit Action */}
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
          id="complete-client-onboarding-submit-btn"
          disabled={submitting}
          className="inline-flex items-center justify-center px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Completing Client Profile...</span>
            </span>
          ) : (
            "Complete Onboarding & Go to My Jobs"
          )}
        </button>
      </div>
    </form>
  );
}

