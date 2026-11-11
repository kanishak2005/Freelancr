export type UserRole = "client" | "freelancer" | "admin";
export type OnboardingStatus = "pending" | "completed" | "exempt";
export type ExperienceLevel = "entry" | "intermediate" | "expert";
export type SkillProficiencyLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type WorkArrangement = "remote" | "hybrid" | "on-site";

export interface ISkillProficiency {
  name: string;
  level: SkillProficiencyLevel;
  yearsOfExperience?: number;
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  isCurrent?: boolean;
}

export interface IProject {
  title: string;
  description?: string;
  projectUrl?: string;
  projectType: "academic" | "personal" | "commercial";
  skillsUsed: string[];
  imageUrl?: string;
  publicId?: string;
}

export interface IEmploymentHistory {
  company: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  isCurrent?: boolean;
  description?: string;
}

export interface IFreelancerProfileExtension {
  title?: string;
  experienceLevel?: ExperienceLevel;
  hourlyRate?: number;
  skillProficiencies?: ISkillProficiency[];
  education?: IEducation[];
  projects?: IProject[];
  employmentHistory?: IEmploymentHistory[];
  preferredCategories?: string[];
  workArrangement?: WorkArrangement;
  remoteOnly?: boolean;
  minBudget?: number;
  maxBudget?: number;
  availability?: "available" | "busy" | "not_available";
}

export interface ICompanyProfileExtension {
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  preferredBudgetRange?: {
    min?: number;
    max?: number;
  };
  preferredCategories?: string[];
}

export interface IUser {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;

  avatar?: string;
  bio?: string;
  phone?: string;
  location?: string;
  city?: string;
  country?: string;

  skills: string[];
  isVerified: boolean;
  isActive: boolean;
  onboardingStatus?: string;

  freelancerProfile?: IFreelancerProfileExtension;
  companyProfile?: ICompanyProfileExtension;

  googleId?: string;
  authProvider?: "local" | "google";
  refreshToken?: string;
  createdAt?: Date;
  updatedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  resume?: string;
  resumePublicId?: string;
  portfolio?: {
    title: string;
    image: string;
    publicId: string;
    description?: string;
    projectUrl?: string;
  }[];
}

export interface FreelancerOnboardingDto {
  title?: string;
  bio?: string;
  city?: string;
  country?: string;
  skills?: string[];
  skillProficiencies?: ISkillProficiency[];
  experienceLevel?: ExperienceLevel;
  hourlyRate?: number;
  education?: IEducation[];
  projects?: IProject[];
  employmentHistory?: IEmploymentHistory[];
  preferredCategories?: string[];
  workArrangement?: WorkArrangement;
  remoteOnly?: boolean;
  minBudget?: number;
  maxBudget?: number;
  availability?: "available" | "busy" | "not_available";
}

export interface ClientOnboardingDto {
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "500+";
  city?: string;
  country?: string;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  preferredBudgetRange?: {
    min?: number;
    max?: number;
  };
  preferredCategories?: string[];
}
