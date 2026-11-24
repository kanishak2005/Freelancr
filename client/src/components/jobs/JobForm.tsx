import {
  useState,
  type FormEvent,
} from "react";

import type {
  CreateJobPayload,
} from "../../services/jobs.api";

import { Autocomplete } from "../common/Autocomplete";
import { MultiSelectAutocomplete } from "../common/MultiSelectAutocomplete";
import { Button } from "../ui/Button";
import { POPULAR_SKILLS } from "../../data/skillsData";
import { POPULAR_CATEGORIES } from "../../data/categoriesData";
import { getCitiesForCountry } from "../../data/locationsData";

interface JobFormProps {
  initialData?: Partial<CreateJobPayload>;
  submitLabel: string;
  onSubmit: (data: CreateJobPayload) => Promise<void>;
}

export default function JobForm({
  initialData,
  submitLabel,
  onSubmit,
}: JobFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [skills, setSkills] = useState<string[]>(initialData?.skills || []);
  const [budget, setBudget] = useState(initialData?.budget?.toString() || "");
  const [budgetType, setBudgetType] = useState<"fixed" | "hourly">(initialData?.budgetType || "fixed");
  const [experienceLevel, setExperienceLevel] = useState<"entry" | "intermediate" | "expert">(
    initialData?.experienceLevel || "entry"
  );
  const [duration, setDuration] = useState(initialData?.duration || "");
  const [location, setLocation] = useState(initialData?.location || "");
  const [isRemote, setIsRemote] = useState(initialData?.isRemote ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const numericBudget = Number(budget);

    if (!Number.isFinite(numericBudget) || numericBudget <= 0) {
      setError("Please enter a valid budget greater than zero.");
      return;
    }

    if (skills.length === 0) {
      setError("Please add at least one required skill.");
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        skills: skills,
        budget: numericBudget,
        budgetType,
        experienceLevel,
        duration: duration.trim(),
        location: location.trim(),
        isRemote,
        attachments: [],
      });
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save job posting. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-3 animate-in fade-in duration-200"
        >
          <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Project Title */}
      <div>
        <label
          htmlFor="job-title"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          Job Title <span className="text-rose-500">*</span>
        </label>
        <input
          id="job-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition disabled:bg-slate-50"
          placeholder="e.g. Senior Full-Stack Engineer for Next.js SaaS Platform"
        />
      </div>

      {/* Project Description */}
      <div>
        <label
          htmlFor="job-description"
          className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
        >
          Project Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          id="job-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          rows={6}
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition resize-y disabled:bg-slate-50"
          placeholder="Provide an overview of your requirements, key deliverables, expectations, and any technical constraints..."
        />
      </div>

      {/* Category & Skills */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Autocomplete
            id="job-category"
            label="Category"
            value={category}
            onChange={setCategory}
            options={POPULAR_CATEGORIES}
            placeholder="Select or enter category (e.g. Web Development)"
            required={true}
            allowCustom={true}
          />
        </div>

        <div>
          <MultiSelectAutocomplete
            id="job-skills"
            label="Required Skills"
            selectedItems={skills}
            onChange={setSkills}
            options={POPULAR_SKILLS}
            placeholder="Search skills (e.g. React, Node.js)..."
            required={true}
            allowCustom={true}
            maxItems={20}
          />
        </div>
      </div>

      {/* Budget, Budget Type, Experience Level */}
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label
            htmlFor="job-budget"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Budget (INR ₹) <span className="text-rose-500">*</span>
          </label>
          <input
            id="job-budget"
            type="number"
            min="1"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            required
            disabled={loading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition disabled:bg-slate-50"
            placeholder="50000"
          />
        </div>

        <div>
          <label
            htmlFor="job-budget-type"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Budget Type <span className="text-rose-500">*</span>
          </label>
          <select
            id="job-budget-type"
            value={budgetType}
            onChange={(event) => setBudgetType(event.target.value as "fixed" | "hourly")}
            disabled={loading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition disabled:bg-slate-50 cursor-pointer"
          >
            <option value="fixed">Fixed Price</option>
            <option value="hourly">Hourly Rate</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="job-experience-level"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Experience Level <span className="text-rose-500">*</span>
          </label>
          <select
            id="job-experience-level"
            value={experienceLevel}
            onChange={(event) => setExperienceLevel(event.target.value as "entry" | "intermediate" | "expert")}
            disabled={loading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition disabled:bg-slate-50 cursor-pointer"
          >
            <option value="entry">Entry Level</option>
            <option value="intermediate">Intermediate Level</option>
            <option value="expert">Expert Level</option>
          </select>
        </div>
      </div>

      {/* Duration & Location */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="job-duration"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
          >
            Estimated Duration
          </label>
          <input
            id="job-duration"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none transition disabled:bg-slate-50"
            placeholder="e.g. 2–4 weeks or 3 months"
          />
        </div>

        <div>
          <Autocomplete
            id="job-location"
            label="Location (City / Country)"
            value={location}
            onChange={setLocation}
            options={getCitiesForCountry()}
            disabled={isRemote || loading}
            placeholder={isRemote ? "Remote (Worldwide)" : "e.g. Bengaluru, India"}
            allowCustom={true}
          />
        </div>
      </div>

      {/* Remote Toggle */}
      <div className="pt-1">
        <label className="inline-flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isRemote}
            onChange={(event) => setIsRemote(event.target.checked)}
            disabled={loading}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition cursor-pointer"
          />
          <span className="text-sm font-medium text-slate-800">
            This is a remote opportunity (freelancers can work from anywhere)
          </span>
        </label>
      </div>

      {/* Submit Action */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={loading}
          disabled={loading}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}