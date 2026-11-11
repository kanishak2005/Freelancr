import { api } from "../lib/axios";
import type { AuthUser } from "../store/slices/authSlice";

export interface SkillProficiencyItem {
  name: string;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  yearsOfExperience?: number;
}

export interface EducationItem {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  isCurrent?: boolean;
}

export interface ProjectItem {
  title: string;
  description?: string;
  projectUrl?: string;
  projectType: "academic" | "personal" | "commercial";
  skillsUsed: string[];
}

export interface EmploymentHistoryItem {
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
}

export interface FreelancerOnboardingDto {
  title?: string;
  bio?: string;
  city?: string;
  country?: string;
  skills?: string[];
  skillProficiencies?: SkillProficiencyItem[];
  experienceLevel?: "entry" | "intermediate" | "expert";
  hourlyRate?: number;
  education?: EducationItem[];
  projects?: ProjectItem[];
  employmentHistory?: EmploymentHistoryItem[];
  preferredCategories?: string[];
  workArrangement?: "remote" | "hybrid" | "on-site";
  remoteOnly?: boolean;
  minBudget?: number;
  maxBudget?: number;
  availability?: "available" | "busy" | "not_available";
}

export interface OnboardingResponse {
  success: boolean;
  message: string;
  data: AuthUser;
}

export interface ClientBillingAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ClientBudgetRange {
  min?: number;
  max?: number;
}

export interface ClientOnboardingDto {
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  city?: string;
  country?: string;
  billingAddress?: ClientBillingAddress;
  preferredBudgetRange?: ClientBudgetRange;
  preferredCategories?: string[];
}

/**
 * Submit the freelancer onboarding profile to the backend.
 * Endpoint: PUT /api/v1/users/onboarding/freelancer
 */
export const completeFreelancerOnboarding = async (
  dto: FreelancerOnboardingDto
): Promise<OnboardingResponse> => {
  const response = await api.put<OnboardingResponse>(
    "/users/onboarding/freelancer",
    dto
  );
  return response.data;
};

/**
 * Submit the client onboarding profile to the backend.
 * Endpoint: PUT /api/v1/users/onboarding/client
 */
export const completeClientOnboarding = async (
  dto: ClientOnboardingDto
): Promise<OnboardingResponse> => {
  const response = await api.put<OnboardingResponse>(
    "/users/onboarding/client",
    dto
  );
  return response.data;
};

/**
 * Fetch authenticated user profile using the existing /users/profile endpoint.
 */
export const getUserProfile = async (): Promise<AuthUser> => {
  const response = await api.get<{ success: boolean; data: AuthUser }>(
    "/users/profile"
  );
  return response.data.data;
};

