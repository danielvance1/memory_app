import { useEffect, useState } from "react";

// Text that types itself out one character at a time.
//
//   <TypedText text="click to set" />
//   <TypedText text="Welcome back" msPerChar={40} className="text-lg" />
//
// Whenever `text` changes, it starts over and types the new text from the beginning.
//
// The characters that haven't been typed yet are still on the page, just
// invisible. That way the text takes up its full width from the first moment,
// so centered text doesn't slide left and right as it grows.

interface TypedTextProps {
  text: string;
  /** Milliseconds per character. 25 is quick; 60 is relaxed. */
  msPerChar?: number;
  className?: string;
}

export default function TypedText({ text, msPerChar = 25, className }: TypedTextProps) {
  // `key={text}` makes React throw away the old typer and start a fresh one
  // whenever the text changes, which is the "start over" behavior.
  return <Typer key={text} text={text} msPerChar={msPerChar} className={className} />;
}

function Typer({ text, msPerChar, className }: Required<Omit<TypedTextProps, "className">> & { className?: string }) {
  // People who ask their device to reduce motion get the full text right away.
  const [shown, setShown] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text.length : 0,
  );

  // After each character appears, wait a moment, then show one more.
  useEffect(() => {
    if (shown >= text.length) return;
    const timer = setTimeout(() => setShown(shown + 1), msPerChar);
    return () => clearTimeout(timer);
  }, [shown, text.length, msPerChar]);

  return (
    <span className={className}>
      {/* Screen readers get the whole text at once instead of a letter at a time. */}
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, shown)}
        <span className="invisible">{text.slice(shown)}</span>
      </span>
    </span>
  );
}
