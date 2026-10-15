import { OG_SIZE, ogCard } from "@/lib/og"
import { getOrgBySlug } from "@/lib/queries"

export const size = OG_SIZE
export const contentType = "image/png"
export const alt = "Organization on imnet"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getOrgBySlug(slug)
  if (!data) return ogCard({ orgName: "imnet", orgType: "nonprofit", text: "Stories from nonprofits, with the sources behind them" })
  return ogCard({ orgName: data.org.name, orgType: data.org.org_type, text: data.org.mission ?? "On imnet" })
}
