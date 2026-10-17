export interface MatchScoreResult {
  score: number;
  breakdown: {
    skills: { weight: number; score: number };
    experience: { weight: number; score: number };
    category: { weight: number; score: number };
    budget: { weight: number; score: number };
    preferences: { weight: number; score: number };
  };
  matchedSkills: string[];
  missingSkills: string[];
}

export interface FreelancerProfile {
  skills?: string[];
  experienceLevel?: "entry" | "intermediate" | "expert" | string;
  preferredCategories?: string[];
  minBudget?: number;
  maxBudget?: number;
  remoteOnly?: boolean;
}

export interface JobTarget {
  skills?: string[];
  experienceLevel?: "entry" | "intermediate" | "expert" | string;
  category?: string;
  budget?: number;
  budgetType?: "fixed" | "hourly" | string;
  isRemote?: boolean;
}

const EXPERIENCE_RANK: Record<string, number> = {
  entry: 1,
  intermediate: 2,
  expert: 3,
};

export class MatchScoreService {
  /**
   * Deterministic Match Score calculation based on transparent product weights:
   * - Skills: 40%
   * - Experience: 20%
   * - Category: 15%
   * - Budget: 15%
   * - Preferences: 10%
   * Total = 100 points
   */
  static compute(
    freelancer: FreelancerProfile,
    job: JobTarget
  ): MatchScoreResult {
    // 1. Skills (40% weight)
    const jobSkills = (job.skills || [])
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const userSkills = (freelancer.skills || [])
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    let matchedSkills: string[] = [];
    let missingSkills: string[] = [];
    let skillsScore = 40; // Default to full credit if job specifies no required skills

    if (jobSkills.length > 0) {
      matchedSkills = jobSkills.filter((s) => userSkills.includes(s));
      missingSkills = jobSkills.filter((s) => !userSkills.includes(s));
      const ratio = matchedSkills.length / jobSkills.length;
      skillsScore = Math.round(ratio * 40);
    } else {
      matchedSkills = [...userSkills];
    }

    // 2. Experience Level (20% weight)
    const jobRank = EXPERIENCE_RANK[(job.experienceLevel || "entry").toLowerCase()] || 1;
    const userRank = EXPERIENCE_RANK[(freelancer.experienceLevel || "intermediate").toLowerCase()] || 2;

    let experienceScore = 20;
    if (userRank >= jobRank) {
      experienceScore = 20; // Meets or exceeds requirements
    } else if (jobRank - userRank === 1) {
      experienceScore = 12; // 1 level gap
    } else {
      experienceScore = 6;  // 2 level gap
    }

    // 3. Category Match (15% weight)
    let categoryScore = 15;
    if (freelancer.preferredCategories && freelancer.preferredCategories.length > 0) {
      const match = freelancer.preferredCategories.some(
        (cat) => cat.toLowerCase() === (job.category || "").toLowerCase()
      );
      categoryScore = match ? 15 : 6;
    } else {
      // Neutral default if no strict category preference specified
      categoryScore = 12;
    }

    // 4. Budget Compatibility (15% weight)
    let budgetScore = 15;
    const jobBudget = job.budget || 0;
    if (freelancer.minBudget && freelancer.minBudget > 0) {
      if (jobBudget >= freelancer.minBudget) {
        budgetScore = 15;
      } else {
        const ratio = jobBudget / freelancer.minBudget;
        budgetScore = Math.max(4, Math.round(ratio * 15));
      }
    }

    // 5. Preferences (Remote / Location) (10% weight)
    let preferencesScore = 10;
    if (freelancer.remoteOnly) {
      preferencesScore = job.isRemote ? 10 : 3;
    }

    const totalScore = Math.min(
      100,
      Math.max(
        0,
        skillsScore + experienceScore + categoryScore + budgetScore + preferencesScore
      )
    );

    return {
      score: totalScore,
      breakdown: {
        skills: { weight: 40, score: skillsScore },
        experience: { weight: 20, score: experienceScore },
        category: { weight: 15, score: categoryScore },
        budget: { weight: 15, score: budgetScore },
        preferences: { weight: 10, score: preferencesScore },
      },
      matchedSkills,
      missingSkills,
    };
  }
}
