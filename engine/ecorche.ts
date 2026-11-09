/* Typed, client-only access to the Atlas Écorché 3D engine.

   engine/ecorche.js is vendored verbatim from the artifact and assigns
   window.Ecorche at import time, so it is only ever imported in the browser.
   It needs WebGL2; callers must handle the unsupported case. */

export interface EcorcheMuscle {
  id: number;
  key: string;
  name: string;
  part?: string;
  /** Muscle group id, or null for deep-body parts. */
  group: string | null;
}

export interface EcorcheEquipmentUse {
  id: string;
  name: string;
  optional: boolean;
}

export interface EcorcheEquipment {
  /** Slug of the display name. */
  id: string;
  name: string;
  category: string;
  props: string[];
  /** Exercise the item is posed from. */
  src?: string;
  frac?: number;
  desc?: string;
  /** False for items in the library that have no 3D model yet. */
  modeled: boolean;
  usedBy?: EcorcheEquipmentUse[];
}

export interface ExerciseState {
  /** Seconds into the cycle. */
  t: number;
  cycle: number;
  /** Position through the cycle, 0-1. */
  frac: number;
  /** Contraction, 0-1. */
  c: number;
  /** Phase name, e.g. "Turun". */
  label: string;
  phase: number;
  rep: number;
  playing: boolean;
  speed: number;
}

export interface EcorcheTheme {
  /** Clear colour as [r, g, b], each 0-1. */
  background?: number[];
  /** 0 light, 1 dark. */
  dark?: number;
  /** Highlight colour as [r, g, b], each 0-1, gamma 2.2. */
  accent?: number[];
}

export interface EcorcheViewer {
  readonly canvas: HTMLCanvasElement;

  /** Highlight a single muscle group, or null for none. */
  selectGroup(groupId: string | null): void;
  /** Highlight several groups' muscles at once, by muscle key. */
  setFocus(focus: { primary?: string[]; secondary?: string[] } | null): void;
  highlightMuscle(key: string | null): void;
  focusMuscle(id: number): void;
  flyToGroup(groupId: string): void;
  view(name: 'front' | 'back' | 'left' | 'right' | string, instant?: boolean): void;
  reset(): void;

  /** Load an exercise animation by slug, or null to clear. */
  setExercise(id: string | null, options?: { autoplay?: boolean; fly?: boolean }): void;
  exercisePlay(on?: boolean): void;
  exerciseSeek(frac: number): void;
  exerciseSpeed(v: number): void;
  exerciseState(): ExerciseState | null;

  /** Show one piece of equipment on its own. Returns false if it has no model. */
  setEquipment(
    item: string | EcorcheEquipment,
    options?: { spin?: boolean; instant?: boolean },
  ): boolean;
  equipmentSpin(on?: boolean): boolean;

  setTheme(theme: EcorcheTheme): void;
  on(
    event: 'hover' | 'select' | 'frame',
    handler: (muscle?: EcorcheMuscle | null, position?: { x: number; y: number }) => void,
  ): () => void;
  resize(): void;
  dispose(): void;

  equipment: EcorcheEquipment[];
}

export interface EcorcheEngine {
  createEcorcheViewer(
    canvas: HTMLCanvasElement,
    options?: { preserveDrawingBuffer?: boolean },
  ): EcorcheViewer;
  GROUPS: { id: string; name: string; color: string; region: string }[];
  MUSCLES: EcorcheMuscle[];
  EQUIPMENT: EcorcheEquipment[];
  EX_MOTIONS: Record<string, unknown>;
}

let pending: Promise<EcorcheEngine> | null = null;

/** Loads the engine once per page and resolves with window.Ecorche. */
export function loadEcorche(): Promise<EcorcheEngine> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadEcorche() is browser-only'));
  }
  if (!pending) {
    pending = (async () => {
      await import('./ecorche.vendor.js');
      const engine = (window as unknown as { Ecorche?: EcorcheEngine }).Ecorche;
      if (!engine) throw new Error('ecorche.js did not define window.Ecorche');
      return engine;
    })().catch((error) => {
      pending = null; // let a later mount retry
      throw error;
    });
  }
  return pending;
}

export const webgl2Supported = (): boolean => {
  if (typeof document === 'undefined') return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
};

/**
 * The engine slugs exercise names without stripping apostrophes, so one id
 * differs from ours. Everything else matches, all 104 of them.
 */
const MOTION_ALIASES: Record<string, string> = {
  'farmers-carry': 'farmer-s-carry',
};

export const motionIdOf = (exerciseId: string): string =>
  MOTION_ALIASES[exerciseId] ?? exerciseId;

// ---------------------------------------------------------------- theming

/** Reads a CSS custom property as [r, g, b] in 0-1. */
function cssColor(name: string, fallback: number[]): number[] {
  if (typeof document === 'undefined') return fallback;
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  const parts = value.match(/[\d.]+/g);
  if (!parts || parts.length < 3) return fallback;
  return parts.slice(0, 3).map((x) => Number(x) / 255);
}

/** Matches the viewer's clear colour and highlight to the app's design tokens. */
export function themeFromTokens(): EcorcheTheme {
  const background = cssColor('--sub', [0.97, 0.97, 0.98]);
  const dark = (background[0] + background[1] + background[2]) / 3 < 0.4 ? 1 : 0;
  const accent = cssColor('--brand', [0.05, 0.4, 0.89]).map((x) => Math.pow(x, 2.2));
  return { background, dark, accent };
}
