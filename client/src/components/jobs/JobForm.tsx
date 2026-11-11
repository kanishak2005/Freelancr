import {
  useState,
  type FormEvent,
} from "react";

import type {
  CreateJobPayload,
} from "../../services/jobs.api";

import { Autocomplete } from "../common/Autocomplete";
import { MultiSelectAutocomplete } from "../common/MultiSelectAutocomplete";
import { POPULAR_SKILLS } from "../../data/skillsData";
import { POPULAR_CATEGORIES } from "../../data/categoriesData";
import { getCitiesForCountry } from "../../data/locationsData";

interface JobFormProps {
  initialData?: Partial<CreateJobPayload>;

  submitLabel: string;

  onSubmit: (
    data: CreateJobPayload
  ) => Promise<void>;
}

export default function JobForm({
  initialData,
  submitLabel,
  onSubmit,
}: JobFormProps) {
  const [title, setTitle] =
    useState(initialData?.title || "");

  const [description, setDescription] =
    useState(
      initialData?.description || ""
    );

  const [category, setCategory] =
    useState(
      initialData?.category || ""
    );

  const [skills, setSkills] =
    useState<string[]>(
      initialData?.skills || []
    );

  const [budget, setBudget] =
    useState(
      initialData?.budget?.toString() ||
        ""
    );

  const [budgetType, setBudgetType] =
    useState<
      "fixed" | "hourly"
    >(
      initialData?.budgetType ||
        "fixed"
    );

  const [
    experienceLevel,
    setExperienceLevel,
  ] = useState<
    "entry" | "intermediate" | "expert"
  >(
    initialData?.experienceLevel ||
      "entry"
  );

  const [duration, setDuration] =
    useState(
      initialData?.duration || ""
    );

  const [location, setLocation] =
    useState(
      initialData?.location || ""
    );

  const [isRemote, setIsRemote] =
    useState(
      initialData?.isRemote ?? true
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setError("");

    const numericBudget =
      Number(budget);

    if (
      !Number.isFinite(
        numericBudget
      ) ||
      numericBudget <= 0
    ) {
      setError(
        "Please enter a valid budget."
      );
      return;
    }

    if (skills.length === 0) {
      setError(
        "Please add at least one skill."
      );
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
          "Failed to save job."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium">
          Job Title
        </label>

        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          required
          className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="Build a React dashboard"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Description
        </label>

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          required
          rows={7}
          className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
          placeholder="Describe the project..."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
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

      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Budget
          </label>

          <input
            type="number"
            min="1"
            value={budget}
            onChange={(event) =>
              setBudget(event.target.value)
            }
            required
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Budget Type
          </label>

          <select
            value={budgetType}
            onChange={(event) =>
              setBudgetType(
                event.target.value as
                  | "fixed"
                  | "hourly"
              )
            }
            className="w-full rounded-lg border px-4 py-3"
          >
            <option value="fixed">
              Fixed
            </option>

            <option value="hourly">
              Hourly
            </option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Experience
          </label>

          <select
            value={experienceLevel}
            onChange={(event) =>
              setExperienceLevel(
                event.target.value as
                  | "entry"
                  | "intermediate"
                  | "expert"
              )
            }
            className="w-full rounded-lg border px-4 py-3"
          >
            <option value="entry">
              Entry
            </option>

            <option value="intermediate">
              Intermediate
            </option>

            <option value="expert">
              Expert
            </option>
          </select>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Duration
          </label>

          <input
            value={duration}
            onChange={(event) =>
              setDuration(
                event.target.value
              )
            }
            className="w-full rounded-lg border px-4 py-3 outline-none focus:border-indigo-500"
            placeholder="2 weeks"
          />
        </div>

        <div>
          <Autocomplete
            id="job-location"
            label="Location"
            value={location}
            onChange={setLocation}
            options={getCitiesForCountry()}
            disabled={isRemote}
            placeholder="e.g. Bengaluru, India, or London"
            allowCustom={true}
          />
        </div>
      </div>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={isRemote}
          onChange={(event) =>
            setIsRemote(
              event.target.checked
            )
          }
          className="h-4 w-4"
        />

        <span className="text-sm">
          This is a remote job
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading
          ? "Saving..."
          : submitLabel}
      </button>
    </form>
  );
}