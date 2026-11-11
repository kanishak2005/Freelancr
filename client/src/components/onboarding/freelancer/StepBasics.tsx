import React from "react";
import type { FreelancerOnboardingDto } from "../../../services/user.api";
import { Autocomplete } from "../../common/Autocomplete";
import { COUNTRY_NAMES, getCitiesForCountry } from "../../../data/locationsData";

interface StepBasicsProps {
  data: FreelancerOnboardingDto;
  onChange: (field: keyof FreelancerOnboardingDto, value: any) => void;
  onNext: () => void;
  error?: string;
}

export default function StepBasics({ data, onChange, onNext, error }: StepBasicsProps) {
  const [localError, setLocalError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    const title = data.title?.trim();
    if (title && (title.length < 2 || title.length > 120)) {
      setLocalError("Professional title must be between 2 and 120 characters.");
      return;
    }

    const bio = data.bio?.trim();
    if (bio && bio.length > 2000) {
      setLocalError("Bio cannot exceed 2000 characters.");
      return;
    }

    const city = data.city?.trim();
    if (city && city.length > 100) {
      setLocalError("City cannot exceed 100 characters.");
      return;
    }

    const country = data.country?.trim();
    if (country && country.length > 100) {
      setLocalError("Country cannot exceed 100 characters.");
      return;
    }

    onNext();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Professional Basics</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tell clients about your professional focus, background, and current location.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* Professional Title */}
      <div>
        <label htmlFor="onboard-title" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Professional Title
        </label>
        <input
          id="onboard-title"
          type="text"
          value={data.title || ""}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="e.g., Full-Stack TypeScript & React Developer"
          maxLength={120}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          A concise summary of your primary craft (2 to 120 characters).
        </p>
      </div>

      {/* Bio / Summary */}
      <div>
        <label htmlFor="onboard-bio" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Professional Bio / Summary
        </label>
        <textarea
          id="onboard-bio"
          rows={4}
          value={data.bio || ""}
          onChange={(e) => onChange("bio", e.target.value)}
          placeholder="Describe your technical background, what problems you enjoy solving, and your primary competencies..."
          maxLength={2000}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-y"
        />
        <div className="flex justify-between items-center mt-1">
          <span className="text-[11px] text-slate-400">Highlight your expertise, passion, and standout achievements.</span>
          <span className="text-[11px] text-slate-400">{(data.bio || "").length} / 2000</span>
        </div>
      </div>

      {/* Location: Country and City */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Autocomplete
            id="onboard-country"
            label="Country"
            value={data.country || ""}
            onChange={(country) => {
              onChange("country", country);
            }}
            options={COUNTRY_NAMES}
            placeholder="e.g., India"
            allowCustom={true}
          />
        </div>
        <div>
          <Autocomplete
            id="onboard-city"
            label="City"
            value={data.city || ""}
            onChange={(city) => onChange("city", city)}
            options={getCitiesForCountry(data.country)}
            placeholder={data.country ? `e.g. Cities in ${data.country}` : "e.g., Bengaluru"}
            allowCustom={true}
          />
        </div>
      </div>

      {/* Current Availability */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Current Availability
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: "available", label: "Available", desc: "Ready for work" },
              { value: "busy", label: "Busy", desc: "Limited capacity" },
              { value: "not_available", label: "Not Available", desc: "Not taking projects" },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange("availability", item.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                (data.availability || "available") === item.value
                  ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 font-bold"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="text-xs font-semibold text-slate-900">{item.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-6 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          id="step-basics-next-btn"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Continue to Skills
        </button>
      </div>
    </form>
  );
}

