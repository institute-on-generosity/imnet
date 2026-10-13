// The text fields a user submitted, minus Next.js's internal "$ACTION_*" fields.
// Sent back with errors so forms can refill: React 19 resets forms after every action.
export function formValues(form: FormData): Record<string, string> {
  const values: Record<string, string> = {}
  for (const [key, value] of form) if (typeof value === "string" && !key.startsWith("$")) values[key] = value
  return values
}
