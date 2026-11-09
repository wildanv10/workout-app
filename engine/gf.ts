/* Typed, client-only access to the mannequin engine.
   fig-core.js and fig-poses.js are kept as plain JS, as published in the Atlas
   artifact, so they can be re-synced. They assign window.GF at import time and
   touch `window` immediately, so they are only ever imported in the browser. */

export interface FigureColors {
  brand?: string;
  brandHi?: string;
  floor?: string;
  floorLine?: string;
}

export interface FigureView {
  yaw: number;
  pitch: number;
  zoom: number;
  focusY: number;
}

/** Control handle returned for a `data-gf="anatomy"` canvas. */
export interface AnatomyControl {
  view: FigureView;
  colors: FigureColors | null;
  /** Highlight these muscle group ids. */
  setSelected(ids: readonly string[]): void;
  /** Called when the user taps a muscle on the body. */
  onToggle: ((id: string) => void) | null;
  /** Animate to the front (false) or back (true) view. */
  face(back: boolean): void;
}

/** Control handle returned for an exercise animation canvas. */
export interface ExerciseControl {
  view: FigureView;
  colors: FigureColors | null;
  /** Pick an animation template and the muscle groups to highlight. */
  setAnim(anim: string, primary: readonly string[]): void;
}

/** A pose in degrees: see fig-core.js GF.build for the full set of joints. */
export interface FigurePose {
  /** Torso lean. */ a?: number;
  /** Hip flexion. */ h?: number;
  /** Knee flexion. */ k?: number;
  /** Shoulder swing. */ s?: number;
  /** Elbow flexion. */ e?: number;
  /** Shoulder abduction. */ ab?: number;
  /** Whole-body rotation about x. */ th?: number;
  /** Plantar flexion. */ pf?: number;
  lift?: number;
  ground?: 'min' | 'feet';
  anchor?: 'pelvis' | 'feet';
}

/** Opaque joint set produced by GF.build. */
export type FigureJoints = Record<string, number[]>;

export interface ViewInstance {
  yaw: number;
  pitch: number;
  zoom: number;
  focusY: number;
  resize(): void;
}

export interface DrawOptions {
  /** Muscle group ids to highlight. */
  selected?: readonly string[];
  /** Draw only the highlighted blobs, leaving the rest of the body plain. */
  only?: boolean;
  /** Suppress the faint outline on unselected muscles. */
  noIdle?: boolean;
  colors?: FigureColors | null;
}

export interface GFEngine {
  MUSCLES: { id: string; name: string }[];
  ANIMS: Record<string, unknown>;
  mountAnatomy(canvas: HTMLCanvasElement): AnatomyControl;
  mountExercise(canvas: HTMLCanvasElement): ExerciseControl;
  /** Lower-level pieces, used to draw a single static frame. */
  build(pose: FigurePose): FigureJoints;
  drawFigure(view: ViewInstance, joints: FigureJoints, opt: DrawOptions): unknown[];
  View: new (canvas: HTMLCanvasElement) => ViewInstance;
}

let pending: Promise<GFEngine> | null = null;

/** Loads the engine once per page and resolves with window.GF. */
export function loadEngine(): Promise<GFEngine> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('loadEngine() is browser-only'));
  }
  if (!pending) {
    pending = (async () => {
      await import('./fig-core.js');
      await import('./fig-poses.js'); // needs GF.View from fig-core
      const gf = (window as unknown as { GF?: GFEngine }).GF;
      if (!gf) throw new Error('fig-core.js did not define window.GF');
      return gf;
    })().catch((err) => {
      pending = null; // let a later mount retry
      throw err;
    });
  }
  return pending;
}

/** Figure colours drawn from the app's design tokens. */
export const FIGURE_COLORS: FigureColors = {
  brand: '#0C66E4',
  brandHi: '#579DFF',
  floor: 'rgba(23,43,77,0.05)',
  floorLine: 'rgba(23,43,77,0.14)',
};

export const FIGURE_COLORS_DARK: FigureColors = {
  brand: '#579DFF',
  brandHi: '#85B8FF',
  floor: 'rgba(166,197,226,0.08)',
  floorLine: 'rgba(166,197,226,0.20)',
};
