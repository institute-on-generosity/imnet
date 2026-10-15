import type { OrgSummary, Post } from "@/lib/types"

// For a Following feed: posts that appear only because the viewer follows the foundation whose
// grant they report on. Returns post id -> that foundation, for a "From the portfolio of" line.
export function portfolioContext(posts: Pick<Post, "id" | "org_id" | "report_grant">[], followedOrgIds: Set<string>) {
  const context = new Map<string, OrgSummary>()
  for (const p of posts) {
    const foundation = p.report_grant?.foundation
    if (foundation && p.org_id && !followedOrgIds.has(p.org_id) && followedOrgIds.has(foundation.id)) context.set(p.id, foundation)
  }
  return context
}
