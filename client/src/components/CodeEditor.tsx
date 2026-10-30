import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "../api";
import { dangerButton, inputField, primaryButton, secondaryButton } from "./ui";
import CodeComponent from "./CodeComponent";

// The "currently editing" view of one code: the tile on the left (on top, on
// narrow screens) and, next to it, a text box for what the code stands for,
// with a (n/200) counter and Save / Cancel buttons.
//
// The box starts out holding the code's saved text (empty for a code that
// isn't set). Cancel asks "Discard what you typed?" only when the text now
// differs from what the box started with, so opening a set code and cancelling
// straight away just closes it.

export const MAX_TEXT_LENGTH = 200;

interface CodeEditorProps {
  digits: string;
  /** Whether the code is already set, so the tile is drawn that way. */
  isSet: boolean;
  /** The saved text to start with ("" for a code that isn't set). */
  initialText: string;
  /** Tile width and height in pixels. */
  tileSize: number;
  /** True: tile on the left, text box on the right. False: stacked, tile on top. */
  sideBySide: boolean;
  /** Saves the (trimmed) text. Should throw if saving fails; the message is shown under the buttons. */
  onSave: (text: string) => Promise<void>;
  /** Called when the user cancels (and, if they had changed the text, confirmed discarding it). */
  onClose: () => void;
}

export default function CodeEditor({ digits, isSet, initialText, tileSize, sideBySide, onSave, onClose }: CodeEditorProps) {
  const [text, setText] = useState(initialText);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Ready to type as soon as the editor opens (with the cursor after any saved text), and
  // refuse a typed space or Enter at the very start of the box before it even appears.
  // (A native listener, because this is the one place that can stop the keystroke itself.)
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);

    function blockLeadingWhitespace(event: InputEvent) {
      if (!box || box.selectionStart !== 0) return;
      // Only a keystroke that is nothing but whitespace is refused. Text that merely STARTS with a space
      // (dictation, autocomplete, a paste) is let through and trimmed by handleChange instead of being lost.
      const typedWhitespace = event.inputType === "insertText" && event.data !== null && /^\s+$/.test(event.data);
      if (typedWhitespace || event.inputType === "insertLineBreak") event.preventDefault();
    }
    box.addEventListener("beforeinput", blockLeadingWhitespace);
    return () => box.removeEventListener("beforeinput", blockLeadingWhitespace);
  }, []);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    // Anything else that sneaks in at the start (like pasted text) is trimmed here.
    // Spaces and new lines at the very start never show up and never count.
    setText(event.target.value.replace(/^\s+/, "").slice(0, MAX_TEXT_LENGTH));
    setSaveError(null);
  }

  // What would be saved: trailing spaces are dropped too.
  const trimmed = text.trim();
  // Something to save: the saved text would change (including clearing a set code).
  const canSave = !saving && trimmed !== initialText;
  // Something to lose: what's in the box differs from what it started with.
  const hasChanges = text !== initialText;

  function handleCancel() {
    if (hasChanges) setConfirmingDiscard(true);
    else onClose();
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(trimmed); // on success the page leaves the editor, so there is nothing more to do here
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    // Fills the room the page gives it. The text box below takes whatever height the rest leaves over.
    <div className={`flex min-h-0 w-full flex-1 ${sideBySide ? "flex-row items-start gap-6" : "flex-col items-center gap-3"}`}>
      <div className="flex shrink-0 flex-col items-center gap-1">
        <p className="text-sm font-medium text-muted">Currently editing</p>
        {/* Not clickable, so no "click to set" label on hover. */}
        <CodeComponent digits={digits} isSet={isSet} size={tileSize} showLabel={false} />
      </div>

      <div className={`flex min-h-0 w-full min-w-0 flex-1 flex-col gap-2 ${sideBySide ? "max-h-full" : ""}`}>
        <label htmlFor="code-text" className="sr-only">
          What code {digits} stands for
        </label>
        <textarea
          id="code-text"
          ref={boxRef}
          value={text}
          onChange={handleChange}
          readOnly={saving}
          maxLength={MAX_TEXT_LENGTH}
          rows={2}
          className={`${inputField} min-h-[4.5rem] flex-1 resize-none border-slate-600 py-3 ${sideBySide ? "max-h-64" : ""}`}
        />
        <p className="shrink-0 text-right text-sm leading-none text-muted" aria-live="off">
          ({text.length}/{MAX_TEXT_LENGTH})
        </p>

        {confirmingDiscard ? (
          <div role="alertdialog" aria-label="Discard what you typed?" className="flex shrink-0 flex-col gap-2">
            <p className="text-center text-sm text-slate-200">Discard what you typed?</p>
            <div className="flex gap-3">
              <button type="button" className={dangerButton} onClick={onClose}>
                Discard
              </button>
              <button type="button" className={secondaryButton} autoFocus onClick={() => setConfirmingDiscard(false)}>
                Keep editing
              </button>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 gap-3">
            <button type="button" className={primaryButton} disabled={!canSave} onClick={handleSave}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" className={secondaryButton} disabled={saving} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}

        {saveError && !confirmingDiscard && (
          <p role="alert" className="shrink-0 text-center text-sm text-rose-300">
            {saveError}
          </p>
        )}
      </div>
    </div>
  );
}
