// What the drill's text box accepts. The box can only ever hold the start of
// the target text, so a wrong letter simply never appears.

/**
 * Given what the box held (`current`), what the browser wants it to hold now
 * (`proposed`), and the text being asked for (`target`, already normalized),
 * returns what the box should hold.
 *
 *  - Case doesn't matter, and any run of whitespace counts as one space.
 *  - If the proposed text is the start of the target, it is accepted. That
 *    covers typing a right letter, Backspace, and pasting a correct start.
 *  - If letters were added after the current text, the correct ones are kept
 *    up to the first wrong one ("drxyz" on "dragon" gives "dr").
 *  - Anything else (a wrong letter, or an edit in the middle that breaks the
 *    start) leaves the box as it was.
 */
export function nextTyped(current: string, proposed: string, target: string): string {
  const wanted = proposed.toLowerCase().replace(/\s+/g, " ");
  if (target.startsWith(wanted)) return wanted;

  if (wanted.startsWith(current)) {
    let result = current;
    for (const ch of wanted.slice(current.length)) {
      if (!target.startsWith(result + ch)) break;
      result += ch;
    }
    return result;
  }
  return current;
}
