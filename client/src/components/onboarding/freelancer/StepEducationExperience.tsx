import React, { useState } from "react";
import type {
  FreelancerOnboardingDto,
  EducationItem,
  EmploymentHistoryItem,
} from "../../../services/user.api";
import { Autocomplete } from "../../common/Autocomplete";
import {
  POPULAR_UNIVERSITIES,
  POPULAR_DEGREES,
  POPULAR_FIELDS_OF_STUDY,
} from "../../../data/educationData";

interface StepEducationExperienceProps {
  data: FreelancerOnboardingDto;
  onChange: (field: keyof FreelancerOnboardingDto, value: any) => void;
  onNext: () => void;
  onBack: () => void;
  error?: string;
}

export default function StepEducationExperience({
  data,
  onChange,
  onNext,
  onBack,
  error,
}: StepEducationExperienceProps) {
  const educationList = data.education || [];
  const employmentList = data.employmentHistory || [];

  // Local state for adding education
  const [showEduForm, setShowEduForm] = useState(false);
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduStartYear, setEduStartYear] = useState("");
  const [eduEndYear, setEduEndYear] = useState("");
  const [eduIsCurrent, setEduIsCurrent] = useState(false);

  // Local state for adding employment (strictly optional)
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empCompany, setEmpCompany] = useState("");
  const [empPosition, setEmpPosition] = useState("");
  const [empStartDate, setEmpStartDate] = useState("");
  const [empEndDate, setEmpEndDate] = useState("");
  const [empIsCurrent, setEmpIsCurrent] = useState(false);
  const [empDescription, setEmpDescription] = useState("");

  const [localError, setLocalError] = useState("");

  const handleAddEducation = () => {
    setLocalError("");
    const inst = eduInstitution.trim();
    const deg = eduDegree.trim();

    if (!inst) {
      setLocalError("Institution name is required.");
      return;
    }
    if (!deg) {
      setLocalError("Degree is required.");
      return;
    }

    const sYear = eduStartYear ? parseInt(eduStartYear, 10) : undefined;
    const eYear = eduEndYear ? parseInt(eduEndYear, 10) : undefined;

    if (sYear && (sYear < 1950 || sYear > 2100)) {
      setLocalError("Start year must be between 1950 and 2100.");
      return;
    }
    if (eYear && (eYear < 1950 || eYear > 2100)) {
      setLocalError("End year must be between 1950 and 2100.");
      return;
    }
    if (sYear && eYear && eYear < sYear) {
      setLocalError("End year cannot be before start year.");
      return;
    }

    const newEdu: EducationItem = {
      institution: inst,
      degree: deg,
      ...(eduField.trim() ? { fieldOfStudy: eduField.trim() } : {}),
      ...(sYear !== undefined ? { startYear: sYear } : {}),
      ...(eYear !== undefined ? { endYear: eYear } : {}),
      isCurrent: eduIsCurrent,
    };

    onChange("education", [...educationList, newEdu]);

    // Reset form
    setEduInstitution("");
    setEduDegree("");
    setEduField("");
    setEduStartYear("");
    setEduEndYear("");
    setEduIsCurrent(false);
    setShowEduForm(false);
  };

  const handleRemoveEducation = (index: number) => {
    onChange("education", educationList.filter((_, i) => i !== index));
  };

  const handleAddEmployment = () => {
    setLocalError("");
    const comp = empCompany.trim();
    const pos = empPosition.trim();

    if (!comp) {
      setLocalError("Company name is required.");
      return;
    }
    if (!pos) {
      setLocalError("Position is required.");
      return;
    }
    if (!empStartDate) {
      setLocalError("Start date is required for employment.");
      return;
    }

    const newEmp: EmploymentHistoryItem = {
      company: comp,
      position: pos,
      startDate: new Date(empStartDate).toISOString(),
      ...(empEndDate ? { endDate: new Date(empEndDate).toISOString() } : {}),
      isCurrent: empIsCurrent,
      ...(empDescription.trim() ? { description: empDescription.trim() } : {}),
    };

    onChange("employmentHistory", [...employmentList, newEmp]);

    // Reset form
    setEmpCompany("");
    setEmpPosition("");
    setEmpStartDate("");
    setEmpEndDate("");
    setEmpIsCurrent(false);
    setEmpDescription("");
    setShowEmpForm(false);
  };

  const handleRemoveEmployment = (index: number) => {
    onChange("employmentHistory", employmentList.filter((_, i) => i !== index));
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
        <h2 className="text-xl font-bold text-slate-900">Education & Work Experience</h2>
        <p className="text-sm text-slate-500 mt-1">
          Share your academic background and optional employment history. Students and freshers can proceed without formal employment.
        </p>
      </div>

      {displayError && (
        <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <span>{displayError}</span>
        </div>
      )}

      {/* SECTION 1: EDUCATION */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Education History</h3>
            <p className="text-xs text-slate-500">Degree, university, college, or certifications.</p>
          </div>
          {!showEduForm && (
            <button
              type="button"
              onClick={() => setShowEduForm(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              + Add Education
            </button>
          )}
        </div>

        {/* Education Entry Form */}
        {showEduForm && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Education Entry</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Autocomplete
                  id="edu-institution"
                  label="Institution"
                  value={eduInstitution}
                  onChange={setEduInstitution}
                  options={POPULAR_UNIVERSITIES}
                  placeholder="e.g. Stanford University, IIT Bombay"
                  required={true}
                  allowCustom={true}
                />
              </div>
              <div>
                <Autocomplete
                  id="edu-degree"
                  label="Degree"
                  value={eduDegree}
                  onChange={setEduDegree}
                  options={POPULAR_DEGREES}
                  placeholder="e.g. B.Tech Computer Science"
                  required={true}
                  allowCustom={true}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Autocomplete
                  id="edu-field"
                  label="Field of Study"
                  value={eduField}
                  onChange={setEduField}
                  options={POPULAR_FIELDS_OF_STUDY}
                  placeholder="e.g. Software Engineering"
                  allowCustom={true}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Year</label>
                <input
                  type="number"
                  min="1950"
                  max="2100"
                  value={eduStartYear}
                  onChange={(e) => setEduStartYear(e.target.value)}
                  placeholder="e.g. 2020"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Year</label>
                <input
                  type="number"
                  min="1950"
                  max="2100"
                  value={eduEndYear}
                  onChange={(e) => setEduEndYear(e.target.value)}
                  placeholder="e.g. 2024"
                  disabled={eduIsCurrent}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edu-current"
                type="checkbox"
                checked={eduIsCurrent}
                onChange={(e) => setEduIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="edu-current" className="text-xs text-slate-700">
                I am currently enrolled in this program
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEduForm(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddEducation}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
              >
                Save Education
              </button>
            </div>
          </div>
        )}

        {/* Existing Education Items */}
        {educationList.length === 0 && !showEduForm ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            No education entries added yet. Click "+ Add Education" to add your university or degrees.
          </div>
        ) : (
          <div className="space-y-2">
            {educationList.map((edu, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-slate-900">{edu.degree}</div>
                  <div className="text-xs text-slate-600">{edu.institution} {edu.fieldOfStudy ? `• ${edu.fieldOfStudy}` : ""}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {edu.startYear || "N/A"} - {edu.isCurrent ? "Present" : edu.endYear || "N/A"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEducation(idx)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-slate-100 my-6" />

      {/* SECTION 2: EMPLOYMENT HISTORY (OPTIONAL) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Work & Employment History</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Optional for freshers
              </span>
            </div>
            <p className="text-xs text-slate-500">Add previous formal roles or leave empty if you are starting fresh.</p>
          </div>
          {!showEmpForm && (
            <button
              type="button"
              onClick={() => setShowEmpForm(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
            >
              + Add Experience
            </button>
          )}
        </div>

        {/* Employment Entry Form */}
        {showEmpForm && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add Employment Entry</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Company *</label>
                <input
                  type="text"
                  value={empCompany}
                  onChange={(e) => setEmpCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Position / Role *</label>
                <input
                  type="text"
                  value={empPosition}
                  onChange={(e) => setEmpPosition(e.target.value)}
                  placeholder="e.g. Frontend Engineer"
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={empStartDate}
                  onChange={(e) => setEmpStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={empEndDate}
                  onChange={(e) => setEmpEndDate(e.target.value)}
                  disabled={empIsCurrent}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-600 outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="emp-current"
                type="checkbox"
                checked={empIsCurrent}
                onChange={(e) => setEmpIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="emp-current" className="text-xs text-slate-700">
                I am currently working here
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Key Responsibilities / Impact</label>
              <textarea
                rows={2}
                value={empDescription}
                onChange={(e) => setEmpDescription(e.target.value)}
                placeholder="Built scalable APIs, optimized query latency, delivered dashboard features..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmpForm(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddEmployment}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm"
              >
                Save Employment
              </button>
            </div>
          </div>
        )}

        {/* Existing Employment Items */}
        {employmentList.length === 0 && !showEmpForm ? (
          <div className="p-4 text-center rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            No employment history added. This is completely optional for freshers and students.
          </div>
        ) : (
          <div className="space-y-2">
            {employmentList.map((emp, idx) => (
              <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-slate-900">{emp.position}</div>
                  <div className="text-xs text-slate-600">{emp.company}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {emp.startDate.substring(0, 10)} - {emp.isCurrent ? "Present" : emp.endDate?.substring(0, 10) || "N/A"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveEmployment(idx)}
                  className="text-xs font-semibold text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
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
          id="step-edu-next-btn"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Continue to Projects & Portfolio
        </button>
      </div>
    </form>
  );
}

