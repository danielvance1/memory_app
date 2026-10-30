import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { FormError, TextField } from "../components/TextField";
import { narrow, primaryButton, textLink } from "../components/ui";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (including right after a successful login): go home.
  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setSubmitting(true);
    setError(null);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={narrow}>
      <h2 className="text-center text-xl font-semibold">Log in</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <TextField
          label="Username or email"
          name="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        {error && <FormError>{error}</FormError>}
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        New here?{" "}
        <Link to="/signup" className={textLink}>
          Create an account
        </Link>
      </p>
    </section>
  );
}
