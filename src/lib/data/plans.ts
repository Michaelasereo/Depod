/** Plan limits from the PRD (Pricing). null means unlimited. */
export type Plan = "free" | "pro" | "team" | "enterprise";

export const LIMITS: Record<Plan, { moodboards: number | null; images: number | null; mark: boolean }> = {
  free: { moodboards: 3, images: 50, mark: true },
  pro: { moodboards: null, images: 500, mark: false },
  team: { moodboards: null, images: 2000, mark: false },
  enterprise: { moodboards: null, images: null, mark: false },
};

export const UPGRADE_TO: Record<Plan, { plan: string; images: number | null } | null> = {
  free: { plan: "Pro", images: 500 },
  pro: { plan: "Team", images: 2000 },
  team: { plan: "Enterprise", images: null },
  enterprise: null,
};
