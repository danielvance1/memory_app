import { useLayoutEffect, useState, type RefObject } from "react";

// Measures how much room an element has: its width and height in pixels.
// The element should be one the layout gives a definite size (for example
// `flex-1` inside the fixed page frame), not one that grows with its content.
// It re-measures whenever that room changes (rotating the phone, a keyboard
// opening, the window being resized).
export function useAreaSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const width = Math.round(el.clientWidth);
      const height = Math.round(el.clientHeight);
      // Only update when something changed, so we never re-render in a loop.
      setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}
