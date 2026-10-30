// Checks the data sent to the signup and login endpoints. Nothing is trusted
// just because the website's own form sends it: anyone can call the API directly.

export interface FieldError {
  field: "username" | "email" | "password";
  error: string;
}

export interface SignupInput {
  username: string;
  email: string;
  password: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: FieldError | { error: string } };

// Same rule as the CHECK constraint in the database. Letters, digits, and
// underscores only, so a username can never contain "@" and is always
// distinguishable from an email address.
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

// Deliberately loose: one "@", something on both sides, a dot in the domain,
// no spaces. Real validation of an email is "can it receive mail", which is
// what email verification will do later.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128; // an upper limit keeps huge inputs from burning CPU in the hash

function asRecord(body: unknown): Record<string, unknown> {
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateSignup(body: unknown): Result<SignupInput> {
  const { username, email, password } = asRecord(body);

  if (typeof username !== "string" || !USERNAME_PATTERN.test(username.trim())) {
    return {
      ok: false,
      error: { field: "username", error: "Username must be 3–20 characters: letters, numbers, or underscores." },
    };
  }
  if (typeof email !== "string" || email.trim().length > 254 || !EMAIL_PATTERN.test(email.trim())) {
    return { ok: false, error: { field: "email", error: "Enter a valid email address." } };
  }
  if (typeof password !== "string" || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return {
      ok: false,
      error: { field: "password", error: `Password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.` },
    };
  }

  return { ok: true, value: { username: username.trim(), email: normalizeEmail(email), password } };
}

export function validateLogin(body: unknown): Result<{ identifier: string; password: string }> {
  const { identifier, password } = asRecord(body);

  if (
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    identifier.trim().length === 0 ||
    identifier.trim().length > 254 ||
    password.length === 0 ||
    password.length > PASSWORD_MAX
  ) {
    return { ok: false, error: { error: "Enter your username or email and your password." } };
  }

  return { ok: true, value: { identifier: identifier.trim(), password } };
}
