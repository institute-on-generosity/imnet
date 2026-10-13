export const ORG_TABS = ["home", "about", "posts"] as const
export type OrgTab = (typeof ORG_TABS)[number]
export const ORG_TAB_LABEL: Record<OrgTab, string> = { home: "Home", about: "About", posts: "Posts" }

// Unknown or missing ?tab= falls back to Home.
export function parseOrgTab(tab: unknown): OrgTab {
  return ORG_TABS.includes(tab as OrgTab) ? (tab as OrgTab) : "home"
}
