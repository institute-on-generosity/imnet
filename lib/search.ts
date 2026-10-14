// Escape LIKE wildcards so a search for "100%" or "a_b" matches literally.
export function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}

// For PostgREST or() filter strings: commas, parentheses, quotes and backslashes could end the
// value and smuggle in another condition, so they become spaces. Then escape LIKE wildcards.
export function orFilterTerm(term: string) {
  return escapeLike(term.replace(/[,()"\\]/g, " ").trim())
}

// Postgres regex for "a word starting with term" (\m = start of word), with regex characters escaped.
export function wordStartPattern(term: string) {
  return `\\m${term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
}
