// How the onboarding flow should finish:
//  - "new"  : the first profile (guest, or a fresh signed-in account) — set it.
//  - "edit" : change the active person's birth details — update it.
//  - "add"  : create an additional individual profile on the account.
export type OnboardingMode = "new" | "edit" | "add";

let mode: OnboardingMode = "new";

export function setOnboardingMode(m: OnboardingMode) {
  mode = m;
}
export function getOnboardingMode(): OnboardingMode {
  return mode;
}
