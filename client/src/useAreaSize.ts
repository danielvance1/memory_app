import { useLayoutEffect, useState, type RefObject } from "react";

// Measures how much room an element has: its width, and how tall the screen
// is from the element's top edge down to the bottom of the screen (minus the
// page's bottom padding). It ignores how much content the page holds, so
// adding more content below later won't change the answer.
export function useAreaSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY; // distance from the very top of the page
      const main = el.closest("main");
      const bottomPadding = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
      const width = Math.round(el.clientWidth);
      const height = Math.max(0, Math.round(window.innerHeight - top - bottomPadding));
      // Only update when something changed, so we never re-render in a loop.
      setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
    }

    measure();
    window.addEventListener("resize", measure);
    // The header can change height (for example when the account bar fills in), which moves the area.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, [ref]);

  return size;
}
