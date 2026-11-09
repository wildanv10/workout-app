# Workout

Mobile-first web app: pick the muscles you want to train on a rotatable 3D body,
pick the equipment you actually have, and get the exercises you can do.

```
Home → 1. Target muscles → 2. Your equipment → Generating… → Your session
                                                                 └ exercise detail
```

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # generator + dataset tests
npm run build
```

Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules. No UI framework
and no runtime dependencies beyond React — the 3D body is plain canvas 2D.

## How it decides what to show you

`lib/availability.ts` holds the rule the whole feature rests on:

> An exercise is available when every piece of equipment it **requires** is owned.
> Equipment marked optional can be substituted or skipped, so it never gates
> availability. Exercises needing no equipment are always available.

`lib/generate.ts` then builds a session:

1. Filter the 104 exercises to what the setup allows.
2. Score each one — a primary mover counts 3, a supporting muscle 1, loaded work
   gets a small nudge up, very broad exercises a small nudge down.
3. **Coverage pass** — every selected muscle group gets an exercise that trains
   it as a primary mover before anything is added just to fill the session.
4. **Fill pass** — round out to `clamp(selected + 2, 4, 8)` exercises.
5. `variant` rotates among the strongest candidates, so Regenerate gives a
   genuinely different session rather than a reshuffle.

If a selected group has nothing available, it is **reported, not dropped** — the
result screen says which group and why.

## Data

Everything in `data/` is generated. Do not hand-edit it.

| File | Holds |
|---|---|
| `data/muscles.ts` | 16 muscle groups (id, name, region, colour) and 53 individual muscles |
| `data/equipment.ts` | 41 equipment items in 7 categories, each with its illustration |
| `data/exercises.ts` | 104 exercises: muscles, equipment, level, category, English steps |

### Regenerating

```bash
npm run extract-data    # data/*.ts  <- scripts/source/ + scripts/steps/
npm run build-art       # scripts/source/equipment-art.mjs <- the library artboards
npm run install-art <dir>   # public/equipment/*.svg <- downloaded blobs
```

`scripts/extract-data.mjs` validates as it goes and writes nothing if anything
fails: every muscle id must resolve to one of the 16 groups, every equipment
code must exist, every exercise must have English steps with the same step count
as the source.

### Where the data came from

This app was built from four claude.ai artifacts. Their relevant parts are
committed under `scripts/source/` so regeneration never depends on network
access:

| Source | Gave us |
|---|---|
| Atlas — AI personal trainer | The screen flow and the `gen()` algorithm this generator is adapted from |
| Atlas Écorché | The canonical 16 muscle groups, with ids and colours |
| Exercise Library | 104 exercises with muscle, equipment, level and step data |
| Equipment Illustrations | 119 isometric SVGs (`public/equipment/`) |

The exercise steps were written in Indonesian in the source data and translated
to English in `scripts/steps/`, one sentence per original step. That translation
is the hand-written part of the dataset; everything else is mechanical.

## The 3D body

`engine/fig-core.js` and `engine/fig-poses.js` are vendored **verbatim** from the
Atlas artifact (a dependency-free canvas-2D mannequin renderer with
drag-to-rotate and tap-to-select hit testing), so they can be re-synced if the
artifact changes. They are excluded from lint for that reason. Two deliberate
changes were made:

- `lowerback` renamed to `lowback`, matching both datasets.
- `midback`, `obliques` and `adductors` blobs added — the engine only defined 13
  of the 16 groups, so those three were selectable as chips but not tappable on
  the body.

They assign `window.GF` at import time, so they are only ever loaded in the
browser. `engine/gf.ts` is the typed wrapper that does that and is what app code
calls.

**Animation coverage:** `fig-poses.js` has 14 motion templates, which genuinely
fit 45 of the 104 exercises. `components/ExerciseVisual.tsx` falls back in order:

1. an animation, where a template really matches the movement
2. the isometric illustration of the equipment it uses
3. a still body with the target muscles highlighted

An exercise is left without `anim` rather than being given a motion that would
show the wrong movement.

## Storage

All state is client-side, in `localStorage` under `workout.v1`: equipment setups,
the active setup, the selected muscles, and the last generated plan.
`lib/store.ts` is an external store read through `useSyncExternalStore`, so the
server renders defaults and the client swaps in saved state without a
setState-in-effect round trip. Blocked or private-mode storage is caught — the
app still works for that session.

## Not built yet

By scope decision, the first version stops at generating the session. The Atlas
design also had a workout player (set tracking, sets/reps steppers), saved
programs with progress, and drag-to-reorder. The data model leaves room for them.
