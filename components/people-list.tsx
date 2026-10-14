import { PersonAvatar } from "./person-avatar"

type Person = { handle: string; display_name: string | null; avatar_url: string | null }

// Staff-only lists of who RSVPed or raised a hand: avatar and name per person.
export function PeopleList({ people }: { people: Person[] }) {
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {people.map((p) => (
        <li key={p.handle} className="flex items-center gap-1.5 rounded-full border bg-background py-0.5 pr-2.5 pl-0.5 text-xs">
          <PersonAvatar name={p.display_name ?? p.handle} avatarUrl={p.avatar_url} size="xs" />
          {p.display_name ?? `@${p.handle}`}
        </li>
      ))}
    </ul>
  )
}
