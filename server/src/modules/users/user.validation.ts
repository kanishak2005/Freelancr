import { body } from "express-validator";

export const updateProfileValidation = [
  body("fullName")
    .optional()
    .isString()
    .withMessage("Full name must be a string")
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Full name must be between 3 and 100 characters"),

  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be a string")
    .trim()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters"),

  body("phone")
    .optional()
    .isMobilePhone("any")
    .withMessage("Invalid phone number"),

  body("location")
    .optional()
    .isString()
    .withMessage("Location must be a string")
    .trim()
    .isLength({ max: 150 })
    .withMessage("Location cannot exceed 150 characters"),

  body("avatar")
    .optional()
    .isString()
    .withMessage("Avatar must be a string")
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Avatar is too long"),

  body("skills")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Skills must be an array with at most 30 items"),

  body("skills.*")
    .optional()
    .isString()
    .withMessage("Each skill must be a string")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each skill must be between 1 and 50 characters"),
];

export const freelancerOnboardingValidation = [
  // Reject body-supplied protected/internal fields
  body("id").not().exists().withMessage("User ID cannot be supplied in request body"),
  body("_id").not().exists().withMessage("User ID cannot be supplied in request body"),
  body("role").not().exists().withMessage("User role cannot be changed via onboarding"),
  body("email").not().exists().withMessage("User email cannot be changed via onboarding"),
  body("password").not().exists().withMessage("Password cannot be modified via onboarding"),
  body("isVerified").not().exists().withMessage("Verification status cannot be modified via onboarding"),
  body("isActive").not().exists().withMessage("Active status cannot be modified via onboarding"),
  body("onboardingStatus").not().exists().withMessage("Onboarding status cannot be modified via request body"),

  // Basic Profile fields
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage("Title must be between 2 and 120 characters"),

  body("bio")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Bio cannot exceed 2000 characters"),

  body("city")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters"),

  body("country")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Country must be between 1 and 100 characters"),

  body("skills")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Skills must be an array of at most 50 items"),
  body("skills.*")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Skill name must be between 1 and 50 characters"),

  // Skill Proficiencies
  body("skillProficiencies")
    .optional()
    .isArray({ max: 50 })
    .withMessage("Skill proficiencies must be an array of at most 50 items"),
  body("skillProficiencies.*.name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Proficiency skill name is required and must be between 1 and 50 characters"),
  body("skillProficiencies.*.level")
    .optional()
    .isIn(["beginner", "intermediate", "advanced", "expert"])
    .withMessage("Proficiency level must be beginner, intermediate, advanced, or expert"),
  body("skillProficiencies.*.yearsOfExperience")
    .optional()
    .isNumeric()
    .withMessage("Years of experience must be a number"),

  // Experience level
  body("experienceLevel")
    .optional()
    .isIn(["entry", "intermediate", "expert"])
    .withMessage("Experience level must be entry, intermediate, or expert"),

  body("hourlyRate")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Hourly rate must be a non-negative number"),

  // Education
  body("education")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Education must be an array of at most 20 items"),
  body("education.*.institution")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Institution name is required"),
  body("education.*.degree")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Degree is required"),
  body("education.*.fieldOfStudy")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 }),
  body("education.*.startYear")
    .optional()
    .isInt({ min: 1950, max: 2100 })
    .withMessage("Start year must be between 1950 and 2100"),
  body("education.*.endYear")
    .optional()
    .isInt({ min: 1950, max: 2100 })
    .withMessage("End year must be between 1950 and 2100"),
  body("education.*.isCurrent")
    .optional()
    .isBoolean()
    .withMessage("isCurrent must be a boolean"),

  // Projects (Academic, Personal, Commercial)
  body("projects")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Projects must be an array of at most 30 items"),
  body("projects.*.title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Project title is required"),
  body("projects.*.description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 }),
  body("projects.*.projectUrl")
    .optional()
    .isURL()
    .withMessage("Project URL must be valid"),
  body("projects.*.projectType")
    .optional()
    .isIn(["academic", "personal", "commercial"])
    .withMessage("Project type must be academic, personal, or commercial"),
  body("projects.*.skillsUsed")
    .optional()
    .isArray()
    .withMessage("Skills used must be an array of strings"),

  // Employment history (strictly optional for freshers)
  body("employmentHistory")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Employment history must be an array of at most 20 items"),
  body("employmentHistory.*.company")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Company name is required"),
  body("employmentHistory.*.position")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("Position is required"),
  body("employmentHistory.*.startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("employmentHistory.*.endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),
  body("employmentHistory.*.isCurrent")
    .optional()
    .isBoolean()
    .withMessage("isCurrent must be a boolean"),

  // Preferences
  body("preferredCategories")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Preferred categories must be an array of strings"),
  body("workArrangement")
    .optional()
    .isIn(["remote", "hybrid", "on-site"])
    .withMessage("Work arrangement must be remote, hybrid, or on-site"),
  body("remoteOnly")
    .optional()
    .isBoolean()
    .withMessage("remoteOnly must be a boolean"),
  body("minBudget")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minBudget must be non-negative"),
  body("maxBudget")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxBudget must be non-negative"),
  body("availability")
    .optional()
    .isIn(["available", "busy", "not_available"])
    .withMessage("Availability must be available, busy, or not_available"),
];

export const clientOnboardingValidation = [
  // Reject body-supplied protected/internal fields
  body("id").not().exists().withMessage("User ID cannot be supplied in request body"),
  body("_id").not().exists().withMessage("User ID cannot be supplied in request body"),
  body("role").not().exists().withMessage("User role cannot be changed via onboarding"),
  body("email").not().exists().withMessage("User email cannot be changed via onboarding"),
  body("password").not().exists().withMessage("Password cannot be modified via onboarding"),
  body("isVerified").not().exists().withMessage("Verification status cannot be modified via onboarding"),
  body("isActive").not().exists().withMessage("Active status cannot be modified via onboarding"),
  body("onboardingStatus").not().exists().withMessage("Onboarding status cannot be modified via request body"),

  // Reject freelancer-specific fields from client onboarding
  body("skills").not().exists().withMessage("Freelancer skills cannot be submitted to client onboarding"),
  body("skillProficiencies").not().exists().withMessage("Skill proficiencies cannot be submitted to client onboarding"),
  body("experienceLevel").not().exists().withMessage("Experience level cannot be submitted to client onboarding"),
  body("hourlyRate").not().exists().withMessage("Hourly rate cannot be submitted to client onboarding"),
  body("education").not().exists().withMessage("Education cannot be submitted to client onboarding"),
  body("employmentHistory").not().exists().withMessage("Employment history cannot be submitted to client onboarding"),

  // Company Profile fields
  body("companyName")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage("Company name must be between 2 and 200 characters"),

  body("companyWebsite")
    .optional()
    .isURL()
    .withMessage("Company website must be a valid URL"),

  body("industry")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Industry must be between 2 and 100 characters"),

  body("companySize")
    .optional()
    .isIn(["1-10", "11-50", "51-200", "201-500", "500+"])
    .withMessage("Company size must be 1-10, 11-50, 51-200, 201-500, or 500+"),

  body("city")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("City must be between 1 and 100 characters"),

  body("country")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Country must be between 1 and 100 characters"),

  body("billingAddress.street")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 }),
  body("billingAddress.city")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 }),
  body("billingAddress.state")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 }),
  body("billingAddress.postalCode")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 20 }),
  body("billingAddress.country")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 }),

  body("preferredBudgetRange.min")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum budget must be a non-negative number"),
  body("preferredBudgetRange.max")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum budget must be a non-negative number"),

  body("preferredCategories")
    .optional()
    .isArray({ max: 20 })
    .withMessage("Preferred categories must be an array of strings"),
];
