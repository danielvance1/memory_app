import { useCallback, useLayoutEffect, useState } from "react";

// Like useAreaSize, for an element that is not always on the page (for example
// one that only appears in one step of a game). Put the returned function on the
// element as its `ref`; the size is {0, 0} while the element isn't there, and is
// measured the moment it appears and again whenever its size changes.
export function useElementSize<T extends HTMLElement>(): [(element: T | null) => void, { width: number; height: number }] {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const ref = useCallback((el: T | null) => setElement(el), []);

  useLayoutEffect(() => {
    if (!element) {
      setSize((old) => (old.width === 0 && old.height === 0 ? old : { width: 0, height: 0 }));
      return;
    }
    function measure() {
      if (!element) return;
      const width = Math.round(element.clientWidth);
      const height = Math.round(element.clientHeight);
      setSize((old) => (old.width === width && old.height === height ? old : { width, height }));
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [ref, size];
}
