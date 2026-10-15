"use client"

import { Check, Save, Shuffle } from "lucide-react"
import { useActionState, useState } from "react"
import { updateMyProfile } from "@/app/actions"
import { PersonAvatar } from "@/components/person-avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PERSON_COVERS, personCoverSrc } from "@/lib/cover"
import type { Cause } from "@/lib/types"
import { cn } from "@/lib/utils"

type Profile = { handle: string; display_name: string | null; bio: string | null; location: string | null; about: string | null; cover_url: string | null; avatar_url: string | null }

export function ProfileEditor({ profile, causes, selected }: { profile: Profile; causes: Cause[]; selected: string[] }) {
  const [state, action, pending] = useActionState(updateMyProfile, null)
  const v = state?.values
  const current = profile.cover_url?.replace(/^covers\/|\.webp$/g, "") ?? ""
  const [cover, setCover] = useState(v?.cover ?? current)
  const [shuffle, setShuffle] = useState(false)
  return (
    <form action={action} className="mt-6 space-y-5">
      {/* F-098: who you are first, then how you look, then what you care about. */}
      <div className="space-y-4">
        <h2 className="h-section">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="display_name">Name</Label>
            <Input id="display_name" name="display_name" required maxLength={80} defaultValue={v?.display_name ?? profile.display_name ?? ""} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" maxLength={80} defaultValue={v?.location ?? profile.location ?? ""} placeholder="Milwaukee, WI" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="bio">Headline</Label>
          <Input id="bio" name="bio" maxLength={160} defaultValue={v?.bio ?? profile.bio ?? ""} placeholder="Monthly giver. Food security and good libraries." />
        </div>
        <div className="space-y-1">
          <Label htmlFor="about">About</Label>
          <Textarea id="about" name="about" rows={5} maxLength={2000} defaultValue={v?.about ?? profile.about ?? ""} placeholder="Why you give, what you care about, where you volunteer" />
        </div>
      </div>
      <div className="space-y-4 border-t pt-5">
        <h2 className="h-section">Photo and cover</h2>
        <div className="flex items-center gap-3">
          <PersonAvatar name={profile.display_name ?? profile.handle} avatarUrl={profile.avatar_url} size="lg" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border py-1.5 pr-3 pl-[11px] text-sm hover:bg-muted has-checked:border-leaf has-checked:bg-leaf-soft has-checked:text-leaf has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
            <input type="checkbox" name="new_avatar" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="sr-only" />
            <Shuffle className="size-4" aria-hidden />{shuffle ? "New avatar on save" : "Draw me a new avatar"}
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Cover</p>
          <input type="hidden" name="cover" value={cover} />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label="Cover">
            <button type="button" role="radio" aria-checked={cover === ""} onClick={() => setCover("")}
              className={cn("relative aspect-[4/1] rounded-md border bg-gradient-to-r from-leaf-soft to-marigold-soft text-xs text-muted-foreground", cover === "" && "ring-2 ring-leaf ring-offset-2")}>
              None
            </button>
            {PERSON_COVERS.map(([key, label]) => (
              <button key={key} type="button" role="radio" aria-checked={cover === key} aria-label={label} onClick={() => setCover(key)}
                className={cn("relative aspect-[4/1] overflow-hidden rounded-md border", cover === key && "ring-2 ring-leaf ring-offset-2")}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={personCoverSrc(`covers/${key}.webp`)!} alt="" loading="lazy" className="size-full object-cover" />
                {cover === key && <Check className="absolute top-1 right-1 size-4 rounded-full bg-leaf p-0.5 text-white" aria-hidden />}
              </button>
            ))}
          </div>
        </div>

      </div>
      <div className="border-t pt-5">
      <fieldset className="space-y-2">
        <legend className="h-section">Causes you care about</legend>
        <p className="text-sm text-muted-foreground">They shape your suggestions. Not shown on your profile.</p>
        <div className="flex flex-wrap gap-2">
          {causes.map((c) => (
            <label key={c.slug} className="inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-sm has-checked:border-leaf has-checked:bg-leaf-soft has-checked:text-leaf has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
              <input type="checkbox" name="causes" value={c.slug} defaultChecked={selected.includes(c.slug)} className="sr-only" />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}><Save aria-hidden />{pending ? "Saving..." : "Save profile"}</Button>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  )
}
