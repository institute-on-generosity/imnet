import { ImageResponse } from "next/og"
import type { OrgType } from "@/lib/types"

// Share-preview cards (1200x630). Brand colors from globals.css; foundations use navy.
export const OG_SIZE = { width: 1200, height: 630 }
const INK = "#14213d"
const LEAF = "#1f7a5a"
const MARIGOLD = "#f4b400"
const PAPER = "#f5f6f4"

export function ogCard(opts: { orgName: string; orgType: OrgType; eyebrow?: string; text: string; imageUrl?: string | null }) {
  const foundation = opts.orgType === "foundation"
  const max = opts.imageUrl ? 150 : 220
  const text = opts.text.length > max ? `${opts.text.slice(0, max - 3).trimEnd()}...` : opts.text
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: foundation ? INK : PAPER, color: foundation ? "white" : INK }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, width: opts.imageUrl ? 700 : 1200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 16,
                fontSize: 40,
                background: foundation ? "#22305a" : "#e6f2ec",
                color: foundation ? MARIGOLD : LEAF,
              }}
            >
              {opts.orgName.trim().charAt(0)}
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 34, fontWeight: 700 }}>{opts.orgName}</div>
              <div style={{ fontSize: 24, color: foundation ? MARIGOLD : LEAF }}>{opts.eyebrow ?? (foundation ? "Foundation" : "Nonprofit")}</div>
            </div>
          </div>
          <div style={{ fontSize: opts.imageUrl ? 36 : 44, lineHeight: 1.35 }}>{text}</div>
          <div style={{ fontSize: 30, fontWeight: 700, opacity: 0.85 }}>imnet</div>
        </div>
        {opts.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={opts.imageUrl} alt="" width={500} height={630} style={{ objectFit: "cover", width: 500, height: 630 }} />
        )}
      </div>
    ),
    OG_SIZE,
  )
}
