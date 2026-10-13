// Escape LIKE wildcards so a search for "100%" or "a_b" matches literally.
export function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (c) => `\\${c}`)
}
