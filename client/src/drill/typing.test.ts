import { describe, expect, it } from "vitest";
import { nextTyped } from "./typing";

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
