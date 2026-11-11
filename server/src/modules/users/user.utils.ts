/**
 * Pure non-mutating helper to resolve the effective onboarding status of a user.
 * 
 * Rules:
 * 1. Explicit 'pending' -> 'pending'
 * 2. Explicit 'completed' -> 'completed'
 * 3. Explicit 'exempt' -> 'completed'
 * 4. Missing, undefined, null, or unknown historical status -> 'completed' (legacy user access)
 */
export function resolveUserOnboardingStatus(
  user?: { onboardingStatus?: string | null } | null
): "pending" | "completed" {
  if (!user || !user.onboardingStatus) {
    return "completed";
  }

  const normalized = user.onboardingStatus.trim().toLowerCase();
  if (normalized === "pending") {
    return "pending";
  }

  // All other values ('completed', 'exempt', legacy historical strings) resolve to 'completed'
  return "completed";
}

/**
 * Normalizes and synchronizes top-level skills with skillProficiencies.
 * Preserves uniqueness (case-insensitive deduplication).
 */
export function syncSkillsWithProficiencies(
  explicitSkills?: string[],
  proficiencies?: { name: string }[]
): string[] {
  const set = new Set<string>();

  if (Array.isArray(explicitSkills)) {
    for (const skill of explicitSkills) {
      const trimmed = skill.trim();
      if (trimmed) set.add(trimmed);
    }
  }

  if (Array.isArray(proficiencies)) {
    for (const p of proficiencies) {
      if (p?.name) {
        const trimmed = p.name.trim();
        if (trimmed) set.add(trimmed);
      }
    }
  }

  return Array.from(set);
}

