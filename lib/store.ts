'use client';

import { useSyncExternalStore } from 'react';
import type { EquipmentCode } from '@/data/equipment';
import { ALL_EQUIPMENT_CODES } from '@/data/equipment';
import type { MuscleGroupId } from '@/data/muscles';

const STORAGE_KEY = 'workout.v1';

export interface EquipmentSetup {
  id: string;
  name: string;
  items: EquipmentCode[];
}

/** A generated session. Exercises are stored as ids so the data stays canonical. */
export interface Plan {
  muscles: MuscleGroupId[];
  setupId: string;
  exerciseIds: string[];
  variant: number;
}

export interface State {
  setups: EquipmentSetup[];
  activeSetupId: string;
  selectedMuscles: MuscleGroupId[];
  plan: Plan | null;
  /** False until localStorage has been read; not persisted. */
  ready: boolean;
}

export type Action =
  | { type: 'toggleMuscle'; id: MuscleGroupId }
  | { type: 'clearMuscles' }
  | { type: 'setActiveSetup'; id: string }
  | { type: 'saveSetup'; setup: EquipmentSetup }
  | { type: 'deleteSetup'; id: string }
  | { type: 'setPlan'; plan: Plan }
  | { type: 'addToPlan'; exerciseId: string }
  | { type: 'removeFromPlan'; exerciseId: string }
  | { type: 'hydrate'; state: State };

/** Bodyweight needs nothing, so a "Home" setup is still useful with very little. */
export const DEFAULT_STATE: State = {
  setups: [
    { id: 'home', name: 'Home', items: ['db', 'kb', 'mat'] },
    { id: 'gym', name: 'Full gym', items: [...ALL_EQUIPMENT_CODES] },
  ],
  activeSetupId: 'home',
  selectedMuscles: [],
  plan: null,
  ready: false,
};

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'toggleMuscle': {
      const has = state.selectedMuscles.includes(action.id);
      return {
        ...state,
        selectedMuscles: has
          ? state.selectedMuscles.filter((m) => m !== action.id)
          : [...state.selectedMuscles, action.id],
      };
    }

    case 'clearMuscles':
      return { ...state, selectedMuscles: [] };

    case 'setActiveSetup':
      return { ...state, activeSetupId: action.id };

    case 'saveSetup': {
      const exists = state.setups.some((s) => s.id === action.setup.id);
      return {
        ...state,
        setups: exists
          ? state.setups.map((s) => (s.id === action.setup.id ? action.setup : s))
          : [...state.setups, action.setup],
        activeSetupId: exists ? state.activeSetupId : action.setup.id,
      };
    }

    case 'deleteSetup': {
      if (state.setups.length < 2) return state;
      const setups = state.setups.filter((s) => s.id !== action.id);
      return {
        ...state,
        setups,
        activeSetupId: setups.some((s) => s.id === state.activeSetupId)
          ? state.activeSetupId
          : setups[0].id,
      };
    }

    case 'setPlan':
      return { ...state, plan: action.plan };

    case 'addToPlan':
      if (!state.plan || state.plan.exerciseIds.includes(action.exerciseId)) return state;
      return {
        ...state,
        plan: { ...state.plan, exerciseIds: [...state.plan.exerciseIds, action.exerciseId] },
      };

    case 'removeFromPlan':
      if (!state.plan) return state;
      return {
        ...state,
        plan: {
          ...state.plan,
          exerciseIds: state.plan.exerciseIds.filter((id) => id !== action.exerciseId),
        },
      };

    default:
      return state;
  }
}

// ------------------------------------------------------------- persistence

function read(): State | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (!Array.isArray(parsed.setups) || !parsed.setups.length) return null;
    return {
      setups: parsed.setups,
      activeSetupId: parsed.activeSetupId ?? parsed.setups[0].id,
      selectedMuscles: Array.isArray(parsed.selectedMuscles) ? parsed.selectedMuscles : [],
      plan: parsed.plan ?? null,
      ready: true,
    };
  } catch {
    return null;
  }
}

function write(state: State) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        setups: state.setups,
        activeSetupId: state.activeSetupId,
        selectedMuscles: state.selectedMuscles,
        plan: state.plan,
      }),
    );
  } catch {
    /* private mode or blocked storage - the app still works for this session */
  }
}

// --------------------------------------------- external store (no provider)

/**
 * The state lives outside React so it can be read on the server (defaults) and
 * hydrated from localStorage on the client without a setState-in-effect dance.
 * `useSyncExternalStore` re-renders subscribers after the snapshot changes.
 */
let current: State = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function hydrate() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  const saved = read();
  current = saved ?? { ...DEFAULT_STATE, ready: true };
}

function subscribe(listener: () => void): () => void {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => current;
const getServerSnapshot = () => DEFAULT_STATE;

export function dispatch(action: Action): void {
  const next = reducer(current, action);
  if (next === current) return;
  current = next;
  if (typeof window !== 'undefined') write(current);
  emit();
}

interface Store {
  state: State;
  dispatch: typeof dispatch;
  /** The setup currently selected, never undefined. */
  activeSetup: EquipmentSetup;
  /** True once localStorage has been read, so screens can avoid a flash. */
  ready: boolean;
}

export function useStore(): Store {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const activeSetup =
    state.setups.find((s) => s.id === state.activeSetupId) ??
    state.setups[0] ??
    DEFAULT_STATE.setups[0];
  return { state, dispatch, activeSetup, ready: state.ready };
}

export const newSetupId = () => `s${Date.now().toString(36)}`;
