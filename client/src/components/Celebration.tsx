import { useMemo, type CSSProperties } from "react";
import { makeParticles } from "../drill/celebration";

// A burst of confetti that flies out from the middle of whatever it sits in
// (the parent needs `position: relative`). It plays once when it appears; to
// play it again, mount a new one (give it a new `key`). Hidden for people who
// ask their device for less motion (see index.css).
export default function Celebration() {
  const particles = useMemo(() => makeParticles(), []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {particles.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--size": `${p.size}px`,
              "--color": p.color,
              "--rot": `${p.rotate}deg`,
              "--radius": p.round ? "9999px" : "2px",
              "--delay": `${p.delayMs}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
