export const ORG_TABS = ["home", "about", "posts"] as const
export type OrgTab = (typeof ORG_TABS)[number]

// Unknown or missing ?tab= falls back to Home.
export function parseOrgTab(tab: unknown): OrgTab {
  return ORG_TABS.includes(tab as OrgTab) ? (tab as OrgTab) : "home"
}
