import React from "react";
import type { ClientOnboardingDto } from "../../../services/user.api";
import { Autocomplete } from "../../common/Autocomplete";
import { COUNTRY_NAMES, getCitiesForCountry } from "../../../data/locationsData";

interface StepClientLocationProps {
  data: ClientOnboardingDto;
  onChange: (field: keyof ClientOnboardingDto, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
}

export default function StepClientLocation({
  data,
  onChange,
  onNext,
  onBack,
  error,
}: StepClientLocationProps) {
  const [localError, setLocalError] = React.useState("");

  const billing = data.billingAddress || {};

  const handleBillingChange = (field: string, val: string) => {
    onChange("billingAddress", {
      ...billing,
      [field]: val,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

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

    if (billing.street && billing.street.trim().length > 200) {
      setLocalError("Billing street cannot exceed 200 characters.");
      return;
    }
    if (billing.city && billing.city.trim().length > 100) {
      setLocalError("Billing city cannot exceed 100 characters.");
      return;
    }
    if (billing.state && billing.state.trim().length > 100) {
      setLocalError("Billing state cannot exceed 100 characters.");
      return;
    }
    if (billing.postalCode && billing.postalCode.trim().length > 20) {
      setLocalError("Billing postal code cannot exceed 20 characters.");
      return;
    }
    if (billing.country && billing.country.trim().length > 100) {
      setLocalError("Billing country cannot exceed 100 characters.");
      return;
    }

    onNext();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Location & Billing Information</h2>
        <p className="text-sm text-slate-500 mt-1">
          Provide your primary operating location. Optional billing address details can be added for automated invoicing.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* Primary Country and City */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Primary Operating Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Autocomplete
              id="client-country"
              label="Country"
              value={data.country || ""}
              onChange={(country) => onChange("country", country)}
              options={COUNTRY_NAMES}
              placeholder="e.g., India, United States"
              allowCustom={true}
            />
          </div>

          <div>
            <Autocomplete
              id="client-city"
              label="City"
              value={data.city || ""}
              onChange={(city) => onChange("city", city)}
              options={getCitiesForCountry(data.country)}
              placeholder={data.country ? `e.g. Cities in ${data.country}` : "e.g., Bengaluru, Mumbai, London"}
              allowCustom={true}
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-100 my-6" />

      {/* Billing Address (Optional) */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Billing Address</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Optional
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Used on milestone payment invoices. You can fill this now or update it later.
          </p>
        </div>

        <div>
          <label htmlFor="billing-street" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Street Address
          </label>
          <input
            id="billing-street"
            type="text"
            value={billing.street || ""}
            onChange={(e) => handleBillingChange("street", e.target.value)}
            placeholder="e.g., 100 Feet Road, Indiranagar"
            maxLength={200}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Autocomplete
              id="billing-country"
              label="Billing Country"
              value={billing.country || ""}
              onChange={(country) => handleBillingChange("country", country)}
              options={COUNTRY_NAMES}
              placeholder="e.g., India"
              allowCustom={true}
            />
          </div>

          <div>
            <Autocomplete
              id="billing-city"
              label="Billing City"
              value={billing.city || ""}
              onChange={(city) => handleBillingChange("city", city)}
              options={getCitiesForCountry(billing.country)}
              placeholder={billing.country ? `e.g. Cities in ${billing.country}` : "e.g., Bengaluru"}
              allowCustom={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="billing-state" className="block text-[11px] font-semibold text-slate-600 mb-1">
              State / Region
            </label>
            <input
              id="billing-state"
              type="text"
              value={billing.state || ""}
              onChange={(e) => handleBillingChange("state", e.target.value)}
              placeholder="e.g., Karnataka"
              maxLength={100}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-none"
            />
          </div>

          <div>
            <label htmlFor="billing-postal" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Postal / Zip Code
            </label>
            <input
              id="billing-postal"
              type="text"
              value={billing.postalCode || ""}
              onChange={(e) => handleBillingChange("postalCode", e.target.value)}
              placeholder="e.g., 560038"
              maxLength={20}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-none"
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
          id="step-client-location-next-btn"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Continue to Hiring Preferences
        </button>
      </div>
    </form>
  );
}

