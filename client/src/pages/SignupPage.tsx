import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { FormError, TextField } from "../components/TextField";
import { narrow, primaryButton, textLink } from "../components/ui";

type Field = "username" | "email" | "password";

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in (including right after a successful signup): go home.
  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // stop the browser from reloading the page
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    try {
      await signup(username, email, password);
    } catch (err) {
      if (err instanceof ApiError && (err.field === "username" || err.field === "email" || err.field === "password")) {
        setFieldErrors({ [err.field]: err.message }); // show it right under the field it's about
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={narrow}>
      <h2 className="text-center text-xl font-semibold">Create account</h2>
      <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
        <TextField
          label="Username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fieldErrors.username}
          hint="3–20 letters, numbers, or underscores."
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={20}
          required
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          autoComplete="email"
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
          error={fieldErrors.password}
          hint="At least 8 characters."
          autoComplete="new-password"
          required
        />
        {formError && <FormError>{formError}</FormError>}
        <button type="submit" disabled={submitting} className={primaryButton}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className={textLink}>
          Log in
        </Link>
      </p>
    </section>
  );
}
