/** Short readable ids from a name, unique within `taken`: "Workshop rent" -> "workshop-rent", "workshop-rent-2". */
export function slugId(name: string, taken: ReadonlySet<string>, fallback = 'item'): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || fallback;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
