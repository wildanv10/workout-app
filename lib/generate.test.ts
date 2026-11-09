import { describe, expect, it } from 'vitest';
import { EXERCISES, getExercise } from '@/data/exercises';
import { ALL_EQUIPMENT_CODES, EQUIPMENT, type EquipmentCode } from '@/data/equipment';
import { MUSCLE_GROUPS, groupsOf, type MuscleGroupId } from '@/data/muscles';
import { isAvailable, availableExercises, requiredEquipment } from './availability';
import {
  generateWorkout,
  groupsWithNothingAvailable,
  primaryGroups,
  suggestions,
  workoutName,
} from './generate';

/** Nothing owned: only true bodyweight work is possible. */
const NOTHING: EquipmentCode[] = [];
const FULL_GYM = ALL_EQUIPMENT_CODES;

describe('availability', () => {
  it('never offers an exercise whose required equipment is missing', () => {
    const owned = new Set(NOTHING);
    for (const exercise of availableExercises(owned)) {
      expect(requiredEquipment(exercise)).toHaveLength(0);
    }
  });

  it('lets optional equipment through: Inverted Row needs only the rack', () => {
    const invertedRow = getExercise('inverted-row');
    expect(invertedRow).toBeDefined();
    // The dataset marks Smith machine and rings optional for this one.
    expect(invertedRow!.equipment.filter((e) => e.optional).map((e) => e.code).sort()).toEqual([
      'rings',
      'smith',
    ]);
    expect(isAvailable(invertedRow!, new Set<EquipmentCode>(['rack']))).toBe(true);
    expect(isAvailable(invertedRow!, new Set<EquipmentCode>([]))).toBe(false);
  });

  it('treats a mat-optional push-up as doable with nothing at all', () => {
    const pushUp = getExercise('push-up');
    expect(pushUp).toBeDefined();
    expect(isAvailable(pushUp!, new Set(NOTHING))).toBe(true);
  });

  it('opens up far more exercises in a full gym than with nothing', () => {
    const bare = availableExercises(new Set(NOTHING)).length;
    const full = availableExercises(new Set(FULL_GYM)).length;
    expect(full).toBe(EXERCISES.length);
    expect(bare).toBeGreaterThan(0);
    expect(bare).toBeLessThan(full);
  });
});

describe('generateWorkout', () => {
  it('only picks exercises the setup allows', () => {
    const owned = new Set<EquipmentCode>(['db', 'mat']);
    const { exercises } = generateWorkout({
      muscles: ['chest', 'biceps', 'quads'],
      owned: [...owned],
    });
    expect(exercises.length).toBeGreaterThan(0);
    for (const exercise of exercises) {
      expect(isAvailable(exercise, owned)).toBe(true);
    }
  });

  it('never returns barbell or machine work for a bodyweight-only setup', () => {
    const { exercises } = generateWorkout({
      muscles: ['chest', 'abs', 'quads', 'glutes'],
      owned: NOTHING,
    });
    const banned: EquipmentCode[] = ['bb', 'db', 'cc', 'lp', 'lpd', 'smith', 'kb'];
    for (const exercise of exercises) {
      for (const code of banned) {
        expect(requiredEquipment(exercise)).not.toContain(code);
      }
    }
  });

  it('trains every selected group directly when the setup allows it', () => {
    const selected: MuscleGroupId[] = ['chest', 'lats', 'quads', 'calves'];
    const { exercises, uncovered } = generateWorkout({ muscles: selected, owned: FULL_GYM });
    expect(uncovered).toEqual([]);
    for (const group of selected) {
      const direct = exercises.some((e) => primaryGroups(e).includes(group));
      expect(direct, `${group} should have a primary exercise`).toBe(true);
    }
  });

  it('reports a group it cannot train instead of silently dropping it', () => {
    // Calf work in this dataset needs a machine or at least some floor space:
    // with nothing owned, Tibialis Raise and Bodyweight Squat remain, so pick a
    // group that genuinely has nothing - adductors need a bench or a machine.
    const impossible = groupsWithNothingAvailable(
      MUSCLE_GROUPS.map((g) => g.id),
      NOTHING,
    );
    for (const group of impossible) {
      const { uncovered, exercises } = generateWorkout({ muscles: [group], owned: NOTHING });
      expect(uncovered).toContain(group);
      expect(exercises).toEqual([]);
    }
  });

  it('keeps a sensible session length', () => {
    for (const count of [1, 2, 3, 5, 8]) {
      const selected = MUSCLE_GROUPS.slice(0, count).map((g) => g.id);
      const { exercises } = generateWorkout({ muscles: selected, owned: FULL_GYM });
      expect(exercises.length).toBeGreaterThanOrEqual(Math.min(4, exercises.length));
      expect(exercises.length).toBeLessThanOrEqual(8);
    }
  });

  it('is deterministic for the same inputs', () => {
    const input = { muscles: ['chest', 'triceps'] as MuscleGroupId[], owned: FULL_GYM };
    const a = generateWorkout(input).exercises.map((e) => e.id);
    const b = generateWorkout(input).exercises.map((e) => e.id);
    expect(a).toEqual(b);
  });

  it('gives a different session when regenerated', () => {
    const input = { muscles: ['chest', 'lats', 'quads'] as MuscleGroupId[], owned: FULL_GYM };
    const first = generateWorkout({ ...input, variant: 0 }).exercises.map((e) => e.id);
    const second = generateWorkout({ ...input, variant: 1 }).exercises.map((e) => e.id);
    expect(second).not.toEqual(first);
  });

  it('respects a difficulty ceiling', () => {
    const { exercises } = generateWorkout({
      muscles: ['chest', 'lats'],
      owned: FULL_GYM,
      maxLevel: 1,
    });
    expect(exercises.length).toBeGreaterThan(0);
    for (const exercise of exercises) expect(exercise.level).toBe(1);
  });

  it('only includes exercises that touch the selection', () => {
    const selected: MuscleGroupId[] = ['calves'];
    const { exercises } = generateWorkout({ muscles: selected, owned: FULL_GYM });
    for (const exercise of exercises) {
      expect(exercise.groups).toContain('calves');
    }
  });

  it('suggests only unused, available, relevant exercises', () => {
    const owned = new Set<EquipmentCode>(['db', 'fb']);
    const input = { muscles: ['chest'] as MuscleGroupId[], owned: [...owned] };
    const { exercises } = generateWorkout(input);
    const more = suggestions(exercises, input);
    const planIds = new Set(exercises.map((e) => e.id));
    for (const exercise of more) {
      expect(planIds.has(exercise.id)).toBe(false);
      expect(isAvailable(exercise, owned)).toBe(true);
      expect(exercise.groups).toContain('chest');
    }
  });

  it('names a session after the chosen muscles', () => {
    expect(workoutName(['chest'])).toBe('Chest');
    expect(workoutName(['chest', 'shoulders'])).toBe('Chest + Shoulders');
    expect(workoutName(['chest', 'shoulders', 'triceps', 'abs'])).toBe('Chest + Shoulders +2');
  });
});

describe('dataset integrity', () => {
  it('holds all 104 exercises', () => {
    expect(EXERCISES).toHaveLength(104);
  });

  it('gives every exercise a primary muscle, steps, and a unique id', () => {
    const ids = new Set<string>();
    for (const exercise of EXERCISES) {
      expect(exercise.primary.length, exercise.name).toBeGreaterThan(0);
      expect(exercise.steps.length, exercise.name).toBeGreaterThanOrEqual(3);
      expect(exercise.categories.length, exercise.name).toBeGreaterThan(0);
      expect(ids.has(exercise.id), exercise.id).toBe(false);
      ids.add(exercise.id);
    }
  });

  it('writes every step in English', () => {
    // A few words that would only appear if an Indonesian step slipped through.
    const indonesian = /\b(dengan|dari|hingga|lalu|tangan|kaki|badan|ulangi|perlahan)\b/i;
    for (const exercise of EXERCISES) {
      for (const step of exercise.steps) {
        expect(indonesian.test(step), `${exercise.name}: ${step}`).toBe(false);
      }
    }
  });

  it('resolves every muscle id to one of the 16 groups', () => {
    const groupIds = new Set(MUSCLE_GROUPS.map((g) => g.id));
    expect(groupIds.size).toBe(16);
    for (const exercise of EXERCISES) {
      const resolved = groupsOf([...exercise.primary, ...exercise.secondary]);
      expect(resolved.length, exercise.name).toBeGreaterThan(0);
      for (const group of resolved) expect(groupIds.has(group)).toBe(true);
      expect(new Set(exercise.groups)).toEqual(new Set(resolved));
    }
  });

  it('resolves every equipment code, and categorises all of them', () => {
    const codes = new Set(EQUIPMENT.map((e) => e.code));
    expect(codes.size).toBe(41);
    for (const exercise of EXERCISES) {
      for (const item of exercise.equipment) {
        expect(codes.has(item.code), `${exercise.name}: ${item.code}`).toBe(true);
      }
    }
  });

  it('keeps every muscle group reachable by at least one exercise', () => {
    for (const group of MUSCLE_GROUPS) {
      const trained = EXERCISES.filter((e) => primaryGroups(e).includes(group.id));
      expect(trained.length, `${group.name} has no primary exercise`).toBeGreaterThan(0);
    }
  });
});
