"use client"

import { Copy, Check, Mail, UserMinus, X } from "lucide-react"
import { useActionState, useState } from "react"
import { createInvite, removeMember, revokeInvite } from "@/app/actions"
import { IconTip } from "@/components/icon-tip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PersonAvatar } from "@/components/person-avatar"

type Member = { user_id: string; handle: string; display_name: string | null; avatar_url: string | null }
type Invite = { id: string; email: string; token: string }

export function TeamCard({ orgId, members, invites, me }: { orgId: string; members: Member[]; invites: Invite[]; me: string }) {
  const [state, action, pending] = useActionState(createInvite.bind(null, orgId), null)
  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-lg border">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <PersonAvatar name={m.display_name ?? m.handle} avatarUrl={m.avatar_url} size="sm" />
            <span className="min-w-0 flex-1 truncate">
              {m.display_name ?? `@${m.handle}`} <span className="text-muted-foreground">@{m.handle}{m.user_id === me ? " (you)" : ""}</span>
            </span>
            {members.length > 1 && (
              <form action={removeMember.bind(null, orgId, m.user_id)}>
                <IconTip label={m.user_id === me ? "Leave this organization" : `Remove @${m.handle}`}>
                  <button type="submit" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
                    <UserMinus className="size-4" aria-hidden />
                  </button>
                </IconTip>
              </form>
            )}
          </li>
        ))}
        {invites.map((i) => <InviteRow key={i.id} orgId={orgId} invite={i} />)}
      </ul>
      <form key={state?.ok ? state.message : "invite"} action={action} className="flex gap-2">
        <Input name="email" type="email" required placeholder="colleague@your-org.org" aria-label="Colleague's email" defaultValue={state?.values?.email} />
        <Button type="submit" disabled={pending}><Mail aria-hidden />Invite</Button>
      </form>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.message && <p className="text-sm text-muted-foreground">{state.message}</p>}
    </div>
  )
}

function InviteRow({ orgId, invite }: { orgId: string; invite: Invite }) {
  const [copied, setCopied] = useState(false)
  return (
    <li className="flex items-center gap-3 px-3 py-2 text-sm">
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{invite.email} (invited)</span>
      <IconTip label={copied ? "Link copied" : "Copy invite link"}>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}/invite/${invite.token}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          data-invite-link={`/invite/${invite.token}`}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      </IconTip>
      <form action={revokeInvite.bind(null, invite.id, orgId)}>
        <IconTip label={`Revoke invite for ${invite.email}`}>
          <button type="submit" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive">
            <X className="size-4" aria-hidden />
          </button>
        </IconTip>
      </form>
    </li>
  )
}
