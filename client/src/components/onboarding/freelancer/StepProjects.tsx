import React, { useState } from "react";
import type { FreelancerOnboardingDto, ProjectItem } from "../../../services/user.api";
import { MultiSelectAutocomplete } from "../../common/MultiSelectAutocomplete";
import { POPULAR_SKILLS } from "../../../data/skillsData";

interface StepProjectsProps {
  data: FreelancerOnboardingDto;
  onChange: (field: keyof FreelancerOnboardingDto, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
}

export default function StepProjects({ data, onChange, onNext, onBack, error }: StepProjectsProps) {
  const projectsList = data.projects || [];

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [projectType, setProjectType] = useState<"academic" | "personal" | "commercial">("personal");
  const [skillsUsed, setSkillsUsed] = useState<string[]>([]);
  const [localError, setLocalError] = useState("");

  const handleAddProject = () => {
    setLocalError("");
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setLocalError("Project title is required.");
      return;
    }
    if (trimmedTitle.length < 1 || trimmedTitle.length > 200) {
      setLocalError("Project title must be between 1 and 200 characters.");
      return;
    }

    if (description.trim().length > 2000) {
      setLocalError("Description cannot exceed 2000 characters.");
      return;
    }

    if (projectUrl.trim()) {
      try {
        new URL(projectUrl.trim());
      } catch {
        setLocalError("Project URL must be a valid URL (e.g. https://github.com/user/project).");
        return;
      }
    }

    const newProject: ProjectItem = {
      title: trimmedTitle,
      projectType,
      skillsUsed: skillsUsed,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(projectUrl.trim() ? { projectUrl: projectUrl.trim() } : {}),
    };

    onChange("projects", [...projectsList, newProject]);

    // Reset form
    setTitle("");
    setDescription("");
    setProjectUrl("");
    setProjectType("personal");
    setSkillsUsed([]);
    setShowForm(false);
  };

  const handleRemoveProject = (index: number) => {
    onChange("projects", projectsList.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");
    onNext();
  };

  const displayError = localError || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">Projects & Portfolio</h2>
        <p className="text-sm text-slate-500 mt-1">
          Showcase coursework, academic capstones, personal open-source projects, or commercial deliverables.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Portfolio Projects ({projectsList.length})</h3>
          <p className="text-xs text-slate-500">Academic, personal, and commercial projects are equally valid.</p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg transition"
          >
            + Add Project
          </button>
        )}
      </div>

      {/* Project Entry Form */}
      {showForm && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 animate-in fade-in">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Project Entry</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Project Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Real-Time Chat Engine, E-Commerce Store"
                maxLength={200}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Project Classification</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-600 outline-none"
              >
                <option value="personal">Personal Project / Open Source</option>
                <option value="academic">Academic Capstone / Coursework</option>
                <option value="commercial">Commercial / Client Deliverable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Project URL / Repository (Optional)</label>
            <input
              type="url"
              value={projectUrl}
              onChange={(e) => setProjectUrl(e.target.value)}
              placeholder="https://github.com/username/project or https://myproject.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
            />
          </div>

          <div>
            <MultiSelectAutocomplete
              id="project-skills-input"
              label="Technologies / Skills Used"
              selectedItems={skillsUsed}
              onChange={setSkillsUsed}
              options={POPULAR_SKILLS}
              placeholder="Search or type skills used in this project..."
              allowCustom={true}
              maxItems={20}
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Summary / Highlights</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What problem does this project solve? What technical architecture did you build?"
              maxLength={2000}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddProject}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
            >
              Save Project
            </button>
          </div>
        </div>
      )}

      {/* Projects List */}
      {projectsList.length === 0 && !showForm ? (
        <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
          No projects added yet. Showcase at least one academic, personal, or client project to prove your hands-on ability.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projectsList.map((proj, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{proj.title}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {proj.projectType}
                  </span>
                </div>
                {proj.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{proj.description}</p>
                )}
                {proj.skillsUsed && proj.skillsUsed.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {proj.skillsUsed.map((s, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-600">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                {proj.projectUrl ? (
                  <a
                    href={proj.projectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-indigo-600 hover:underline truncate max-w-[180px]"
                  >
                    View Project &rarr;
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400">No URL</span>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveProject(idx)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
          id="step-proj-next-btn"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Continue to Preferences & Review
        </button>
      </div>
    </form>
  );
}

