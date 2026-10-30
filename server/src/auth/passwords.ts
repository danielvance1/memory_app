import { hash, verify } from "@node-rs/argon2";

// Passwords are never stored. We store an argon2id hash: a one-way scramble
// that is deliberately slow and memory-hungry to compute, which makes guessing
// passwords from a stolen database very expensive. The library's defaults
// (19 MiB of memory, 2 passes) match the OWASP minimum recommendation.
// The hash text also contains its own random salt, so no separate column is needed.

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password);
  } catch {
    return false; // a malformed stored hash must never let someone in
  }
}

// When a login names an account that doesn't exist we still do one full
// verification against a throwaway hash. Otherwise "unknown user" would answer
// noticeably faster than "wrong password", which would let an attacker discover
// which usernames and emails are registered by timing the responses.
let throwawayHash: Promise<string> | undefined;

export async function burnVerificationTime(password: string): Promise<void> {
  throwawayHash ??= hash("not-a-real-password");
  await verifyPassword(await throwawayHash, password);
}
