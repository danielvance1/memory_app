// The rules behind the "Test Memory" game: making up the codes to memorize as
// the player moves along (never more than needed), and scoring what they
// type back.

/** The longest sequence there can be. */
export const MAX_CODES = 1000;
/** How long the memorizing part lasts, in seconds (5 minutes). */
export const MEMORIZE_SECONDS = 300;
/** The most digits one typed-back code can have. */
export const MAX_RECALL_DIGITS = 3;

/** One random code of `digits` digits, as text so leading zeros survive ("007"). `random` returns 0 up to (not including) 1. */
export function randomCode(digits: number, random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < digits; i++) code += Math.floor(random() * 10);
  return code;
}

/**
 * Makes sure `codes` has at least `length` entries (but never more than
 * MAX_CODES), adding random ones at the end. Returns the same array when
 * nothing needs adding, so callers can tell nothing changed. The codes
 * already there are never touched.
 */
export function extendSequence(
  codes: string[],
  length: number,
  digits: number,
  random: () => number = Math.random,
): string[] {
  const wanted = Math.min(length, MAX_CODES);
  if (codes.length >= wanted) return codes;
  const next = codes.slice();
  while (next.length < wanted) next.push(randomCode(digits, random));
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
