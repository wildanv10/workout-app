import { beforeAll, describe, expect, it } from 'vitest';
import { PHASE_LABELS, phaseLabel } from './phase-labels';

interface Timeline {
  timeline?: { label?: string }[];
}

let engineLabels: string[] = [];

beforeAll(async () => {
  // The engine assigns window.Ecorche at import time and needs these globals.
  const g = globalThis as unknown as { window?: unknown; performance?: unknown };
  g.window ??= globalThis;
  g.performance ??= { now: () => 0 };

  await import('./ecorche.vendor.js');
  const engine = (globalThis as unknown as { window: { Ecorche: { EXERCISES: Timeline[] } } })
    .window.Ecorche;

  const labels = new Set<string>();
  for (const exercise of engine.EXERCISES) {
    for (const segment of exercise.timeline ?? []) {
      if (segment.label) labels.add(segment.label);
    }
  }
  engineLabels = [...labels];
});

describe('animation phase labels', () => {
  it('translates every label the engine can show', () => {
    const missing = engineLabels.filter((label) => !(label in PHASE_LABELS));
    expect(missing, `untranslated phase labels: ${missing.join(', ')}`).toEqual([]);
    expect(engineLabels.length).toBe(258);
  });

  it('carries no translation the engine never uses', () => {
    const used = new Set(engineLabels);
    const unused = Object.keys(PHASE_LABELS).filter((label) => !used.has(label));
    expect(unused, `stale translations: ${unused.join(', ')}`).toEqual([]);
  });

  it('never returns Indonesian to the UI', () => {
    // Words that would only appear if a label fell through untranslated.
    const indonesian = /\b(turun|turunkan|dorong|tarik|angkat|tahan|kaki|lengan|bahu|siku)\b/i;
    for (const label of engineLabels) {
      const english = phaseLabel(label);
      expect(english, label).not.toBeNull();
      expect(indonesian.test(english!), `${label} -> ${english}`).toBe(false);
    }
  });

  it('hides a label it does not know instead of guessing', () => {
    expect(phaseLabel('Sesuatu yang baru')).toBeNull();
    expect(phaseLabel(undefined)).toBeNull();
    expect(phaseLabel('')).toBeNull();
  });
});
