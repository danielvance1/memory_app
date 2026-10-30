import { describe, expect, it } from "vitest";
import { buildTrie, isUniquelyIdentified, normalizeText, Trie } from "./trie";

describe("normalizeText", () => {
  it("lowercases, squeezes whitespace of every kind into one space, and trims", () => {
    expect(normalizeText("  A Big\n\n Dragon\t\tToday ")).toBe("a big dragon today");
  });
});

describe("Trie", () => {
  const words = ["dragon", "dog", "dogwood", "cat"];
  const trie = buildTrie(words);

  it("counts how many texts start with a prefix", () => {
    expect(trie.countStartingWith("")).toBe(4);
    expect(trie.countStartingWith("d")).toBe(3);
    expect(trie.countStartingWith("dr")).toBe(1);
    expect(trie.countStartingWith("do")).toBe(2);
    expect(trie.countStartingWith("dog")).toBe(2);
    expect(trie.countStartingWith("dogw")).toBe(1);
    expect(trie.countStartingWith("dogwood")).toBe(1);
    expect(trie.countStartingWith("c")).toBe(1);
  });

  it("counts 0 for anything that no text starts with", () => {
    expect(trie.countStartingWith("x")).toBe(0);
    expect(trie.countStartingWith("dragonx")).toBe(0);
    expect(trie.countStartingWith("dogs")).toBe(0);
  });

  it("walks whole characters, so emoji and accents work", () => {
    const t = new Trie();
    t.insert("🐉 dragon");
    t.insert("café");
    t.insert("cafe");
    expect(t.countStartingWith("🐉")).toBe(1);
    expect(t.countStartingWith("caf")).toBe(2);
    expect(t.countStartingWith("café")).toBe(1);
  });
});

describe("isUniquelyIdentified", () => {
  const trie = buildTrie(["dragon", "dog", "dogwood", "cat"]);

  it("is true as soon as the typed start belongs to the target alone", () => {
    expect(isUniquelyIdentified(trie, "d", "dragon")).toBe(false); // dog and dogwood also start with d
    expect(isUniquelyIdentified(trie, "dr", "dragon")).toBe(true);
    expect(isUniquelyIdentified(trie, "dragon", "dragon")).toBe(true);
    expect(isUniquelyIdentified(trie, "c", "cat")).toBe(true);
    expect(isUniquelyIdentified(trie, "dogw", "dogwood")).toBe(true);
  });

  it("is false while another text still starts the same way", () => {
    expect(isUniquelyIdentified(trie, "do", "dog")).toBe(false);
    expect(isUniquelyIdentified(trie, "dog", "dogwood")).toBe(false);
  });

  it("needs the full text when it is the start of a longer one", () => {
    expect(isUniquelyIdentified(trie, "dog", "dog")).toBe(true); // typed all of it, even though dogwood also starts "dog"
    expect(isUniquelyIdentified(trie, "do", "dog")).toBe(false);
  });

  it("is false for nothing typed, and for anything that isn't the start of the target", () => {
    expect(isUniquelyIdentified(trie, "", "cat")).toBe(false);
    expect(isUniquelyIdentified(trie, "x", "cat")).toBe(false);
    expect(isUniquelyIdentified(trie, "dr", "cat")).toBe(false); // unique in the trie, but belongs to a different text
    expect(isUniquelyIdentified(trie, "catx", "cat")).toBe(false);
  });

  it("with only one text, the first letter is enough", () => {
    expect(isUniquelyIdentified(buildTrie(["lonely"]), "l", "lonely")).toBe(true);
  });

  it("with only one text, an empty box still doesn't count", () => {
    expect(isUniquelyIdentified(buildTrie(["lonely"]), "", "lonely")).toBe(false);
  });

  it("two different codes with the same text can only be answered by typing it all", () => {
    const same = buildTrie(["Same  Thing", "same thing"]);
    expect(isUniquelyIdentified(same, "s", "same thing")).toBe(false);
    expect(isUniquelyIdentified(same, "same thin", "same thing")).toBe(false);
    expect(isUniquelyIdentified(same, "same thing", "same thing")).toBe(true);
  });

  it("works with spaces inside texts", () => {
    const t = buildTrie(["big dog", "big cat", "bird"]);
    expect(isUniquelyIdentified(t, "bi", "big dog")).toBe(false);
    expect(isUniquelyIdentified(t, "big ", "big dog")).toBe(false);
    expect(isUniquelyIdentified(t, "big d", "big dog")).toBe(true);
    expect(isUniquelyIdentified(t, "bir", "bird")).toBe(true);
  });
});
