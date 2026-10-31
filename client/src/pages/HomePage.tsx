import { Link } from "react-router";
import { useAuth } from "../auth";
import { narrow, primaryButton, secondaryButton } from "../components/ui";

export default function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (user) {
    return (
      <section className={`${narrow} text-center`}>
        <h2 className="text-xl">Welcome back, {user.username}</h2>
        <p className="mt-2 text-muted">Your codes and drills are coming soon.</p>
      </section>
    );
  }

  return (
    <section className={`${narrow} text-center`}>
      <h2 className="text-xl">Train your memory</h2>
      <p className="mt-2 text-muted">Create an account to get started.</p>
      <div className="mt-6 flex flex-col gap-3">
        <Link to="/signup" className={primaryButton}>
          Create account
        </Link>
        <Link to="/login" className={secondaryButton}>
          Log in
        </Link>
      </div>
    </section>
  );
}
