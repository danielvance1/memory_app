import { Link } from "react-router";
import { narrow, textLink } from "../components/ui";

export default function NotFoundPage() {
  return (
    <section className={`${narrow} text-center`}>
      <h2 className="text-xl">Page not found</h2>
      <p className="mt-2 text-muted">
        <Link to="/" className={textLink}>
          Go to the home page
        </Link>
      </p>
    </section>
  );
}
