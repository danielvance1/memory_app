// The rules behind the drill that decide when you have typed "enough".
//
// A trie (say "try") is a tree of letters. Every saved text is added to it one
// letter at a time, so texts that begin the same way share their first
// branches: "dragon", "dog" and "dogwood" all start at the same "d". Each
// letter in the tree remembers how many texts pass through it. That makes
// "is what I've typed enough to tell this text apart from all the others?"
// a single walk down the tree: if only one text passes through the last
// letter typed, nobody else starts that way, so the typed start is enough.

/** Lowercases a text and squeezes every run of whitespace (spaces, tabs, new lines) into one space. */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

interface TrieNode {
  children: Map<string, TrieNode>;
  /** How many inserted texts pass through this letter. */
  through: number;
}

function newNode(): TrieNode {
  return { children: new Map(), through: 0 };
}

export class Trie {
  private root = newNode();

  /** Adds one (already normalized) text. */
  insert(text: string): void {
    let node = this.root;
    node.through += 1;
    // `for...of` walks a string one whole character at a time (an emoji is one, not two).
    for (const ch of text) {
      let next = node.children.get(ch);
      if (!next) {
        next = newNode();
        node.children.set(ch, next);
      }
      next.through += 1;
      node = next;
    }
  }

  /** How many inserted texts start with `prefix` (0 when none do). */
  countStartingWith(prefix: string): number {
    let node = this.root;
    for (const ch of prefix) {
      const next = node.children.get(ch);
      if (!next) return 0;
      node = next;
    }
    return node.through;
  }
}

/** Builds a trie from texts, normalizing each one. */
export function buildTrie(texts: string[]): Trie {
  const trie = new Trie();
  for (const text of texts) trie.insert(normalizeText(text));
  return trie;
}

/**
 * True when what has been typed is enough to know which text is meant:
 *  - the full text was typed (this also covers a text that is the start of a
 *    longer one, like "dog" next to "dogwood", where no shorter start can ever be unique), or
 *  - the typed start belongs to the target and to no other text.
 * `target` must already be normalized.
 */
export function isUniquelyIdentified(trie: Trie, typed: string, target: string): boolean {
  if (typed === "" || !target.startsWith(typed)) return false;
  return typed === target || trie.countStartingWith(typed) === 1;
}
