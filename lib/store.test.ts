import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, reducer, type Plan, type State } from './store';

const plan: Plan = {
  muscles: ['chest', 'triceps'],
  setupId: 'home',
  exerciseIds: ['push-up', 'bench-dip'],
  variant: 0,
};

const withPlan = (): State => reducer({ ...DEFAULT_STATE, ready: true }, { type: 'setPlan', plan });

describe('programs', () => {
  it('saves the current session as a program and links it', () => {
    const state = reducer(withPlan(), { type: 'saveProgram' });
    expect(state.programs).toHaveLength(1);
    const [program] = state.programs;
    expect(program.name).toBe('Chest + Triceps');
    expect(program.exerciseIds).toEqual(plan.exerciseIds);
    expect(program.muscles).toEqual(plan.muscles);
    expect(state.plan?.programId).toBe(program.id);
    expect(Number.isNaN(Date.parse(program.savedAt))).toBe(false);
  });

  it('does not save the same session twice', () => {
    const once = reducer(withPlan(), { type: 'saveProgram' });
    const twice = reducer(once, { type: 'saveProgram' });
    expect(twice.programs).toHaveLength(1);
    expect(twice).toBe(once);
  });

  it('unsaving removes the program and the link', () => {
    const saved = reducer(withPlan(), { type: 'saveProgram' });
    const state = reducer(saved, { type: 'unsaveProgram' });
    expect(state.programs).toEqual([]);
    expect(state.plan?.programId).toBeUndefined();
  });

  it('keeps a saved program in step when the session changes', () => {
    const saved = reducer(withPlan(), { type: 'saveProgram' });
    const added = reducer(saved, { type: 'addToPlan', exerciseId: 'plank' });
    expect(added.programs[0].exerciseIds).toEqual(['push-up', 'bench-dip', 'plank']);

    const removed = reducer(added, { type: 'removeFromPlan', exerciseId: 'push-up' });
    expect(removed.programs[0].exerciseIds).toEqual(['bench-dip', 'plank']);
    expect(removed.plan?.exerciseIds).toEqual(['bench-dip', 'plank']);
  });

  it('leaves programs alone when the session is not saved', () => {
    const saved = reducer(withPlan(), { type: 'saveProgram' });
    const other = reducer(saved, { type: 'setPlan', plan: { ...plan, exerciseIds: ['crunch'] } });
    const added = reducer(other, { type: 'addToPlan', exerciseId: 'plank' });
    expect(added.programs[0].exerciseIds).toEqual(['push-up', 'bench-dip']);
  });

  it('opens a program back into the session and the selection', () => {
    const saved = reducer(withPlan(), { type: 'saveProgram' });
    const cleared = reducer(saved, { type: 'clearMuscles' });
    const opened = reducer(cleared, { type: 'openProgram', id: saved.programs[0].id });
    expect(opened.plan?.exerciseIds).toEqual(plan.exerciseIds);
    expect(opened.plan?.programId).toBe(saved.programs[0].id);
    expect(opened.selectedMuscles).toEqual(plan.muscles);
  });

  it('deleting a program clears the link on the open session', () => {
    const saved = reducer(withPlan(), { type: 'saveProgram' });
    const state = reducer(saved, { type: 'deleteProgram', id: saved.programs[0].id });
    expect(state.programs).toEqual([]);
    expect(state.plan?.programId).toBeUndefined();
  });

  it('ignores an unknown program id', () => {
    const state = reducer(withPlan(), { type: 'openProgram', id: 'nope' });
    expect(state.plan?.exerciseIds).toEqual(plan.exerciseIds);
  });
});

describe('equipment setups', () => {
  it('never deletes the last setup', () => {
    const one: State = { ...DEFAULT_STATE, setups: [DEFAULT_STATE.setups[0]] };
    expect(reducer(one, { type: 'deleteSetup', id: 'home' })).toBe(one);
  });

  it('moves the active setup when the active one is deleted', () => {
    const state = reducer(DEFAULT_STATE, { type: 'deleteSetup', id: 'home' });
    expect(state.setups.map((s) => s.id)).toEqual(['gym']);
    expect(state.activeSetupId).toBe('gym');
  });

  it('selects a newly added setup', () => {
    const state = reducer(DEFAULT_STATE, {
      type: 'saveSetup',
      setup: { id: 'hotel', name: 'Hotel', items: ['mat'] },
    });
    expect(state.activeSetupId).toBe('hotel');
  });

  it('keeps the active setup when editing an existing one', () => {
    const state = reducer(DEFAULT_STATE, {
      type: 'saveSetup',
      setup: { id: 'gym', name: 'Big gym', items: ['bb'] },
    });
    expect(state.activeSetupId).toBe('home');
    expect(state.setups.find((s) => s.id === 'gym')?.name).toBe('Big gym');
  });
});

describe('muscle selection', () => {
  it('toggles in selection order', () => {
    let state = reducer(DEFAULT_STATE, { type: 'toggleMuscle', id: 'lats' });
    state = reducer(state, { type: 'toggleMuscle', id: 'chest' });
    expect(state.selectedMuscles).toEqual(['lats', 'chest']);
    state = reducer(state, { type: 'toggleMuscle', id: 'lats' });
    expect(state.selectedMuscles).toEqual(['chest']);
  });
});
