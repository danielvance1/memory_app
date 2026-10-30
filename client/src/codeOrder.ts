// The first code, in the order of the All Codes tab, that isn't set yet:
// 0 to 9, then 00 to 99, then 000 to 999, never going past the user's code
// system. Returns null when every code in the system is set.
export function firstUnsetCode(system: number, isSet: (code: string) => boolean): string | null {
  for (let digits = 1; digits <= system; digits++) {
    for (let n = 0; n < 10 ** digits; n++) {
      const code = String(n).padStart(digits, "0");
      if (!isSet(code)) return code;
    }
  }
  return null;
}
