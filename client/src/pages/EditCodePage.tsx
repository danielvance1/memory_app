import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { firstUnsetCode } from "../codeOrder";
import { useCodes } from "../codes";
import CodeComponent from "../components/CodeComponent";
import CodeEditor from "../components/CodeEditor";
import CodesGate from "../components/CodesGate";
import { secondaryButton } from "../components/ui";
import { useToast } from "../toast";
import { editingTileSize, idleEditTileSize } from "../tileSizing";
import { useAreaSize } from "../useAreaSize";

// From this width up the editing view puts the tile on the left and the text
// box on the right; on narrower screens they stack.
const SIDE_BY_SIDE_MIN_WIDTH = 560;
// The code systems that exist: 1, 2 or 3 digits per code.
const MIN_SYSTEM = 1;
const MAX_SYSTEM = 3;

// "Edit" sub-tab, in two states:
//  - Nothing chosen: the first code in the user's system that isn't set yet.
//    Tapping it starts editing it.
//  - A code chosen (the address ends in ?code=42, which is where tapping a
//    tile on "All Codes" sends you): that code's tile, with a text box next to
//    it, filled in with the saved text if the code is already set.
// While nothing is being edited, below it: which code system the user is on, and
// buttons to switch. (Hidden during editing to leave the room the editor needs.)
//
// Everything is sized to fit the screen without scrolling. On a screen too short
// for that (a small phone, or with the keyboard open) the tab scrolls inside itself.
export default function EditCodePage() {
  const areaRef = useRef<HTMLElement>(null);
  const { width, height } = useAreaSize(areaRef);
  const { user, setCodeSystem } = useAuth();
  const { isSet, getText, saveText } = useCodes();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idleTileSize = idleEditTileSize(width, height);

  const system = user?.codeSystem;

  // The code being edited comes from the address. Anything that isn't 1 to 3 digits, or that
  // is longer than the user's code system allows, is ignored.
  const codeParam = searchParams.get("code");
  const editingCode =
    codeParam !== null && /^[0-9]{1,3}$/.test(codeParam) && codeParam.length <= (system ?? 3) ? codeParam : null;

  // What to offer when nothing is being edited: the first code that isn't set yet.
  const nextUnset = system === undefined ? null : firstUnsetCode(system, isSet);

  const sideBySide = width >= SIDE_BY_SIDE_MIN_WIDTH;
  const editorTileSize = editingTileSize(width, height, sideBySide);

  // Cancel replaces the ?code= entry instead of adding one, so Back still goes to wherever you came from.
  const closeEditor = () => setSearchParams({}, { replace: true });

  // Saves, goes back to the plain Edit screen, and says so. If saving fails this throws and
  // the editor stays open and shows the message.
  async function saveEditedCode(code: string, text: string) {
    const saved = await saveText(code, text);
    closeEditor();
    toast.show(saved === "" ? `Code ${code} description was cleared` : `Code ${code} description was saved`);
  }

  async function switchTo(newSystem: number) {
    setSaving(true);
    setError(null);
    try {
      await setCodeSystem(newSystem);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section ref={areaRef} aria-label="Edit codes" className="-mx-1 flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-1">
      <CodesGate loadingHeight={idleTileSize + 36}>
        {editingCode !== null ? (
          // `key` gives each code its own fresh editor, so typed text never carries over to another code.
          editorTileSize > 0 ? (
            <CodeEditor
              key={editingCode}
              digits={editingCode}
              isSet={isSet(editingCode)}
              initialText={getText(editingCode)}
              tileSize={editorTileSize}
              sideBySide={sideBySide}
              onSave={(text) => saveEditedCode(editingCode, text)}
              onClose={closeEditor}
            />
          ) : null
        ) : nextUnset !== null ? (
          <>
            {/* Hold the space (even before measuring) so the page doesn't jump. */}
            <div className="flex items-end justify-center" style={{ height: idleTileSize }}>
              {idleTileSize > 0 && (
                <CodeComponent
                  digits={nextUnset}
                  isSet={false}
                  size={idleTileSize}
                  onClick={() => setSearchParams({ code: nextUnset })}
                />
              )}
            </div>
            <p className="mt-2 text-center text-sm text-muted">Fill out the next unset code</p>
          </>
        ) : (
          <p className="py-6 text-center text-base text-slate-200">All codes in your {system} digit system are set.</p>
        )}
      </CodesGate>

      {system !== undefined && editingCode === null && (
        <div className="mt-4 flex w-full max-w-sm shrink-0 flex-col items-center gap-2">
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
