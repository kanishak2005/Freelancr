import React, { useState } from "react";
import type { FreelancerOnboardingDto, SkillProficiencyItem } from "../../../services/user.api";
import { Autocomplete } from "../../common/Autocomplete";
import { POPULAR_SKILLS } from "../../../data/skillsData";

interface StepSkillsProps {
  data: FreelancerOnboardingDto;
  onChange: (field: keyof FreelancerOnboardingDto, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
}

export default function StepSkills({ data, onChange, onNext, onBack, error }: StepSkillsProps) {
  const [skillInput, setSkillInput] = useState("");
  const [proficiencyLevel, setProficiencyLevel] = useState<"beginner" | "intermediate" | "advanced" | "expert">("intermediate");
  const [yearsInput, setYearsInput] = useState<string>("");
  const [localError, setLocalError] = useState("");

  const proficiencies = data.skillProficiencies || [];
  const topSkills = data.skills || [];

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    const trimmed = skillInput.trim();
    if (!trimmed) return;

    if (trimmed.length > 50) {
      setLocalError("Skill name cannot exceed 50 characters.");
      return;
    }

    if (proficiencies.length >= 50) {
      setLocalError("You can add at most 50 skills.");
      return;
    }

    const exists = proficiencies.some((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setLocalError(`"${trimmed}" is already added.`);
      return;
    }

    const years = yearsInput ? Math.max(0, parseFloat(yearsInput)) : undefined;

    const newProficiency: SkillProficiencyItem = {
      name: trimmed,
      level: proficiencyLevel,
      ...(years !== undefined ? { yearsOfExperience: years } : {}),
    };

    const nextProficiencies = [...proficiencies, newProficiency];
    onChange("skillProficiencies", nextProficiencies);

    if (!topSkills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      onChange("skills", [...topSkills, trimmed]);
    }

    setSkillInput("");
    setYearsInput("");
  };

  const handleRemoveSkill = (skillName: string) => {
    const nextProficiencies = proficiencies.filter((p) => p.name.toLowerCase() !== skillName.toLowerCase());
    const nextSkills = topSkills.filter((s) => s.toLowerCase() !== skillName.toLowerCase());
    onChange("skillProficiencies", nextProficiencies);
    onChange("skills", nextSkills);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (proficiencies.length === 0 && topSkills.length === 0) {
      setLocalError("Please add at least one core skill to showcase your capabilities.");
      return;
    }

    onNext();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Skills & Technical Proficiencies</h2>
        <p className="text-sm text-slate-500 mt-1">
          Specify your technical skills, tools, and expertise level.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* Experience Level */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
          Overall Professional Experience Level
        </label>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { value: "entry", label: "Entry-Level / Fresher", desc: "0-2 years experience" },
              { value: "intermediate", label: "Intermediate", desc: "2-5 years experience" },
              { value: "expert", label: "Senior / Expert", desc: "5+ years experience" },
            ] as const
          ).map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              onClick={() => onChange("experienceLevel", lvl.value)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                (data.experienceLevel || "entry") === lvl.value
                  ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 font-bold"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="text-xs font-bold text-slate-900">{lvl.label}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{lvl.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Skill Form Section */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Skill or Tool</h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <Autocomplete
              id="skill-name-input"
              label="Skill Name"
              value={skillInput}
              onChange={setSkillInput}
              options={POPULAR_SKILLS}
              placeholder="e.g. React, Node.js, Python"
              allowCustom={true}
              maxSuggestions={8}
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="skill-level-select" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Proficiency
            </label>
            <select
              id="skill-level-select"
              value={proficiencyLevel}
              onChange={(e) => setProficiencyLevel(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="skill-years-input" className="block text-[11px] font-semibold text-slate-600 mb-1">
              Years (Opt)
            </label>
            <input
              id="skill-years-input"
              type="number"
              min="0"
              step="0.5"
              value={yearsInput}
              onChange={(e) => setYearsInput(e.target.value)}
              placeholder="e.g. 2"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={handleAddSkill}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
            >
              Add Skill
            </button>
          </div>
        </div>
      </div>

      {/* Added Skills List */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Selected Skills ({proficiencies.length})
          </label>
          <span className="text-[11px] text-slate-400">At least 1 required</span>
        </div>

        {proficiencies.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            No skills added yet. Add your primary frameworks, languages, or tools above.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {proficiencies.map((item) => (
              <span
                key={item.name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-medium"
              >
                <span className="font-bold">{item.name}</span>
                <span className="text-[10px] uppercase font-semibold text-indigo-500 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                  {item.level}
                </span>
                {item.yearsOfExperience !== undefined && (
                  <span className="text-[10px] text-indigo-400">({item.yearsOfExperience}y)</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(item.name)}
                  className="ml-1 text-indigo-400 hover:text-red-500 font-bold focus:outline-none"
                  aria-label={`Remove ${item.name}`}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}
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
          id="step-skills-next-btn"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Continue to Education & Experience
        </button>
      </div>
    </form>
  );
}

