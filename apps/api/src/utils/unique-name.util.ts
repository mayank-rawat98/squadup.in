/**
 * Keep an asset name unique within its owner's collection by auto-suffixing.
 *
 * Returns `desired` unchanged when it doesn't collide (case-insensitively) with
 * any name in `existing`; otherwise appends " (2)", " (3)", … until it is
 * unique. An existing " (n)" suffix on the desired name is stripped first so
 * re-suffixing doesn't stack ("Logo (2)" → "Logo (3)", not "Logo (2) (2)").
 *
 * @param desired  The name the user asked for.
 * @param existing Names already taken in the owner's scope (the current entity's
 *                 own name should be excluded by the caller on a rename).
 */
export function uniqueName(
  desired: string,
  existing: Iterable<string>,
): string {
  const taken = new Set<string>();
  for (const name of existing) taken.add(name.trim().toLowerCase());

  const base = desired.trim();
  if (!taken.has(base.toLowerCase())) return base;

  const match = base.match(/^(.*?)\s\((\d+)\)$/);
  const root = match ? match[1] : base;
  let n = match ? Number(match[2]) + 1 : 2;
  while (taken.has(`${root} (${n})`.toLowerCase())) n++;
  return `${root} (${n})`;
}
