// A small helper for talking to the server's /api endpoints.

export interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
  codeSystem: number; // 1, 2 or 3 digits per code
}

// What went wrong, in a form the screens can show to a person.
export class ApiError extends Error {
  constructor(
    readonly status: number, // HTTP status; 0 means the server could not be reached at all
    message: string, // a sentence safe to show to the user
    readonly field?: string, // which form field the problem is about, when there is one
    readonly code?: string, // a machine-readable reason, e.g. "registration_closed"
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT";
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin", // send the login cookie
      signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T; // "success, nothing to return"

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const problem = (data ?? {}) as { error?: string; field?: string; code?: string };
    throw new ApiError(
      response.status,
      problem.error ?? "Something went wrong. Please try again.",
      problem.field,
      problem.code,
    );
  }
  return data as T;
}
