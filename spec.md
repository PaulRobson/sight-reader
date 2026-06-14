# Sight-Reading Trainer — Build Spec & Todo List

A proof-of-concept web app that generates musical-sounding sight-reading exercises, renders them as sheet music, plays a reference recording matched to the player's instrument, runs a configurable preparation countdown, and lets the student self-assess afterward.

**Scope note:** This is a POC. No microphone/MIDI input, no automated performance scoring, no backend. All state is client-side (localStorage). Items explicitly out of scope are listed at the end so they don't get built by accident.

**Device note:** The primary target is an **iPad (tablet) in landscape on a music stand**, viewed from ~1–2 m away. Desktop shares that layout. Phone is supported as a graceful adaptation and must **not** compromise the tablet/desktop UI. Design for the large viewport first. Cross-cutting device requirements are in §9 and apply across all phases.

---

## 1. Recommended tech stack

- **Vite** (already set up) + **React + TypeScript** (use whatever the existing Vite template is; React + TS assumed below).
- **[abcjs](https://www.abcjs.net/) (v6.6.3, latest as of 2026-04-24)** — does notation rendering **and** audio synthesis in one library. This is the core dependency and the reason the architecture is simple. It handles:
  - SVG sheet-music rendering (`renderAbc`)
  - Audio playback via a built-in synth + General MIDI soundfont
  - Per-voice / per-playback transposition (for transposing instruments)
  - A built-in metronome count-in
  - Dynamics and articulation decorations (these render and partially affect playback)
- **localStorage** for settings, history, and saved pieces. No state library needed; plain React state + a thin persistence helper is fine.
- **Vitest** for unit tests (not yet installed; the first scaffolding task adds it plus a `verify:test` command). The pure logic is where the test value sits: PRNG, scale/chord model, rhythm cells, generator, serializer, transposition math, persistence, history aggregation.
- **Verify suite** (`assist.yml`) runs every session and is strict: `knip --treat-config-hints-as-errors` (fails on unused exports/deps), `biome` lint with `--error-on-warnings`, `jscpd` duplicate-code, circular-deps, and a maintainability threshold. Each `/loop` session must leave all of them green, which is why the build order below wires modules in as they are written rather than building unused code ahead of its consumer.

**abcjs gotchas to handle up front (these waste hours otherwise):**
- For a **Vite/npm import**, `import abcjs from 'abcjs'` (package `main: index.js`, v6.6.3) already includes audio synthesis at `abcjs.synth`; no special build is needed. The `abcjs-basic` vs `abcjs-plugin` split only matters for the prebuilt browser `<script>` bundles in `dist/` (`abcjs-basic-min.js` has audio; `abcjs-plugin-min.js` is the editor plugin). Gate audio on `abcjs.synth.supportsAudio()`.
- The synth must `prime()` (download soundfont samples) before playback; first play has noticeable latency. Show a loading spinner on the Play button during priming.
- Browser autoplay policy: audio can only start after a user gesture. The "Play reference" button is a gesture; the auto-start at end of countdown is **not**, so don't auto-play audio at countdown end — only show the "PLAY NOW" banner and (optionally) start the metronome, which must itself have been armed by the earlier user gesture. On iPad/iOS Safari this is stricter still — see §9 for the AudioContext-resume-on-tap requirement.
- Manage `AudioContext` state explicitly; a suspended context is a common silent-failure cause.
- **Synth API, verified against abcjs 6.6.3 docs (2026-06):** audio lives under `abcjs.synth`.
  - `abcjs.synth.supportsAudio()` — capability check; call before any audio setup.
  - Low-level: `const synth = new abcjs.synth.CreateSynth()`, then `await synth.init({ visualObj, audioContext, millisecondsPerMeasure, options })`, `await synth.prime()`, `synth.start()`. Also `stop()`, `pause()`, `resume()`, `seek(percent, units)`, `getAudioBuffer()`, `download()`. `init()` references an `AudioContext`, so it must run inside a user gesture. `options` carries `soundFontUrl`, `program`, `pan`, `fadeLength`, etc.
  - Widget (gives transport UI for free): `const ctl = new abcjs.synth.SynthController(); ctl.load(selector, cursorControl, { displayPlay, displayProgress, displayLoop, displayRestart, displayWarp }); await ctl.setTune(visualObj, userAction, audioParams)`; then `play()`, `pause()`, `restart()`, `toggleLoop()`, `setWarp(percent)`.
  - `abcjs.renderAbc(selector, abc, { responsive: "resize" })` returns the `visualObj[]` you feed to `init` / `setTune`.

---

## 2. Core data model

```ts
type Clef = "treble" | "bass" | "alto" | "tenor";
type Mode = "melodic" | "rhythm-only";

interface InstrumentDef {
  id: string;                 // "bflat-clarinet"
  name: string;               // "Clarinet in B♭"
  defaultClef: Clef;
  clefs: Clef[];              // piano = ["treble","bass"]
  // Transposition: semitone offset from WRITTEN pitch to SOUNDING pitch.
  // Concert-pitch instruments = 0. B♭ instruments = -2. See §6.
  soundingOffsetSemitones: number;
  gmProgram: number;          // General MIDI program number for timbre
  lowestWrittenNote: string;  // e.g. "E3" (scientific pitch notation)
  highestWrittenNote: string; // e.g. "C6"
  // Optional: reorder key difficulty so the instrument's most idiomatic
  // written keys come first. If absent, use the generic order.
  keyDifficultyOverride?: string[];
}

interface Settings {
  instrumentId: string;
  clef: Clef;                 // chosen from instrument.clefs
  grade: number;              // 1..8
  mode: Mode;
  countdownSeconds: number;   // default 60, configurable; 0 = skip
  metronomeOnAttempt: boolean;
  referenceAvailableBeforeAttempt: boolean; // default false (see §7)
}

interface GeneratedPiece {
  id: string;
  seed: number;               // so the exact piece is reproducible
  abc: string;                // full abcjs source string (written pitch)
  settingsSnapshot: Settings;
  createdAt: number;
}

interface AttemptLog {
  pieceId: string;
  ratedAt: number;
  pitch: 1 | 2 | 3 | 4 | 5;
  rhythm: 1 | 2 | 3 | 4 | 5;
  keptGoing: 1 | 2 | 3 | 4 | 5;   // did you stop/restart? cardinal sin of sight-reading
  dynamicsArticulation: 1 | 2 | 3 | 4 | 5;
  overallConfidence: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
```

The piece is stored as an **abcjs string at written pitch**. Transposition for playback is applied at synth time (§6), never baked into the stored notation.

---

## 3. Build order (the /loop task list)

**How to work this list.** Tasks are sized for a single `/loop` session: work top to bottom, complete one checkbox per session, and leave every `assist verify:*` command passing before marking it done. Slices 0–2 build one thin end-to-end path (the de-risking slice, §11); later slices add breadth. Conventions:

- `[test]` — ship Vitest unit tests with the code. Auto-verifiable; the pure logic lives here.
- `[manual]` — cannot be verified headlessly (sound, layout, iOS, readability from a stand). These are **grouped into a Manual checkpoints block at the end of each slice**: finish every auto-verifiable task in the slice first, then hand the whole manual batch back for one browser/iPad session. Do not mark them done unverified.
- Untagged tasks are covered by the existing verify suite (build, lint, knip, duplicate-code, circular-deps, maintainability) only.
- Introduce the §2 types alongside their first consumer, not as a standalone file: `knip` fails on unused exports, so every session must wire in what it builds.
- One commit per task.

### Slice 0 — Harness & scaffolding
- [x] Install Vitest; add a `verify:test` run command to `assist.yml`; add one trivial passing test. **Done:** `assist run verify:test` passes.
- [x] Fix `verify:circular-deps`: it points at `src/index.ts`, which does not exist (the entry is `src/main.tsx`). Point it at the real entry. **Done:** `verify:circular-deps` passes.
- [x] Strip the Vite starter (`App.tsx`, demo assets, CSS) down to an empty "Sight-Reading Trainer" shell. **Done:** blank shell renders; build + lint + knip clean with no orphaned starter assets.
- [x] `[test]` Seedable PRNG (mulberry32). Never use bare `Math.random()` for generation. **Done:** same seed reproduces the exact sequence; range + determinism tested.
- [x] `[test]` localStorage helper `load<T>(key, fallback)` / `save(key, value)`. **Done:** round-trip plus fallback on missing/corrupt value tested against a mock store.
- [x] `[test]` App view state machine `settings → prep → playNow → assess → history` as a typed hook/reducer. **Done:** transitions unit-tested; each state renders a placeholder.

### Slice 1 — abcjs spike + thin musical path
Hardcoded target throughout this slice: Piano, treble, grade 1, 4/4, C major, 4 bars. Build the auto-verifiable pieces first; the visual/audio confirmations are batched at the end.
- [x] Install `abcjs` 6.6.3 (the default npm import includes audio, §1). **Done:** build passes; a smoke test asserts `typeof abcjs.synth.CreateSynth === "function"`.
- [x] `[test]` Scale/key model: diatonic scale-degree set + chord tones (degrees 1, 3, 5) for a written key. **Done:** C major and one sharp/flat key give correct degrees; tested.
- [x] `[test]` Rhythm-cell library for 4/4 + a seeded weighted draw. **Done:** every cell sums to one bar; the draw is deterministic by seed; tested.
- [x] `[test]` Minimal melodic generator: stepwise-biased pitches over a generated rhythm, first note tonic, last note tonic approached by step, range clamp. **Done:** deterministic grade-1 C-major 4-bar piece, all notes in range, correct start/end; tested.
- [x] `[test]` Serializer: internal representation → abc string (header `X/T/M/L/K/Q/%%MIDI program` + barred note stream, written pitch only). **Done:** snapshot-tested; the string parses via `abcjs.parseOnly` with no warnings (headless, no DOM/jsdom needed — `renderAbc` requires a DOM, `parseOnly` is the parse-only path). Uses `L:1/16` so durations map to integer abc length multipliers; meter fixed at 4/4 until Slice 4 adds it to the model.
- [x] Render + Play wiring: render the current abc with `renderAbc` (`responsive: "resize"`) into the exercise view; wire a Play button to `CreateSynth` `init → prime → start` with a priming spinner; gate on `supportsAudio()` (§1). **Done:** build + lint pass (behaviour confirmed in the manual batch below).

**Manual checkpoints (verify together at the end of the slice):**
- [x] `[manual]` The hardcoded C-major piece renders as visible SVG in the exercise view.
- [x] `[manual]` Play produces audible sound (first tap primes with a visible spinner, then plays).
- [x] `[manual]` Switched to generator output, a grade-1 piece renders and reads as a simple, singable tune with a clear ending on C (ear check per §4).

### Slice 2 — Attempt flow around the thin path
- [x] "Let's go" generates + renders the piece and enters `prep`. **Done:** the button shows a fresh score.
- [x] `[test]` Countdown timer (default 60s, 0 = skip) with a Skip button. **Done:** counts down and Skip jumps to zero; logic tested with fake timers.
- [x] "PLAY NOW!" banner rendered on entering the `playNow` state (large, high-contrast). **Done:** banner element appears on the state transition; build + lint pass.
- [x] `[test]` Self-assessment form: the 5 `AttemptLog` dimensions + optional notes. **Done:** produces a valid `AttemptLog`; validation/state tested.
- [x] `[test]` Save attempt to localStorage keyed by `pieceId`; "Try again (same piece)" reuses the seed, "New piece" reseeds. **Done:** attempt persists; same seed regenerates identical abc; tested.
- [x] `[test]` History view: past attempts with date/grade/ratings + per-dimension average. **Done:** list renders; aggregation tested. (Grade is shown as the hardcoded thin-path grade 1: `AttemptLog` (§2) carries no grade and per-attempt grade only becomes real once Slice 3 persists settings/`GeneratedPiece`.)

**Manual checkpoints (end of slice):**
- [x] `[manual]` At countdown zero the "PLAY NOW!" banner is readable from music-stand distance.

> End of the de-risking slice: a usable piano/grade-1 loop. Everything below adds breadth.

### Slice 3 — Settings (replace the hardcoding)
- [x] `[test]` `InstrumentDef[]` table (§6): Trombone, Cello, Piano, Flute, Violin, Clarinet in B♭, Trumpet in B♭, Alto Sax (E♭), Guitar. **Done:** ranges parse as valid SPN, offsets present, clefs non-empty; tested.
- [x] Instrument picker wired to settings + persistence. **Done:** selection updates and persists.
- [x] Clef selector constrained to `instrument.clefs`; piano shows the grand staff.
- [x] Grade select 1–8.
- [x] Mode toggle: Melodic / Rhythm-only.
- [x] Countdown duration input (default 60s, 0 = skip).
- [x] Metronome-during-attempt toggle (default on).
- [x] Reference-before-attempt toggle (default off, §7).

**Manual checkpoints (end of slice):**
- [x] `[manual]` The settings panel renders, every control updates state, and choices survive a page reload.

### Slice 4 — Difficulty + richer generation (§4, §5)
- [x] `[test]` Grade→difficulty config object keyed 1–8 (§5).
- [x] `[test]` Generator consumes grade params (bars, time-sig set, key range, shortest note, max leap, tempo). **Done:** output respects each grade's constraints; tested per grade. (`generateForGrade` derives options from `gradeDifficulty`; meter selection collapses to 4/4 until the rhythm-cells task widens it. App wiring of `settings.grade` → generation is deferred to the Slice 4 manual checkpoint.)
- [x] `[test]` Leap-resolution rule: step in the opposite direction after a leap larger than a third.
- [ ] `[test]` Phrase structure + repetition/sequence schemes (AABA, diatonic sequence, vary), grade-selected.
- [ ] `[test]` Cadential logic: interior phrases land on degree 2 or 5, the final phrase on degree 1.
- [ ] `[test]` Rest insertion per the grade's rest probability.
- [ ] `[test]` Additional time signatures + their rhythm cells (3/4, 2/4, 6/8, and up per §5).
- [ ] `[test]` Accidentals / key-signature breadth per grade.

**Manual checkpoints (end of slice):**
- [ ] `[manual]` Spot-check generated pieces at grades 3, 5, and 8: each renders cleanly and sounds musical (ear check per §4).

### Slice 5 — Playback fidelity (§6)
- [ ] `[test]` Transposition math `soundingMidi = writtenMidi + soundingOffsetSemitones`, applied at synth time (`%%MIDI transpose` / synth option), never to the SVG. **Done:** offset math unit-tested across the §6 instruments.
- [ ] Set synth timbre from the instrument's GM program (`%%MIDI program` / `options.program`).
- [ ] Stop / replay controls.
- [ ] Attempt metronome: one-bar count-in then a steady click at the piece tempo, armed by the "Let's go" gesture.

**Manual checkpoints (end of slice):**
- [ ] `[manual]` Written C on a B♭ clarinet sounds as concert B♭; each instrument plays in its own timbre.
- [ ] `[manual]` The attempt metronome counts in one bar then clicks steadily at tempo.

### Slice 6 — Dynamics & articulation (§4 step 5)
- [ ] `[test]` Dynamics layer: phrase-start markings, grade-gated; serializer emits the correct abc decorations (`!p!`, `!f!`, `!crescendo(!`, …).
- [ ] `[test]` Articulation layer: slurs / staccato / accent / tenuto, grade-gated.

**Manual checkpoints (end of slice):**
- [ ] `[manual]` Dynamics and articulation render on the score and audibly affect playback where abcjs supports it.

### Slice 7 — Rhythm-only mode (§8)
- [ ] `[test]` Rhythm-only generation: reuse the rhythm cells, single fixed pitch, single-line presentation.
- [ ] Rhythm-only playback uses a woodblock/percussion timbre.

**Manual checkpoints (end of slice):**
- [ ] `[manual]` Rhythm-only mode shows a single-line staff and plays a percussion click with no pitch.

### Slice 8 — Tablet-first layout & iOS polish (§9)
Device work. Each concern is split into an auto implementation task (verified by build + lint, plus a unit test where one is meaningful) and a device check in the Manual checkpoints block. Build them in order; verify the batch together on an iPad in Safari.
- [ ] `[test]` Debounce util; wire debounced re-render of the score on resize / orientation change.
- [ ] Responsive layout: landscape score-dominant + slim rail; portrait stacked; phone single-column scroll. **Done:** layout implemented; build + lint pass.
- [ ] Countdown + "PLAY NOW!" banner styling, sized and high-contrast for music-stand distance. **Done:** styles implemented; build + lint pass.
- [ ] 44 pt touch targets; remove hover-only affordances; suppress double-tap zoom + stray text selection (`touch-action`, `user-select`). **Done:** implemented; build + lint pass.
- [ ] iOS AudioContext unlock: create/resume the context inside the Play and "Let's go" gestures. **Done:** unlock wired to those handlers; build + lint pass.
- [ ] `dvh` + `env(safe-area-inset-*)` handling so nothing sits under the notch / home indicator and `100vh` does not overflow. **Done:** implemented; build + lint pass.
- [ ] `[test]` Wake Lock helper: request during prep + attempt, release after; no-op where unsupported. **Done:** the unsupported path is tested (no throw); wired to prep/attempt.
- [ ] (Stretch) PWA manifest for full-screen "add to home screen". **Done:** manifest added; build passes.

**Manual checkpoints (verify on an iPad in Safari):**
- [ ] `[manual]` Layout holds: landscape score-dominant + slim rail, portrait stacked, phone single-column scroll.
- [ ] `[manual]` Score re-renders crisply on resize / orientation change.
- [ ] `[manual]` Countdown + "PLAY NOW!" banner legible from a stand.
- [ ] `[manual]` Touch targets comfortable; no double-tap zoom or stray selection on controls.
- [ ] `[manual]` Audio works on the iPad (AudioContext unlocked on first gesture), not just desktop.
- [ ] `[manual]` Nothing obscured by the notch / home indicator; height correct with no toolbar overflow.
- [ ] `[manual]` Wake Lock keeps the screen awake through prep + attempt.
- [ ] `[manual]` (Stretch) "Add to home screen" launches full-screen.

---

## 4. Generation algorithm (detail)

Generate at **written pitch in the chosen written key**. Structure the piece as **phrases** (default 4 bars), because phrase-level repetition is what makes output sound musical.

**Step 1 — Choose key & scale.** Pick a written key signature allowed by the grade (§5). Build the diatonic scale-degree set. Identify chord tones (degrees 1, 3, 5) for start/end anchoring.

**Step 2 — Choose rhythm per bar.** For each bar, draw a rhythmic cell from the library for the current time signature, weighted by grade (lower grades favour longer notes). A cell is an ordered list of durations summing to one bar, e.g. 4/4 cells: `[whole]`, `[half,half]`, `[quarter,quarter,half]`, `[quarter×4]`, and at higher grades `[eighth×2, quarter, quarter, ...]`, dotted figures, triplets, sixteenths. Insert rests by replacing some cell slots per the grade's rest probability.

**Step 3 — Assign pitches to rhythm slots** using these rules (in priority order):
1. **First note of the piece** = a chord tone (prefer the tonic).
2. **Last note of the piece** = tonic, ideally approached by step.
3. **Stepwise bias**: with probability `stepBias` (high at low grades) move by one scale step; otherwise leap.
4. **Leap size** capped at the grade's `maxIntervalSemitones`; at higher grades allow arpeggio-shaped leaps (stacked thirds).
5. **Leap resolution**: after a leap larger than a third, prefer a step in the *opposite* direction.
6. **Range clamp**: if a candidate note would exceed the instrument's written range, reflect direction inward.
7. **Cadential feel**: the last note of an interior phrase lands on degree 2 or 5 (half-cadence feel); the final phrase resolves to degree 1.

**Step 4 — Phrase repetition / sequence (do this; it's the magic).** For a 4-phrase piece, don't generate all phrases independently. Pick a scheme such as:
- **AABA**: generate A, repeat it, contrast with B, return to A.
- **Sequence**: take phrase A's contour and transpose it up/down a step for the next phrase (diatonic sequence).
- **Vary**: repeat A's rhythm but re-derive pitches, or vice versa.
Choose the scheme by grade (simpler/more literal repetition at low grades).

**Step 5 — Dynamics & articulation layer (grade-gated, see §5).**
- Place a dynamic marking at the start of each phrase (`f`/`p` at low grades; add `mf`/`mp`, then hairpin `cresc.`/`dim.` higher up).
- Add slurs over stepwise groups; staccato on detached repeated/leaping notes; accents/tenuto at higher grades.
- In abcjs these are decorations, e.g. `!p!`, `!f!`, `!mf!`, `!crescendo(!`/`!crescendo)!`, `!staccato!` (`.`), `!accent!`, slurs via `( ... )`.

**Step 6 — Serialize to abcjs.** Emit the header (`X`, `T`, `M` time sig, `L` default note length, `K` key + clef, `Q` tempo, `%%MIDI program <gmProgram>`) and the note stream with bar lines. Keep written pitch only.

> Output quality check: a generated grade-1 piece in C major should read like a simple, singable tune with a clear ending on C — not a random walk. If it sounds aimless, increase `stepBias` and lean harder on Step 4 repetition before adding complexity.

---

## 5. Grade → difficulty table (starting heuristic — tune freely)

Written-key counts are sharps-or-flats. Intervals are max melodic leap. This is a scaffold; expect to adjust by ear.

| Grade | Bars | Time sigs | Max key sig | Shortest note | Max leap | Tempo (BPM) | Dynamics | Articulation | Accidentals | Rests |
|-------|------|-----------|-------------|---------------|----------|-------------|----------|--------------|-------------|-------|
| 1 | 4–8 | 4/4, 3/4 | 0–1 | quarter | 3rd | 60–80 | f, p | none | none | whole/half |
| 2 | 8 | +2/4 | up to 2 | eighth (pairs) | 4th | 70–90 | +mf, mp | slurs | rare | +quarter |
| 3 | 8–12 | +6/8 | up to 3 | eighth + dotted | 5th | 80–100 | +cresc/dim | +staccato | passing | +eighth |
| 4 | 12 | +3/8 | up to 4 | eighth + light syncopation | 6th | 80–108 | hairpins | +accent, tenuto | occasional | varied |
| 5 | 12–16 | +cut, 9/8 | up to 5 | sixteenth, triplets | octave | 90–120 | full p–f | combined | regular | ties across bars |
| 6 | 16 | +12/8, 5/4 | up to 6 | dotted-eighth/sixteenth | octave+ | 100–132 | nuanced | combined | chromatic passing | syncopated |
| 7 | 16–20 | +irregular (opt.) | up to 7 | sixteenth groups | wide | 100–144 | full range | full palette | frequent | complex |
| 8 | 20+ | mixed/complex | up to 7 | double-dotted, complex | wide | varies | full range | full palette | modulation feel | complex |

Implement as a typed config object keyed by grade, so it's one place to tweak.

---

## 6. Transposing instruments (correctness-critical)

The student reads **written** notation, plays it on their instrument, and hears the **sounding** pitch. Reference playback must produce the **sounding** pitch so it matches reality.

**Rule:** `soundingMidi = writtenMidi + soundingOffsetSemitones`. Store and render at written pitch; apply the offset only at playback (e.g. abcjs `midiTranspose` / `%%MIDI transpose`, applied to the synth, **not** to the rendered SVG).

| Instrument | `soundingOffsetSemitones` | Note |
|------------|---------------------------|------|
| Piano, Flute, Violin, Cello, Oboe | 0 | concert pitch |
| Clarinet in B♭, Trumpet in B♭, Soprano/Tenor* sax | −2 | *tenor sax is actually −14 (octave + M2) |
| Alto Sax (E♭) | −9 | major 6th down |
| Horn in F | −7 | perfect 5th down |
| Guitar, Bass guitar, Double bass | −12 | sounds an octave below written |
| Piccolo | +12 | sounds an octave above written |

**Key-signature ordering caveat (this trips people up):** "easiest key" means fewest accidentals in the **written** part. For a B♭ instrument, the easiest *written* key is **C major** — which *sounds* in B♭ major. So your earlier "B♭ clarinet defaults to B♭ major" intuition should be implemented as "defaults to written C major." Use `keyDifficultyOverride` only if you want to bias toward an instrument's idiomatic written keys; otherwise the generic order is fine.

> abcjs caveat from the changelog: octave clefs (e.g. `clef=treble-8`) already shift the sound by an octave on their own. If you use those, don't double-count the octave in `soundingOffsetSemitones`.

---

## 7. Countdown & attempt flow (detail)

1. **"Let's go"** → generate + render the piece. The student *sees* it during prep (real sight-reading gives you a scan window — this is deliberate).
2. **Prep countdown** runs (default 60s, configurable, Skip button). On-screen scan reminders are optional (key sig, time sig, accidentals, tricky bars).
3. **At zero** → big **"PLAY NOW!"** banner, sized to read from across a room (the tablet is on a stand a metre or two away). If metronome-on-attempt is enabled, give a one-bar count-in of clicks, then a steady click at the piece's tempo. Do **not** auto-play the synth reference here (that's cheating, and also blocked by autoplay policy).
4. **Student plays** (acoustically — app isn't listening in this POC).
5. **Self-assessment** form appears (the 5 dimensions). The **"Play reference"** button becomes available here by default, so the student can compare *after* attempting. If `referenceAvailableBeforeAttempt` is on, it's available during prep too.
6. **Save** attempt; offer **"Try again (same piece)"** (re-uses seed → identical notation, lets them measure improvement on the same material) and **"New piece."**

---

## 8. Rhythm-only mode (detail)

- Reuse the rhythm-cell generation from §4 Step 2; skip pitch assignment.
- Present on a single line / one fixed pitch (e.g. a percussion or single-line staff), so the student reads rhythm without pitch distraction.
- Reference playback uses a click/woodblock timbre (a percussion GM program or the metronome sound) instead of a melodic instrument.
- Transposition is irrelevant in this mode (no pitch).

---

## 9. Device targets & responsive layout (tablet-first)

**Primary target: iPad (tablet) in landscape on a music stand, viewed from ~1–2 m away.** Desktop shares this layout. Phone is supported as a graceful adaptation and must **not** constrain the tablet/desktop design — build for the large viewport first, then degrade.

**Readability at music-stand distance (the dominant constraint):**
- Render the score large. Use `renderAbc` with `responsive: "resize"` so the SVG fills the container width, and tune `scale` / `staffwidth` so a grade-appropriate number of bars fit per line while staying legible from across the room. Sanity-check by literally standing back from the screen.
- The countdown timer and the **"PLAY NOW!"** banner must be readable at that distance: very large, high-contrast, ideally full-width. These are glance-able signals, not fine print.
- Primary controls (Play reference, New piece, Skip, Try again) large and unmissable.

**Responsive layout:**
- **Tablet/desktop landscape:** score is dominant; controls live in a slim side rail or top/bottom bar that never crowds the staff.
- **Portrait (tablet or phone):** stack vertically — compact controls top and/or bottom, score fills the remaining height.
- **Phone:** smaller score with vertical scroll through systems; single column. Do not shrink tablet touch targets to make a phone layout fit.
- Re-render the abcjs SVG on resize and orientation change (debounced). abcjs lays out to a fixed result per call, so a width change needs a genuine re-render, not just CSS scaling.

**Touch & input:**
- Minimum 44×44 pt touch targets (Apple HIG). No hover-only affordances or tooltips — everything must work on a single tap.
- Suppress double-tap-to-zoom and accidental text selection on controls (`touch-action`, `user-select: none`). Decide deliberately whether to allow pinch-zoom on the *score* (reasonable) while keeping the surrounding chrome non-zoomable.

**iOS Safari specifics (iPad = Safari, so these are not optional):**
- **AudioContext unlock:** create/resume the `AudioContext` inside a user gesture. Tie synth init + `prime()` + `audioContext.resume()` to the "Play reference" tap, and arm the attempt metronome on the "Let's go" tap (both are gestures). Without this, audio is silent on iOS even when it works on desktop. (Reinforces the §1 autoplay note.)
- **Viewport height:** use `dvh` units or `visualViewport`, not `100vh` — Safari's toolbar makes `100vh` overflow and shift.
- **Safe-area insets:** honour `env(safe-area-inset-*)` so controls don't sit under the notch / home indicator.
- **Keep the screen awake:** request a **Wake Lock** during the prep countdown and attempt so the iPad doesn't dim or sleep mid-read; release it afterward. Supported in Safari 16.4+; degrade gracefully (no-op) where unsupported.
- **Optional/stretch:** a PWA manifest + "Add to Home Screen" gives a chrome-less full-screen practice surface — a genuinely good fit for a stand.

**Orientation:** support both; landscape is the expected stand orientation, but portrait must remain usable. Re-render the score on orientation change.

---

## 10. Out of scope for this POC (do NOT build)

These are deliberately excluded to keep the POC small. Note them so they aren't added speculatively:
- Microphone pitch detection or MIDI input.
- Automated performance scoring (only self-assessment exists here).
- Follow-along cursor during the *attempt* (it undermines the skill of keeping your place). A cursor during *reference playback* is fine and optional.
- Accounts, backend, sync, teacher/assignment features.
- PDF/MusicXML export (the abc string is already a portable representation if needed later).

---

## 11. De-risking note

The thin end-to-end path is **Slices 0–2** of §3: scaffolding, the abcjs spike, and the attempt flow around a hardcoded grade-1 piano piece. Build those in order before any breadth (instruments, grades, transposition, dynamics, rhythm-only). Getting the synth to make sound at all is historically the riskiest part, which is why the spike sits in Slice 1. Once that loop works and sounds musical, the remaining slices expand it.
