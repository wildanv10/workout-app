import type { EquipmentCode } from '@/data/equipment';
import type { Exercise, Level } from '@/data/exercises';
import type { MuscleGroupId } from '@/data/muscles';
import { groupsOf, MUSCLE_GROUPS } from '@/data/muscles';
import { availableExercises } from './availability';

export interface GenerateInput {
  /** Muscle groups the user picked, in selection order. */
  muscles: readonly MuscleGroupId[];
  /** Equipment codes the active setup owns. */
  owned: readonly EquipmentCode[];
  /** Bumped by "Regenerate" to rotate through alternative picks. */
  variant?: number;
  /** Optional ceiling on difficulty. */
  maxLevel?: Level;
}

export interface GroupCoverage {
  group: MuscleGroupId;
  /** How many generated exercises train this group as a primary mover. */
  primaryCount: number;
  /** How many train it as a supporting muscle only. */
  secondaryCount: number;
}

export interface GenerateResult {
  exercises: Exercise[];
  coverage: GroupCoverage[];
  /** Selected groups that nothing in the available pool trains at all. */
  uncovered: MuscleGroupId[];
  /** Size of the pool the equipment setup allowed. */
  availableCount: number;
}

/** Exercises are ordered compound-first, so the hardest work comes while fresh. */
const ORDER = new Map(MUSCLE_GROUPS.map((g, i) => [g.id, i]));

const primaryGroupCache = new WeakMap<Exercise, MuscleGroupId[]>();
const secondaryGroupCache = new WeakMap<Exercise, MuscleGroupId[]>();

export function primaryGroups(exercise: Exercise): MuscleGroupId[] {
  let cached = primaryGroupCache.get(exercise);
  if (!cached) {
    cached = groupsOf(exercise.primary);
    primaryGroupCache.set(exercise, cached);
  }
  return cached;
}

export function secondaryGroups(exercise: Exercise): MuscleGroupId[] {
  let cached = secondaryGroupCache.get(exercise);
  if (!cached) {
    cached = groupsOf(exercise.secondary);
    secondaryGroupCache.set(exercise, cached);
  }
  return cached;
}

/**
 * How well an exercise serves the selection: a primary mover counts for much
 * more than a supporting muscle, loaded work is preferred when the equipment is
 * there, and very broad exercises are nudged down so focused ones rank first.
 */
function score(exercise: Exercise, selected: ReadonlySet<MuscleGroupId>): number {
  let s = 0;
  for (const g of primaryGroups(exercise)) if (selected.has(g)) s += 3;
  for (const g of secondaryGroups(exercise)) if (selected.has(g)) s += 1;
  if (s === 0) return 0;
  if (exercise.equipment.length > 0) s += 0.5;
  return s - exercise.groups.length * 0.15;
}

/** Stable ordering: score first, then name, so results never depend on input order. */
const byScore =
  (selected: ReadonlySet<MuscleGroupId>) =>
  (a: Exercise, b: Exercise): number =>
    score(b, selected) - score(a, selected) || a.name.localeCompare(b.name);

export function generateWorkout({
  muscles,
  owned,
  variant = 0,
  maxLevel,
}: GenerateInput): GenerateResult {
  const selected = new Set(muscles);
  const pool = availableExercises(new Set(owned)).filter(
    (e) => (maxLevel === undefined || e.level <= maxLevel) && score(e, selected) > 0,
  );
  const ranked = [...pool].sort(byScore(selected));

  const picked: Exercise[] = [];
  const pickedIds = new Set<string>();
  const uncovered: MuscleGroupId[] = [];

  const take = (exercise: Exercise) => {
    picked.push(exercise);
    pickedIds.add(exercise.id);
  };

  // Coverage pass: every selected group gets an exercise that actually trains
  // it as a primary mover, before anything is added just to fill the session.
  for (const group of muscles) {
    const alreadyPrimary = picked.some((e) => primaryGroups(e).includes(group));
    if (alreadyPrimary) continue;

    const candidates = ranked.filter(
      (e) => !pickedIds.has(e.id) && primaryGroups(e).includes(group),
    );
    const fallback = ranked.filter(
      (e) => !pickedIds.has(e.id) && secondaryGroups(e).includes(group),
    );
    const list = candidates.length ? candidates : fallback;

    if (!list.length) {
      // Nothing available trains it, even as support - report it, do not hide it.
      const trainedAtAll = picked.some((e) => e.groups.includes(group));
      if (!trainedAtAll) uncovered.push(group);
      continue;
    }
    // Rotate among the strongest few so Regenerate gives a genuinely different
    // session rather than reshuffling the same picks.
    take(list[variant % Math.min(3, list.length)]);
  }

  // Fill pass: round the session out to a sensible length.
  const target = Math.min(8, Math.max(4, muscles.length + 2));
  for (const exercise of ranked) {
    if (picked.length >= target) break;
    if (pickedIds.has(exercise.id)) continue;
    take(exercise);
  }

  picked.sort(
    (a, b) =>
      primaryGroups(b).length - primaryGroups(a).length ||
      b.groups.length - a.groups.length ||
      (ORDER.get(a.groups[0]) ?? 99) - (ORDER.get(b.groups[0]) ?? 99) ||
      a.name.localeCompare(b.name),
  );

  const coverage: GroupCoverage[] = muscles.map((group) => ({
    group,
    primaryCount: picked.filter((e) => primaryGroups(e).includes(group)).length,
    secondaryCount: picked.filter(
      (e) => !primaryGroups(e).includes(group) && secondaryGroups(e).includes(group),
    ).length,
  }));

  return { exercises: picked, coverage, uncovered, availableCount: pool.length };
}

/** Exercises that match the selection and setup but are not in the plan yet. */
export function suggestions(
  plan: readonly Exercise[],
  { muscles, owned, maxLevel }: GenerateInput,
): Exercise[] {
  const selected = new Set(muscles);
  const inPlan = new Set(plan.map((e) => e.id));
  return availableExercises(new Set(owned))
    .filter(
      (e) =>
        !inPlan.has(e.id) &&
        (maxLevel === undefined || e.level <= maxLevel) &&
        score(e, selected) > 0,
    )
    .sort(byScore(selected));
}

/** Coverage of a plan that was loaded from storage rather than just generated. */
export function planCoverage(
  plan: readonly Exercise[],
  muscles: readonly MuscleGroupId[],
): GroupCoverage[] {
  return muscles.map((group) => ({
    group,
    primaryCount: plan.filter((e) => primaryGroups(e).includes(group)).length,
    secondaryCount: plan.filter(
      (e) => !primaryGroups(e).includes(group) && secondaryGroups(e).includes(group),
    ).length,
  }));
}

/**
 * Selected groups that the equipment setup leaves with nothing at all. Worth
 * saying out loud: it means "you need more gear for this", not "we found none".
 */
export function groupsWithNothingAvailable(
  muscles: readonly MuscleGroupId[],
  owned: readonly EquipmentCode[],
): MuscleGroupId[] {
  const pool = availableExercises(new Set(owned));
  return muscles.filter((group) => !pool.some((e) => e.groups.includes(group)));
}

/** A short title for a generated session, e.g. "Chest + Shoulders +2". */
export function workoutName(muscles: readonly MuscleGroupId[]): string {
  const names = muscles.map((id) => MUSCLE_GROUPS.find((g) => g.id === id)?.name ?? id);
  if (!names.length) return 'Workout';
  const head = names.slice(0, 2).join(' + ');
  return names.length > 2 ? `${head} +${names.length - 2}` : head;
}
