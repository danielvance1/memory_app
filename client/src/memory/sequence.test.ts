import { describe, expect, it } from "vitest";
import { MAX_CODES, extendSequence, randomCode, scoreRecall } from "./sequence";

// A repeatable "random" so a failure can be reproduced.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("randomCode", () => {
  it("has exactly the asked number of digits, and only digits", () => {
    for (const digits of [1, 2, 3]) {
      for (let seed = 1; seed <= 200; seed++) {
        expect(randomCode(digits, seeded(seed))).toMatch(new RegExp(`^[0-9]{${digits}}$`));
      }
    }
  });

  it("keeps leading zeros", () => {
    expect(randomCode(3, () => 0)).toBe("000");
    expect(randomCode(2, () => 0.05)).toBe("00");
  });

  it("can make every digit, including 9, and never a 10", () => {
    expect(randomCode(1, () => 0.9999999)).toBe("9");
    const seen = new Set<string>();
    const random = seeded(5);
    for (let i = 0; i < 500; i++) seen.add(randomCode(1, random));
    expect([...seen].sort().join("")).toBe("0123456789");
  });

  it("makes different codes on different draws", () => {
    const random = seeded(9);
    const codes = new Set(Array.from({ length: 50 }, () => randomCode(3, random)));
    expect(codes.size).toBeGreaterThan(30);
  });
});

describe("extendSequence", () => {
  it("adds codes only as far as asked", () => {
    expect(extendSequence([], 2, 2)).toHaveLength(2);
    expect(extendSequence(["11"], 5, 2)).toHaveLength(5);
  });

  it("never changes the codes already there", () => {
    const before = ["12", "34", "56"];
    const after = extendSequence(before, 10, 2, seeded(3));
    expect(after.slice(0, 3)).toEqual(before);
    expect(before).toEqual(["12", "34", "56"]); // the original array is not modified
  });

  it("returns the same array when nothing needs adding", () => {
    const codes = ["1", "2", "3"];
    expect(extendSequence(codes, 3, 1)).toBe(codes);
    expect(extendSequence(codes, 1, 1)).toBe(codes);
    expect(extendSequence(codes, 0, 1)).toBe(codes);
  });

  it("makes codes with the requested number of digits", () => {
    for (const code of extendSequence([], 50, 3, seeded(2))) expect(code).toMatch(/^[0-9]{3}$/);
  });

  it("never goes past the maximum of 1000", () => {
    expect(extendSequence([], 5000, 2, seeded(1))).toHaveLength(MAX_CODES);
    const full = extendSequence([], MAX_CODES, 1, seeded(1));
    expect(extendSequence(full, MAX_CODES + 1, 1)).toBe(full);
    expect(full).toHaveLength(1000);
  });

  it("does not make more than it has to: asking for 2 gives exactly 2", () => {
    let calls = 0;
    extendSequence([], 2, 3, () => {
      calls += 1;
      return 0.5;
    });
    expect(calls).toBe(6); // 2 codes x 3 digits, nothing extra
  });
});

describe("scoreRecall", () => {
  const shown = ["12", "34", "56", "78"];

  it("counts the codes that match in the same position", () => {
    expect(scoreRecall(shown, ["12", "34", "56", "78"])).toBe(4);
    expect(scoreRecall(shown, ["12", "99", "56", "00"])).toBe(2);
    expect(scoreRecall(shown, ["99", "99", "99", "99"])).toBe(0);
  });

  it("a right code in the wrong position doesn't count", () => {
    expect(scoreRecall(shown, ["34", "12", "78", "56"])).toBe(0);
    expect(scoreRecall(shown, ["99", "12", "34", "56"])).toBe(0);
  });

  it("codes left unplaced simply don't count", () => {
    expect(scoreRecall(shown, ["12", "34"])).toBe(2);
    expect(scoreRecall(shown, [])).toBe(0);
  });

  it("codes placed beyond what was shown can't be right", () => {
    expect(scoreRecall(["12", "34"], ["12", "34", "56", "78"])).toBe(2);
    expect(scoreRecall([], ["12"])).toBe(0);
  });

  it("compares the whole text, so leading zeros and lengths matter", () => {
    expect(scoreRecall(["007", "05"], ["7", "5"])).toBe(0);
    expect(scoreRecall(["007", "05"], ["007", "05"])).toBe(2);
    expect(scoreRecall(["1"], ["12"])).toBe(0);
  });
});
