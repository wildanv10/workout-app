import { beforeAll, describe, expect, it } from 'vitest';
import { motionIdOf } from './ecorche';
import { EXERCISES } from '@/data/exercises';

interface EngineExercise {
  id: string;
  name: string;
  timeline: { dur: number; label?: string }[];
  pose: (c: number) => Record<string, unknown>;
  props: string[];
}

let engine: { EXERCISES: EngineExercise[]; buildEcorche: () => unknown };

beforeAll(async () => {
  // The engine assigns window.Ecorche at import time and needs these globals.
  const g = globalThis as unknown as { window?: unknown; performance?: unknown };
  g.window ??= globalThis;
  g.performance ??= { now: () => Date.now() };
  await import('./ecorche.vendor.js');
  engine = (globalThis as unknown as { window: { Ecorche: typeof engine } }).window.Ecorche;
});

describe('engine motions', () => {
  it('has a motion for all 104 of our exercises', () => {
    const byId = new Map(engine.EXERCISES.map((e) => [e.id, e]));
    const missing = EXERCISES.filter((e) => !byId.has(motionIdOf(e.id))).map((e) => e.id);
    expect(missing, `exercises with no 3D motion: ${missing.join(', ')}`).toEqual([]);
    expect(EXERCISES).toHaveLength(104);
  });

  it('samples every motion across its cycle without throwing', () => {
    for (const exercise of engine.EXERCISES) {
      for (const c of [0, 0.25, 0.5, 0.75, 1]) {
        const pose = exercise.pose(c);
        expect(pose, `${exercise.name} at c=${c}`).toBeTypeOf('object');
      }
    }
  });

  it('gives every motion a timeline with real durations', () => {
    for (const exercise of engine.EXERCISES) {
      expect(exercise.timeline.length, exercise.name).toBeGreaterThan(0);
      const cycle = exercise.timeline.reduce((total, segment) => total + segment.dur, 0);
      expect(cycle, exercise.name).toBeGreaterThan(0);
    }
  });

  it('builds the mesh under strict mode', () => {
    const model = engine.buildEcorche() as {
      geometry: { position: Float32Array; index: Uint32Array };
      bones: unknown[];
    };
    expect(model.geometry.position.length).toBeGreaterThan(0);
    expect(model.geometry.index.length % 3).toBe(0);
    expect(model.bones.length).toBeGreaterThan(0);
  });
});
