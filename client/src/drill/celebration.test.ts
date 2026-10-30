import { describe, expect, it } from "vitest";
import {
  MAX_DISTANCE,
  MAX_SIZE,
  MIN_DISTANCE,
  MIN_SIZE,
  PARTICLE_COLORS,
  PARTICLE_COUNT,
  makeParticles,
} from "./celebration";

// A repeatable "random" so a failure can be reproduced.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe("makeParticles", () => {
  it("makes the default number of pieces, or as many as asked", () => {
    expect(makeParticles()).toHaveLength(PARTICLE_COUNT);
    expect(makeParticles(5)).toHaveLength(5);
    expect(makeParticles(0)).toHaveLength(0);
  });

  it("keeps every piece within the allowed distance, size and colors", () => {
    for (let seed = 1; seed <= 30; seed++) {
      for (const p of makeParticles(PARTICLE_COUNT, seeded(seed))) {
        const distance = Math.hypot(p.dx, p.dy);
        expect(distance).toBeGreaterThanOrEqual(MIN_DISTANCE - 1); // rounding to whole pixels can shave a pixel
        expect(distance).toBeLessThanOrEqual(MAX_DISTANCE + 1);
        expect(p.size).toBeGreaterThanOrEqual(MIN_SIZE);
        expect(p.size).toBeLessThanOrEqual(MAX_SIZE);
        expect(PARTICLE_COLORS).toContain(p.color);
        expect(p.delayMs).toBeGreaterThanOrEqual(0);
        expect(p.delayMs).toBeLessThanOrEqual(70);
      }
    }
  });

  it("spreads the burst all the way around: each piece flies in its own slice of the circle", () => {
    const count = 16;
    for (let seed = 1; seed <= 30; seed++) {
      makeParticles(count, seeded(seed)).forEach((p, i) => {
        let angle = Math.atan2(p.dy, p.dx);
        if (angle < 0) angle += Math.PI * 2;
        const sliceStart = (i / count) * Math.PI * 2;
        const sliceEnd = ((i + 0.9) / count) * Math.PI * 2;
        const slack = 0.05; // whole-pixel rounding moves the angle a hair
        expect(angle).toBeGreaterThanOrEqual(sliceStart - slack);
        expect(angle).toBeLessThanOrEqual(sliceEnd + slack);
      });
    }
  });

  it("flies out in every direction (not all one side)", () => {
    const ps = makeParticles(PARTICLE_COUNT, seeded(7));
    expect(ps.some((p) => p.dx > 20)).toBe(true);
    expect(ps.some((p) => p.dx < -20)).toBe(true);
    expect(ps.some((p) => p.dy > 20)).toBe(true);
    expect(ps.some((p) => p.dy < -20)).toBe(true);
  });

  it("mixes circles and squares, and more than one color", () => {
    const ps = makeParticles(PARTICLE_COUNT, seeded(3));
    expect(ps.some((p) => p.round)).toBe(true);
    expect(ps.some((p) => !p.round)).toBe(true);
    expect(new Set(ps.map((p) => p.color)).size).toBeGreaterThan(1);
  });

  it("gives the same burst for the same random numbers", () => {
    expect(makeParticles(PARTICLE_COUNT, seeded(11))).toEqual(makeParticles(PARTICLE_COUNT, seeded(11)));
  });
});
