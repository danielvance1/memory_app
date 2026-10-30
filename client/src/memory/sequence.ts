// The rules behind the "Test Memory" game: making up the sequence to memorize
// (from the codes the user has set) as the player moves along, never more than
// needed, and scoring what they type back.

/** The longest sequence there can be. */
export const MAX_CODES = 1000;
/** How long the memorizing part lasts, in seconds (5 minutes). */
export const MEMORIZE_SECONDS = 300;
/** The most digits one typed-back code can have. */
export const MAX_RECALL_DIGITS = 3;

/** What the game needs to know about each of the user's saved codes. */
export interface SavedCode {
  code: string;
  text: string;
}

/**
 * The codes the game may use: the ones the user has actually set (they have
 * text that isn't blank) and that belong to their current code system (no
 * longer than it, like the drills). No code appears twice.
 */
export function usableCodes(saved: SavedCode[], system: number): string[] {
  const codes = new Set<string>();
  for (const { code, text } of saved) {
    if (code.length <= system && text.trim() !== "") codes.add(code);
  }
  return [...codes];
}

/** One code picked at random from `pool` (which must not be empty). `random` returns 0 up to (not including) 1. */
export function pickCode(pool: string[], random: () => number = Math.random): string {
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Makes sure `codes` has at least `length` entries (but never more than
 * MAX_CODES), adding random ones from `pool` at the end (the same code can
 * come up again). Returns the same array when nothing needs adding, so callers
 * can tell nothing changed. The codes already there are never touched.
 */
export function extendSequence(
  codes: string[],
  length: number,
  pool: string[],
  random: () => number = Math.random,
): string[] {
  const wanted = Math.min(length, MAX_CODES);
  if (codes.length >= wanted) return codes;
  const next = codes.slice();
  while (next.length < wanted) next.push(pickCode(pool, random));
  return next;
}

/**
 * How many typed-back codes are right: the one placed in position 1 has to
 * equal the first code shown, position 2 the second, and so on. Codes placed
 * beyond what was shown can't be right, and shown codes that weren't placed
 * don't count.
 */
export function scoreRecall(shown: string[], placed: string[]): number {
  let correct = 0;
  const n = Math.min(shown.length, placed.length);
  for (let i = 0; i < n; i++) if (shown[i] === placed[i]) correct += 1;
  return correct;
}
