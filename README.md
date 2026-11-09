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

## The 3D engine

`engine/ecorche.vendor.js` is the Atlas Écorché engine, vendored **verbatim**
from its artifact: a dependency-free WebGL2 renderer with a procedurally built
anatomical muscle body (199k vertices, 358k triangles, a 20-bone rig), an
animated motion for **every one of the 104 exercises**, and 3D models for 38 of
the 41 equipment items. It is excluded from lint so it stays re-syncable, and is
named `.vendor.js` so that nothing resolves `./ecorche` to it instead of the
typed wrapper — Vite prefers `.js` over `.ts`, which bit once already.

`engine/ecorche.ts` is that wrapper: it loads the engine once per page, in the
browser only (it assigns `window.Ecorche` at import time and needs WebGL2),
types the viewer API, and maps the app's design tokens onto the viewer.

The engine builds its mesh in about a second and holds a WebGL2 context, so
there is **one viewer per screen, never one per list row**. Three screens use
it, all through `components/EcorcheCanvas.tsx`:

| Screen | What it shows |
|---|---|
| `/new/muscles` | The body. Tap a muscle to toggle its group; every selected group highlights at once |
| `/exercise/[id]` | The exercise animated, with play/pause, 0.5×/1×/2× and a scrubber |
| Equipment info popup | One piece of equipment on its own, auto-framed and rotating |

Multi-select needs `setFocus()` with the muscle keys of all selected groups —
the engine's own `selectGroup()` holds one group at a time.

Where WebGL2 is missing each falls back: the picker drops to its chips alone,
and the exercise and equipment views show the isometric illustration.

### Phase labels

The engine labels each segment of a movement in Indonesian.
`engine/phase-labels.ts` translates all 258, and a test fails if the engine ever
uses one we have not translated. An unknown label is hidden rather than shown in
Indonesian.

### One id mismatch

The engine slugs exercise names without stripping apostrophes, so Farmer's Carry
is `farmer-s-carry` there and `farmers-carry` here. `motionIdOf()` bridges that
single case; the other 103 match exactly.

## Storage

All state is client-side, in `localStorage` under `workout.v1`: equipment setups,
the active setup, the selected muscles, the last generated plan, and saved
programs.
`lib/store.ts` is an external store read through `useSyncExternalStore`, so the
server renders defaults and the client swaps in saved state without a
setState-in-effect round trip. Blocked or private-mode storage is caught — the
app still works for that session.

## Programs

Bookmarking a generated session saves it as a program, listed under the Programs
tab. A saved program stays in step with its session: adding or removing an
exercise while it is open updates the program too.

## Navigation

Three tabs — Home, Programs, Equipment — on the top-level screens only; step and
detail screens get a back arrow and a home shortcut instead. Generating a session
**replaces** the equipment step in history, so going back from a built session
never returns to the generate screen, and backing out of the session goes home.

## Not built yet

The Atlas design also had a workout player (set tracking, sets/reps steppers),
per-program progress, and drag-to-reorder. The data model leaves room for them.
