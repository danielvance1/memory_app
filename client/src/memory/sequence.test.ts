import { describe, expect, it } from "vitest";
import { MAX_CODES, extendSequence, pickCode, scoreRecall, usableCodes } from "./sequence";

// A repeatable "random" so a failure can be reproduced.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const POOL = ["1", "2", "42", "05", "174"];

describe("usableCodes", () => {
  it("keeps only codes that have text", () => {
    expect(usableCodes([{ code: "1", text: "dog" }, { code: "2", text: "" }, { code: "3", text: "   " }], 3)).toEqual(["1"]);
  });

  it("keeps only codes that fit the current code system", () => {
    const saved = [
      { code: "1", text: "a" },
      { code: "42", text: "b" },
      { code: "174", text: "c" },
    ];
    expect(usableCodes(saved, 1)).toEqual(["1"]);
    expect(usableCodes(saved, 2)).toEqual(["1", "42"]);
    expect(usableCodes(saved, 3)).toEqual(["1", "42", "174"]);
  });

  it("treats 5 and 05 as different codes, and never lists a code twice", () => {
    expect(usableCodes([{ code: "5", text: "a" }, { code: "05", text: "b" }], 2).sort()).toEqual(["05", "5"]);
    expect(usableCodes([{ code: "5", text: "a" }, { code: "5", text: "b" }], 2)).toEqual(["5"]);
  });

  it("is empty when nothing is set", () => {
    expect(usableCodes([], 3)).toEqual([]);
    expect(usableCodes([{ code: "1", text: "" }], 3)).toEqual([]);
  });
});

describe("pickCode", () => {
  it("only ever picks codes from the pool", () => {
    for (let seed = 1; seed <= 300; seed++) expect(POOL).toContain(pickCode(POOL, seeded(seed)));
  });

  it("can pick every code in the pool, first and last included", () => {
    expect(pickCode(POOL, () => 0)).toBe("1");
    expect(pickCode(POOL, () => 0.9999999)).toBe("174");
    const seen = new Set<string>();
    const random = seeded(5);
    for (let i = 0; i < 500; i++) seen.add(pickCode(POOL, random));
    expect([...seen].sort()).toEqual([...POOL].sort());
  });

  it("works with a pool of one", () => {
    expect(pickCode(["9"], seeded(1))).toBe("9");
  });
});

describe("extendSequence", () => {
  it("adds codes only as far as asked", () => {
    expect(extendSequence([], 2, POOL)).toHaveLength(2);
    expect(extendSequence(["1"], 5, POOL)).toHaveLength(5);
  });

  it("only adds codes from the pool", () => {
    for (const code of extendSequence([], 200, POOL, seeded(2))) expect(POOL).toContain(code);
  });

  it("never changes the codes already there", () => {
    const before = ["42", "1", "05"];
    const after = extendSequence(before, 10, POOL, seeded(3));
    expect(after.slice(0, 3)).toEqual(before);
    expect(before).toEqual(["42", "1", "05"]); // the original array is not modified
  });

  it("returns the same array when nothing needs adding", () => {
    const codes = ["1", "2", "3"];
    expect(extendSequence(codes, 3, POOL)).toBe(codes);
    expect(extendSequence(codes, 1, POOL)).toBe(codes);
    expect(extendSequence(codes, 0, POOL)).toBe(codes);
  });

  it("with a pool of one, the same code repeats", () => {
    expect(extendSequence([], 4, ["7"])).toEqual(["7", "7", "7", "7"]);
  });

  it("never goes past the maximum of 1000", () => {
    expect(extendSequence([], 5000, POOL, seeded(1))).toHaveLength(MAX_CODES);
    const full = extendSequence([], MAX_CODES, POOL, seeded(1));
    expect(extendSequence(full, MAX_CODES + 1, POOL)).toBe(full);
    expect(full).toHaveLength(1000);
  });

  it("does not make more than it has to: asking for 2 picks exactly 2", () => {
    let calls = 0;
    extendSequence([], 2, POOL, () => {
      calls += 1;
      return 0.5;
    });
    expect(calls).toBe(2);
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
