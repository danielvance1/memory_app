import type { ReactNode } from "react";
import { useCodes } from "../codes";
import { secondaryButton } from "./ui";

// Shows its children only once the user's codes have loaded, so nothing is
// drawn as "not set" for a moment and then flips to "set". If loading fails it
// says so and offers to try again.
//
// `loadingHeight` holds the space while loading so the page doesn't jump.
export default function CodesGate({ children, loadingHeight = 0 }: { children: ReactNode; loadingHeight?: number }) {
  const { status, reload } = useCodes();

  if (status === "ready") return <>{children}</>;

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-3 py-4">
        <p role="alert" className="text-center text-sm text-danger">
          Couldn't load your codes. Check your connection and try again.
        </p>
        <button type="button" className={secondaryButton} onClick={reload}>
          Try again
        </button>
      </div>
    );
  }

  return <div aria-hidden="true" style={{ height: loadingHeight }} />;
}
