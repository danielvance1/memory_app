// The logo's "M" drawn as a letter: a route through five stops (square dots) that zigzags into
// an M, like a path through a memory palace. It stands in for the first "M" of the title in
// Layout.tsx, so it is sized in `em` and scales with the text next to it.
//
// It is decoration (the title carries the real name for screen readers), so it is hidden from them.

export default function LogoM({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="5 5 22 22"
      aria-hidden="true"
      focusable="false"
      // 0.8em tall, a touch wider than a letter's usual width, so it sits like a heavy capital M.
      className={`inline-block h-[0.8em] w-[0.9em] shrink-0 ${className}`}
    >
      {/* The path and the five stops are all brand orange (text-brand sets currentColor). Each stop has a
          small dark hole in the middle, like a rivet, so the stops read as separate from the path. */}
      <g className="text-brand">
        <path
          d="M9 23V9l7 8 7-8v14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.6"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        <g fill="currentColor">
          <rect x="5.8" y="19.8" width="6.4" height="6.4" />
          <rect x="5.8" y="5.8" width="6.4" height="6.4" />
          <rect x="12.8" y="13.8" width="6.4" height="6.4" />
          <rect x="19.8" y="5.8" width="6.4" height="6.4" />
          <rect x="19.8" y="19.8" width="6.4" height="6.4" />
        </g>
      </g>
      <g fill="#151719">
        <rect x="7.8" y="21.8" width="2.4" height="2.4" />
        <rect x="7.8" y="7.8" width="2.4" height="2.4" />
        <rect x="14.8" y="15.8" width="2.4" height="2.4" />
        <rect x="21.8" y="7.8" width="2.4" height="2.4" />
        <rect x="21.8" y="21.8" width="2.4" height="2.4" />
      </g>
    </svg>
  );
}
