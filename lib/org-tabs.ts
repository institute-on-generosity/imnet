import type { OrgType } from "@/lib/types"

export const ORG_TABS = ["home", "about", "posts", "portfolio"] as const
export type OrgTab = (typeof ORG_TABS)[number]
export const ORG_TAB_LABEL: Record<OrgTab, string> = { home: "Home", about: "About", posts: "Posts", portfolio: "Portfolio" }

// Portfolio (grantees' reports) only exists for foundations.
export function tabsFor(orgType: OrgType): OrgTab[] {
  return orgType === "foundation" ? [...ORG_TABS] : ["home", "about", "posts"]
}

// Unknown, missing or not-applicable ?tab= falls back to Home.
export function parseOrgTab(tab: unknown, orgType: OrgType = "nonprofit"): OrgTab {
  return tabsFor(orgType).includes(tab as OrgTab) ? (tab as OrgTab) : "home"
}
