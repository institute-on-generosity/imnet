// Server-side checks for profile details (orgs and people). The database enforces the same limits.
export function parsePrograms(raw: string): { error: string } | { programs: string[] } {
  const programs = raw.split(/[,\n]/).map((p) => p.trim()).filter(Boolean)
  if (programs.length > 8) return { error: "List up to 8 programs." }
  if (programs.some((p) => p.length > 60)) return { error: "Keep each program under 60 characters." }
  return { programs }
}

export function parseFoundedYear(raw: string, thisYear: number): { error: string } | { year: number | null } {
  const v = raw.trim()
  if (!v) return { year: null }
  const year = Number(v)
  if (!Number.isInteger(year) || year < 1800 || year > thisYear) return { error: `Enter the year you were founded, 1800 to ${thisYear}.` }
  return { year }
}
