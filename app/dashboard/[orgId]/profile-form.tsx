"use client"

import { Save, Sparkles } from "lucide-react"
import { useActionState, useState, useTransition } from "react"
import { draftProfile, updateOrg } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Cause, Org } from "@/lib/types"
import { CoverPicker } from "./cover-picker"
import { LogoPicker } from "./logo-picker"

export function ProfileForm({ org, causes, selected }: { org: Org; causes: Cause[]; selected: string[] }) {
  const [state, action, pending] = useActionState(updateOrg.bind(null, org.id), null)
  const [mission, setMission] = useState(org.mission ?? "")
  const [funds, setFunds] = useState(org.what_gifts_fund ?? "")
  const [picked, setPicked] = useState(new Set(selected))
  const [drafting, startDraft] = useTransition()
  const [draftNote, setDraftNote] = useState<string | null>(null)

  function draft() {
    startDraft(async () => {
      const res = await draftProfile(org.id)
      if ("error" in res) return setDraftNote(res.error ?? "Could not draft.")
      if (res.draft?.mission) setMission(res.draft.mission)
      if (res.draft?.what_gifts_fund) setFunds(res.draft.what_gifts_fund)
      if (res.causes.length) setPicked(new Set(res.causes))
      setDraftNote("Draft filled in from your website. Review and edit before saving.")
    })
  }

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={draft} disabled={drafting || !org.website}>
          <Sparkles aria-hidden />{drafting ? "Drafting..." : "Draft from website (AI)"}
        </Button>
        {draftNote && <span className="text-sm text-muted-foreground">{draftNote}</span>}
      </div>
      <CoverPicker key={`cover-${state?.message ?? ""}`} org={org} />
      <LogoPicker key={state?.message ?? "logo"} org={org} />
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={state?.values?.name ?? org.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="mission">Mission</Label>
        <Textarea id="mission" name="mission" value={mission} onChange={(e) => setMission(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="what_gifts_fund">What gifts fund</Label>
        <Textarea id="what_gifts_fund" name="what_gifts_fund" value={funds} onChange={(e) => setFunds(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="about">About (shown on your About tab)</Label>
        <Textarea id="about" name="about" rows={4} maxLength={2000} defaultValue={state?.values?.about ?? org.about ?? ""} placeholder="Your story: how you started, how you work, what makes you different" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" maxLength={80} defaultValue={state?.values?.location ?? org.location ?? ""} placeholder="Portland, ME" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="founded_year">Founded</Label>
          <Input id="founded_year" name="founded_year" inputMode="numeric" defaultValue={state?.values?.founded_year ?? org.founded_year ?? ""} placeholder="2011" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="team_size">Team</Label>
          <Input id="team_size" name="team_size" maxLength={80} defaultValue={state?.values?.team_size ?? org.team_size ?? ""} placeholder="14 staff · 320 volunteers" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="programs">Programs (comma separated, up to 8)</Label>
        <Input id="programs" name="programs" defaultValue={state?.values?.programs ?? org.programs.join(", ")} placeholder="Community dinners, Pantry Saturdays, Pantry garden" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="everyorg_slug">Every.org slug (for the Donate button)</Label>
        <Input id="everyorg_slug" name="everyorg_slug" defaultValue={state?.values?.everyorg_slug ?? org.everyorg_slug ?? ""} placeholder="your-org" />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Causes</legend>
        <div className="flex flex-wrap gap-3">
          {causes.map((c) => (
            <label key={c.slug} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                name="causes"
                value={c.slug}
                checked={picked.has(c.slug)}
                onChange={(e) => {
                  const next = new Set(picked)
                  if (e.target.checked) next.add(c.slug)
                  else next.delete(c.slug)
                  setPicked(next)
                }}
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit" disabled={pending}><Save aria-hidden />{pending ? "Saving..." : "Save profile"}</Button>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </form>
  )
}
