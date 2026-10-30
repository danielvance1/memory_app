import { describe, expect, it } from "vitest";
import { isFullMatch, nextTyped } from "./typing";

describe("nextTyped", () => {
  const target = "dragon";

  it("accepts the next correct letter", () => {
    expect(nextTyped("", "d", target)).toBe("d");
    expect(nextTyped("dra", "drag", target)).toBe("drag");
  });

  it("never shows a wrong letter: typing 'aaba' for 'dragon' leaves the box empty", () => {
    let box = "";
    for (const letter of "aaba") box = nextTyped(box, box + letter, target);
    expect(box).toBe("");
  });

  it("drops a wrong letter after correct ones", () => {
    expect(nextTyped("dr", "drx", target)).toBe("dr");
    expect(nextTyped("dr", "drag0", target)).toBe("drag");
  });

  it("ignores letter case", () => {
    expect(nextTyped("", "D", target)).toBe("d");
    expect(nextTyped("d", "dR", target)).toBe("dr");
  });

  it("allows Backspace", () => {
    expect(nextTyped("drag", "dra", target)).toBe("dra");
    expect(nextTyped("d", "", target)).toBe("");
  });

  it("keeps only the correct start of pasted text", () => {
    expect(nextTyped("", "dragon", target)).toBe("dragon");
    expect(nextTyped("", "drxyz", target)).toBe("dr");
    expect(nextTyped("", "xdragon", target)).toBe("");
  });

  it("can't type past the end of the target", () => {
    expect(nextTyped("dragon", "dragons", target)).toBe("dragon");
  });

  it("refuses an edit in the middle that breaks the start", () => {
    expect(nextTyped("dragon", "dagon", target)).toBe("dragon");
    expect(nextTyped("dragon", "dxagon", target)).toBe("dragon");
  });

  it("treats any whitespace as one space", () => {
    const t = "big dog";
    expect(nextTyped("big", "big ", t)).toBe("big ");
    expect(nextTyped("big ", "big  ", t)).toBe("big ");
    expect(nextTyped("big", "big\n", t)).toBe("big ");
    expect(nextTyped("big", "big\t\tdog", t)).toBe("big dog");
  });

  it("doesn't accept whitespace at the very start", () => {
    expect(nextTyped("", " ", target)).toBe("");
    expect(nextTyped("", " dragon", target)).toBe("");
  });

  it("works with accented letters and emoji", () => {
    expect(nextTyped("", "🐉", "🐉 dragon")).toBe("🐉");
    expect(nextTyped("caf", "café", "café")).toBe("café");
    expect(nextTyped("caf", "cafe", "café")).toBe("caf");
  });
});

describe("nextTyped with codes (digits only)", () => {
  it("accepts only the next correct digit, one at a time", () => {
    let box = "";
    for (const digit of "174") {
      box = nextTyped(box, box + digit, "174");
    }
    expect(box).toBe("174");
  });

  it("drops a wrong digit and keeps the correct start", () => {
    expect(nextTyped("1", "19", "174")).toBe("1");
    expect(nextTyped("", "9", "174")).toBe("");
    expect(nextTyped("17", "170", "174")).toBe("17");
  });

  it("leading zeros are part of the code and must be typed first", () => {
    expect(nextTyped("", "5", "05")).toBe("");
    expect(nextTyped("", "0", "05")).toBe("0");
    expect(nextTyped("0", "05", "05")).toBe("05");
    expect(nextTyped("0", "09", "05")).toBe("0");
  });

  it("refuses letters and symbols, and can't go past the end of the code", () => {
    expect(nextTyped("", "a", "42")).toBe("");
    expect(nextTyped("4", "4x", "42")).toBe("4");
    expect(nextTyped("4", "4-", "42")).toBe("4");
    expect(nextTyped("42", "423", "42")).toBe("42");
  });

  it("keeps only the correct start of a pasted code", () => {
    expect(nextTyped("", "174", "174")).toBe("174");
    expect(nextTyped("", "179", "174")).toBe("17");
  });

  it("allows Backspace", () => {
    expect(nextTyped("17", "1", "174")).toBe("1");
  });
});

describe("isFullMatch", () => {
  it("needs the whole code, not just a start of it", () => {
    expect(isFullMatch("1", "174")).toBe(false);
    expect(isFullMatch("17", "174")).toBe(false);
    expect(isFullMatch("174", "174")).toBe(true);
  });

  it("is not fooled by a code that is the start of a longer one", () => {
    expect(isFullMatch("1", "1")).toBe(true); // code 1 is done after one digit...
    expect(isFullMatch("1", "12")).toBe(false); // ...but 12 still needs its second digit
  });

  it("an empty box never counts, not even against an empty target", () => {
    expect(isFullMatch("", "174")).toBe(false);
    expect(isFullMatch("", "")).toBe(false);
  });

  it("keeps leading zeros significant", () => {
    expect(isFullMatch("5", "05")).toBe(false);
    expect(isFullMatch("05", "05")).toBe(true);
  });
});
