import { useEffect, useState, type RefObject } from "react";

// Becomes true once an element is on screen or within `margin` pixels of it
// (above or below), and then stays true. Used to build big groups of tiles
// only when the user scrolls close to them, so opening a page with
// over a thousand tiles doesn't create them all at once.
export function useNearViewport(ref: RefObject<HTMLElement | null>, margin = 800): boolean {
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el) return;

    // Very old browsers without IntersectionObserver just get everything right away.
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin: `${margin}px 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, near, margin]);

  return near;
}
