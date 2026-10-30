import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import CodeComponent from "../components/CodeComponent";
import CodeEditor from "../components/CodeEditor";
import { secondaryButton } from "../components/ui";
import { useAreaSize } from "../useAreaSize";

// The tile may use at most this share of the sub-tab's height, so there is
// room below it for the content coming in the next ticket.
const MAX_TILE_SHARE = 0.25;

// The placeholder "next unset code" shown when nothing is being edited. Fixed for now.
const PLACEHOLDER_CODE = "174";

// From this width up the editing view puts the tile on the left and the text
// box on the right; on narrower screens they stack.
const SIDE_BY_SIDE_MIN_WIDTH = 560;
// In side-by-side mode the tile never takes more than this share of the width.
const MAX_SIDE_BY_SIDE_TILE_SHARE = 0.4;

// The code systems that exist: 1, 2 or 3 digits per code.
const MIN_SYSTEM = 1;
const MAX_SYSTEM = 3;

// "Edit" sub-tab, in two states:
//  - Nothing chosen: the next code to fill out (a fixed placeholder, 174, for
//    now). Tapping it starts editing it.
//  - A code chosen (the address ends in ?code=042, which is where tapping a
//    tile on "All Codes" sends you): that code's tile, with a text box next to it.
// Below either one: which code system the user is on, and buttons to switch.
export default function EditCodePage() {
  const areaRef = useRef<HTMLElement>(null);
  const { width, height } = useAreaSize(areaRef);
  const { user, setCodeSystem } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Square, so one number: no taller than 25% of the area and no wider than the area.
  const idleTileSize = Math.floor(Math.min(height * MAX_TILE_SHARE, width));

  // The code being edited comes from the address. Anything that isn't 1 to 3 digits is ignored.
  const codeParam = searchParams.get("code");
  const editingCode = codeParam !== null && /^[0-9]{1,3}$/.test(codeParam) ? codeParam : null;

  const sideBySide = width >= SIDE_BY_SIDE_MIN_WIDTH;
  const editingTileSize = sideBySide
    ? Math.min(idleTileSize, Math.floor(width * MAX_SIDE_BY_SIDE_TILE_SHARE))
    : idleTileSize;

  // Cancel replaces the ?code= entry instead of adding one, so Back still goes to wherever you came from.
  const closeEditor = () => setSearchParams({}, { replace: true });

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
      {editingCode !== null ? (
        // `key` gives each code its own fresh editor, so typed text never carries over to another code.
        editingTileSize > 0 ? (
          <CodeEditor
            key={editingCode}
            digits={editingCode}
            tileSize={editingTileSize}
            sideBySide={sideBySide}
            onClose={closeEditor}
          />
        ) : null
      ) : (
        <>
          {/* Hold the space (even before measuring) so the page doesn't jump. */}
          <div className="flex items-end justify-center" style={{ height: idleTileSize }}>
            {idleTileSize > 0 && (
              <CodeComponent
                digits={PLACEHOLDER_CODE}
                isSet={false}
                size={idleTileSize}
                onClick={() => setSearchParams({ code: PLACEHOLDER_CODE })}
              />
            )}
          </div>
          <p className="mt-3 text-center text-sm text-muted">Fill out the next unset code</p>
        </>
      )}

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
