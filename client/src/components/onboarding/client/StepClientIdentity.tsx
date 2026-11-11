import React from "react";
import type { ClientOnboardingDto } from "../../../services/user.api";
import { Autocomplete } from "../../common/Autocomplete";
import { POPULAR_INDUSTRIES } from "../../../data/categoriesData";

interface StepClientIdentityProps {
  data: ClientOnboardingDto;
  onChange: (field: keyof ClientOnboardingDto, value: any) => void;
  onNext: () => void;
  error?: string;
}

const COMPANY_SIZES = [
  { value: "1-10", label: "1-10 Employees", desc: "Solo Founder, Startup, or Small Team" },
  { value: "11-50", label: "11-50 Employees", desc: "Growing Company or Boutique Agency" },
  { value: "51-200", label: "51-200 Employees", desc: "Mid-Sized Organization" },
  { value: "201-500", label: "201-500 Employees", desc: "Large Enterprise" },
  { value: "500+", label: "500+ Employees", desc: "Global Corporate / Enterprise" },
] as const;

export default function StepClientIdentity({
  data,
  onChange,
  onNext,
  error,
}: StepClientIdentityProps) {
  const [localError, setLocalError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    const name = data.companyName?.trim();
    if (!name || name.length < 2 || name.length > 200) {
      setLocalError("Company or Organization name is required (between 2 and 200 characters).");
      return;
    }

    if (data.companyWebsite?.trim()) {
      try {
        new URL(data.companyWebsite.trim());
      } catch {
        setLocalError("Company website must be a valid URL (e.g., https://example.com).");
        return;
      }
    }

    const ind = data.industry?.trim();
    if (ind && ind.length > 100) {
      setLocalError("Industry cannot exceed 100 characters.");
      return;
    }

    onNext();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Client & Organization Identity</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tell freelancers who you are. Both registered organizations and individual clients are welcome.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* Company / Client Name (Mandatory) */}
      <div>
        <label htmlFor="client-company-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Company or Organization Name <span className="text-red-500">*</span>
        </label>
        <input
          id="client-company-name"
          type="text"
          value={data.companyName || ""}
          onChange={(e) => onChange("companyName", e.target.value)}
          placeholder="e.g., Acme Technologies, or John Smith (Individual Client)"
          minLength={2}
          maxLength={200}
          required
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          If you are an individual client, you can enter your personal name or project/brand name (2 to 200 characters).
        </p>
      </div>

      {/* Company Website (Optional) */}
      <div>
        <label htmlFor="client-company-website" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
          Company Website <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>
        <input
          id="client-company-website"
          type="url"
          value={data.companyWebsite || ""}
          onChange={(e) => onChange("companyWebsite", e.target.value)}
          placeholder="https://example.com"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        />
        <p className="mt-1 text-[11px] text-slate-400">
          Public website, LinkedIn page, or project link.
        </p>
      </div>

      {/* Industry (Optional) */}
      <div>
        <Autocomplete
          id="client-industry"
          label="Industry / Business Domain (Optional)"
          value={data.industry || ""}
          onChange={(ind) => onChange("industry", ind)}
          options={POPULAR_INDUSTRIES}
          placeholder="e.g., Software & SaaS, FinTech, E-Commerce"
          allowCustom={true}
        />
      </div>

      {/* Company Size (Optional) */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Organization / Team Size <span className="text-slate-400 font-normal lowercase">(optional)</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {COMPANY_SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              onClick={() => onChange("companySize", size.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                data.companySize === size.value
                  ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 font-bold"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="text-xs font-bold text-slate-900">{size.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{size.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="pt-6 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          id="step-client-identity-next-btn"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Continue to Location & Billing
        </button>
      </div>
    </form>
  );
}

