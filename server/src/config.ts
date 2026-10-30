// All settings in one place. Each can be overridden with an environment
// variable; the defaults are the production values.

export interface AppConfig {
  /** Hard cap on the total number of accounts. */
  maxUsers: number;
  /** How long a login lasts. */
  sessionDays: number;
  /** Signup attempts allowed per IP address per hour. */
  signupsPerHourPerIp: number;
  /** Failed login attempts allowed per IP address per 15 minutes. */
  failedLoginsPerIp: number;
  /** Failed login attempts allowed per account name per 15 minutes. */
  failedLoginsPerAccount: number;
}

// Reads a whole-number setting from the environment, falling back to a default.
// A typo (like MAX_USERS=five) stops the app at startup instead of silently
// using a wrong value.
function intFromEnv(name: string, fallback: number, min: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(`Environment variable ${name} must be a whole number of at least ${min}, got "${raw}"`);
  }
  return value;
}

export function loadConfig(): AppConfig {
  return {
    maxUsers: intFromEnv("MAX_USERS", 500, 0), // 0 is allowed: it closes signups completely
    sessionDays: intFromEnv("SESSION_DAYS", 30, 1),
    signupsPerHourPerIp: intFromEnv("SIGNUPS_PER_HOUR_PER_IP", 5, 1),
    failedLoginsPerIp: intFromEnv("FAILED_LOGINS_PER_IP", 10, 1),
    failedLoginsPerAccount: intFromEnv("FAILED_LOGINS_PER_ACCOUNT", 20, 1),
  };
}
