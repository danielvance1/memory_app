import { useRef, useState } from "react";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import CodeComponent from "../components/CodeComponent";
import { secondaryButton } from "../components/ui";
import { useAreaSize } from "../useAreaSize";

// The tile may use at most this share of the sub-tab's height, so there is
// room below it for the content coming in the next ticket.
const MAX_TILE_SHARE = 0.25;

// The code systems that exist: 1, 2 or 3 digits per code.
const MIN_SYSTEM = 1;
const MAX_SYSTEM = 3;

// "Edit" sub-tab. The top of the screen shows the next code the user
// needs to define. For now that is a fixed placeholder (174) and tapping it
// just flips it between set and unset so both looks can be reviewed.
// Below it: which code system the user is on, and buttons to switch.
export default function EditCodePage() {
  const areaRef = useRef<HTMLElement>(null);
  const { width, height } = useAreaSize(areaRef);
  const [isSet, setIsSet] = useState(false);
  const { user, setCodeSystem } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Square, so one number: no taller than 25% of the area and no wider than the area.
  const tileSize = Math.floor(Math.min(height * MAX_TILE_SHARE, width));

  async function switchTo(system: number) {
    setSaving(true);
    setError(null);
    try {
      await setCodeSystem(system);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const system = user?.codeSystem;

  return (
    <section ref={areaRef} aria-label="Edit codes" className="flex flex-col items-center">
      {/* Hold the space (even before measuring) so the page doesn't jump. */}
      <div className="flex items-end justify-center" style={{ height: tileSize }}>
        {tileSize > 0 && <CodeComponent digits="174" isSet={isSet} size={tileSize} onClick={() => setIsSet((v) => !v)} />}
      </div>
      <p className="mt-3 text-center text-sm text-muted">Fill out the next unset code</p>

      {system !== undefined && (
        <div className="mt-6 flex w-full max-w-sm flex-col items-center gap-3">
          <p className="text-lg font-semibold text-slate-100">{system} digit system</p>

          {/* Each button only exists when there is somewhere to go in that direction. */}
          {system < MAX_SYSTEM && (
            <button type="button" className={secondaryButton} disabled={saving} onClick={() => switchTo(system + 1)}>
              Switch to {system + 1} digit system
            </button>
          )}
          {system > MIN_SYSTEM && (
            <button type="button" className={secondaryButton} disabled={saving} onClick={() => switchTo(system - 1)}>
              Switch to {system - 1} digit system
            </button>
          )}

          {error && (
            <p role="alert" className="text-center text-sm text-rose-300">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
