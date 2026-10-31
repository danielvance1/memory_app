// The little burst of confetti that flies out of the tile when you score.
// This file only decides what each piece looks like and where it flies; the
// screen part is components/Celebration.tsx.

export interface Particle {
  /** How far it travels sideways and up/down, in pixels, from the middle of the tile. */
  dx: number;
  dy: number;
  /** Width and height in pixels. */
  size: number;
  color: string;
  /** How far it spins while flying, in degrees. */
  rotate: number;
  /** A circle (true) or a small square (false). */
  round: boolean;
  /** Milliseconds to wait before flying, so the pieces don't all leave in the same instant. */
  delayMs: number;
}

export const PARTICLE_COUNT = 16;
export const MIN_DISTANCE = 55;
export const MAX_DISTANCE = 115;
export const MIN_SIZE = 6;
export const MAX_SIZE = 11;
export const PARTICLE_COLORS = ["#22a124", "#4cc84e", "#bf6b17", "#e8923a", "#eceeef", "#9aa1a9"];

/**
 * Makes one burst. The circle around the tile is split into `count` equal
 * slices and each piece flies out within its own slice, so the burst is spread
 * all the way around instead of clumping. `random` returns a number from 0 up
 * to (not including) 1; it can be replaced in tests.
 */
export function makeParticles(count: number = PARTICLE_COUNT, random: () => number = Math.random): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = ((i + random() * 0.9) / count) * Math.PI * 2;
    const distance = MIN_DISTANCE + random() * (MAX_DISTANCE - MIN_DISTANCE);
    return {
      dx: Math.round(Math.cos(angle) * distance),
      dy: Math.round(Math.sin(angle) * distance),
      size: MIN_SIZE + Math.round(random() * (MAX_SIZE - MIN_SIZE)),
      color: PARTICLE_COLORS[Math.floor(random() * PARTICLE_COLORS.length)],
      rotate: Math.round(random() * 540 - 270),
      round: random() < 0.5,
      delayMs: Math.round(random() * 70),
    };
  });
}
