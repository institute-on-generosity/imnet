import type { Metadata } from "next"
import { Literata, Schibsted_Grotesk } from "next/font/google"
import { SiteHeader } from "@/components/site-header"
import "./globals.css"

// Literata for stories and headlines, Schibsted Grotesk for interface text.
const story = Literata({ variable: "--font-story", subsets: ["latin"], style: ["normal", "italic"] })
const ui = Schibsted_Grotesk({ variable: "--font-ui", subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "imnet: Impact Network", template: "%s · imnet" },
  description: "Discover nonprofits through the impact they create.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${story.variable} ${ui.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1 pt-6 pb-20">{children}</main>
      </body>
    </html>
  )
}
