import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { dangerButton, inputField, primaryButton, secondaryButton } from "./ui";
import CodeComponent from "./CodeComponent";

// The "currently editing" view of one code: the tile on the left (on top, on
// narrow screens) and, next to it, a text box for what the code stands for,
// with a (n/200) counter and Save / Cancel buttons.
//
// Cancel asks "Discard what you typed?" first, but only when there is text.
// Save isn't connected to the database yet; it just says so.

export const MAX_TEXT_LENGTH = 200;

interface CodeEditorProps {
  digits: string;
  /** Tile width and height in pixels. */
  tileSize: number;
  /** True: tile on the left, text box on the right. False: stacked, tile on top. */
  sideBySide: boolean;
  /** Called when the user cancels (and, if there was text, confirmed discarding it). */
  onClose: () => void;
}

export default function CodeEditor({ digits, tileSize, sideBySide, onClose }: CodeEditorProps) {
  const [text, setText] = useState("");
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const [showSaveNote, setShowSaveNote] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  // Ready to type as soon as the editor opens, and refuse a typed space or
  // Enter at the very start of the box before it even appears. (A native
  // listener, because this is the one place that can stop the keystroke itself.)
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    box.focus();

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
    setShowSaveNote(false);
  }

  function handleCancel() {
    if (text.length > 0) setConfirmingDiscard(true);
    else onClose();
  }

  return (
    <div className={`flex w-full ${sideBySide ? "flex-row items-start gap-6" : "flex-col items-center gap-5"}`}>
      <div className="flex shrink-0 flex-col items-center gap-2">
        <p className="text-sm font-medium text-muted">Currently editing</p>
        {/* Not clickable, so no "click to set" label on hover. */}
        <CodeComponent digits={digits} isSet={false} size={tileSize} showLabel={false} />
      </div>

      <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
        <label htmlFor="code-text" className="sr-only">
          What code {digits} stands for
        </label>
        <textarea
          id="code-text"
          ref={boxRef}
          value={text}
          onChange={handleChange}
          maxLength={MAX_TEXT_LENGTH}
          rows={5}
          className={`${inputField} resize-none border-slate-600 py-3`}
        />
        <p className="text-right text-sm text-muted" aria-live="off">
          ({text.length}/{MAX_TEXT_LENGTH})
        </p>

        {confirmingDiscard ? (
          <div role="alertdialog" aria-label="Discard what you typed?" className="flex flex-col gap-3">
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
          <div className="flex gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={text.length === 0}
              onClick={() => setShowSaveNote(true)}
            >
              Save
            </button>
            <button type="button" className={secondaryButton} onClick={handleCancel}>
              Cancel
            </button>
          </div>
        )}

        {showSaveNote && !confirmingDiscard && (
          <p role="status" className="text-center text-sm text-muted">
            Saving isn't hooked up yet.
          </p>
        )}
      </div>
    </div>
  );
}
