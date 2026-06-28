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
  grade: number;              // grade the piece was generated at
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
- [x] `[test]` History view: past attempts with date/grade/ratings + per-dimension average. **Done:** list renders; aggregation tested. `AttemptLog` (§2) now carries `grade`, captured from `settings.grade` when the piece is generated and shown per attempt. Each attempt also saves the piece (`abc` + `instrumentId`); a per-item "Show piece" toggle (`HistoryItem`) re-renders the score and offers playback via `ExerciseView`, so past pieces can be reviewed and replayed (attempts saved before this carry no piece and show no toggle).

**Manual checkpoints (end of slice):**
- [x] `[manual]` At countdown zero the "PLAY NOW!" banner is readable from music-stand distance.

> End of the de-risking slice: a usable piano/grade-1 loop. Everything below adds breadth.

### Slice 3 — Settings (replace the hardcoding)
- [x] `[test]` `InstrumentDef[]` table (§6): Trombone, Cello, Piano, Flute, Violin, Clarinet in B♭, Trumpet in B♭, Alto Sax (E♭), Guitar. **Done:** ranges parse as valid SPN, offsets present, clefs non-empty; tested.
- [x] Instrument picker wired to settings + persistence. **Done:** selection updates and persists.
- [x] Clef selector constrained to `instrument.clefs`; piano shows the grand staff. **Updated:** piano now renders on a **single staff** with the chosen clef (its clef selector offers treble/bass), not a grand staff — splitting a single melodic line at middle C left one staff mostly empty, which didn't read as real piano writing. The grand-staff path (`splitGrandStaff`, `isGrandStaff`, `toAbc`'s `grandStaff` option, `GRAND_STAFF_CENTER`) was removed; tessitura now centres on the chosen clef's staff like every other instrument. The Slice 6 notes below still mention `splitGrandStaff` (historical — that code is gone).
- [x] Grade select 1–8.
- [x] Mode toggle: Melodic / Rhythm-only.
- [x] Countdown duration input (default 60s, 0 = skip).
- [x] Metronome-during-attempt toggle (default on).
- [x] Reference-before-attempt toggle (default off, §7).

**Manual checkpoints (end of slice):**
- [x] `[manual]` The settings panel renders, every control updates state, and choices survive a page reload.

### Slice 4 — Difficulty + richer generation (§4, §5)
- [x] `[test]` Grade→difficulty config object keyed 1–8 (§5).
- [x] `[test]` Generator consumes grade params (bars, time-sig set, key range, shortest note, max leap, tempo). **Done:** output respects each grade's constraints; tested per grade. (`generateForGrade` derives options from `gradeDifficulty`; meter selection now spans all §5 signatures via the rhythm-cells task below. App wiring of `settings.grade` → generation is deferred to the Slice 4 manual checkpoint.)
- [x] `[test]` Leap-resolution rule: step in the opposite direction after a leap larger than a third.
- [x] `[test]` Phrase structure + repetition/sequence schemes (AABA, diatonic sequence, vary), grade-selected. **Done:** `generatePhrased` builds a piece from 4-bar phrases (`planPhrases.ts`); `generateForGrade` snaps the bar count to a phrase multiple (every grade's bar min/max are multiples of 4, so it stays in range) and picks the scheme via `schemeForGrade` (1–2 AABA, 3–5 sequence, 6–8 vary). Repetition is of *contour* (relative shape) joined continuously, not absolute pitch, so every interval — including phrase joins — stays within the grade's `maxLeap`; tested. Cadential/rest/time-sig/accidental breadth remain later tasks.
- [x] `[test]` Cadential logic: interior phrases land on degree 2 or 5, the final phrase on degree 1. **Done:** `pitchSpace` exposes degree-2/5 `cadenceTargets`; `realize` snaps each interior phrase's last note to the nearest target within `maxLeap` (half-cadence feel without breaking the leap bound), while the final phrase still resolves to degree 1 via `finalizeCadence`. Tested across all three schemes.
- [x] `[test]` Rest insertion per the grade's rest probability. **Done:** `insertRests` flags interior note slots as rests at the grade's `restProbability` (first/last slots stay pitched so the piece opens and resolves on a real note; duration and underlying pitch are retained so the melodic walk and range/leap invariants are unaffected). Wired into `generateForGrade`; `toAbc` emits `z` tokens for rests. Tested (insertRests determinism/proportion/endpoints, abc serialization, grade wiring). `preventFullBarRests` then eliminates whole-bar rests entirely (a bar of silence reads as a gap in a short exercise) by restoring the first slot of any all-rest bar to its retained pitch; tested. Per-slot `restProbability` is a flat 0.1 across all grades (rests aren't a difficulty axis), so rests stay occasional rather than pervasive.
- [x] `[test]` Additional time signatures + their rhythm cells (3/4, 2/4, 6/8, and up per §5). **Done:** `rhythm.meters` registry covers every §5 time signature (4/4, 3/4, 2/4, 6/8, 3/8, 2/2, 9/8, 12/8, 5/4, 7/8, 5/8) with bar-summing cells; `rhythm.restrict` prunes cells finer than the grade's shortest note (whole-bar cell always survives). Meter threads through `GeneratorOptions.meter` → `generatePhrased`/`planPhrases`/`generateMelody` (4/4 default keeps the thin path unchanged); `generateForGrade` picks from the grade's allowed signatures and sets `barUnits`; `toAbc` emits the `M:` header. Tested (registry coverage, cell sums, restrict, meter variety + barUnits, compound-meter serialization). **Rhythm vocabulary** widens with grade: each library carries eighth runs, syncopation, dotted-quarter, dotted-eighth/sixteenth, and sixteenth figures, gated by `restrict` on the grade's shortest note (g1 quarter+, g2–4 add eighths/syncopation/dotted, g5–8 add sixteenths). **Triplets are deferred:** the duration grid is integer sixteenths (`L:1/16`), which cannot express tuplets; supporting them needs a finer base grid (e.g. 1/48) or abc tuplet (`(3`) handling — a separate change.
- [x] `[test]` Accidentals / key-signature breadth per grade. **Done:** `keys` model groups written keys by signature size; `keys.pick` chooses a key within the grade's `maxKeyAccidentals` (seeded). `generateForGrade` derives the key per grade when none is passed (explicit `key` still honoured, so the C-pinned generator tests stand). `insertAccidentals` chromatically inflects interior notes at the grade's `accidentals` breadth — a semitone neighbour spelled with a single ♯/♭, range-safe, leaving the opening note and the final two-note cadence diatonic. `toAbc` now renders key-signature-aware accidentals (explicit token only when a note deviates from the key sig or an earlier accidental that bar; resets at the bar line). Tested (key breadth per grade + override, chromatic insertion none-vs-modulation, abc accidental rendering + parse).

**Manual checkpoints (end of slice):**
- [x] `[manual]` Spot-check generated pieces at grades 3, 5, and 8: each renders cleanly and sounds musical (ear check per §4). **Verified** in browser after fixes: score wrapping, piano grand staff, web-checked instrument ranges, grade-scaled comfortable tessitura, collapsed full-bar rests, beamed eighth/sixteenth runs, and the no-two-full-bar-rests-in-a-row rule.

### Slice 5 — Playback fidelity (§6)
- [x] `[test]` Transposition math `soundingMidi = writtenMidi + soundingOffsetSemitones`, applied at synth time (`%%MIDI transpose` / synth option), never to the SVG. **Done:** `transposition` (`soundingMidi` + `synthMidiTranspose`) implements the §6 math; the offset is applied via the abcjs synth `midiTranspose` option in `useReferenceAudio` (synth only, never the rendered SVG), threaded from `App` per the chosen instrument. Offset math unit-tested across the §6 instruments. (App's `<nav>` extracted to a `Controls` component to keep `App` under the maintainability threshold.)
- [x] Set synth timbre from the instrument's GM program (`%%MIDI program` / `options.program`). **Done:** `pieceForSettings` threads the chosen instrument's `gmProgram` into `toAbc`, so the `%%MIDI program` header carries the timbre; the synth reads it from the parsed tune (`init`'s `visualObj`), no separate `options.program` needed. Tested: the emitted abc carries each instrument's GM program.
- [x] Stop / replay controls. **Done:** the existing Play-reference button (`ExerciseView`) is a Play/Stop toggle: it reads "Stop" and calls `stop()` while playing, and `play()` always builds a fresh synth from the top, so tapping it again after a stop or natural end (`onEnded` → idle) replays from the beginning. No separate replay button — it would duplicate behaviour already present.
- [x] Attempt metronome: one-bar count-in then a steady click at the piece tempo, armed by the "Let's go" gesture. **Done:** `useMetronome` is a Web Audio lookahead scheduler that plays a **one-bar count-in** (accented downbeat, plain clicks after) and then stops, so the student plays the piece unaccompanied. (Decision: count-in only rather than the spec's "steady click through the attempt" — the steady click was distracting; revisit if a play-along click is wanted.) `useAttemptMetronome` drives it from view state — count-in fires on entering `playNow` when `metronomeOnAttempt` is on, cleanup stops it if the view leaves mid-count — and returns `arm()`, called inside the "Let's go" gesture to unlock iOS audio before the (non-gesture) countdown-zero start. `beatSpecFromAbc` derives the click interval + beats-per-bar from the tune's `M:`/`Q:1/4=` headers, counting every notated beat unit — the denominator's note value, numerator times (so 6/8 clicks all six eighths, 2/2 two halves); tested. Hook audio is covered by the Slice 5 manual checkpoint.

**Manual checkpoints (end of slice):**
- [x] `[manual]` Written C on a B♭ clarinet sounds as concert B♭; each instrument plays in its own timbre. **Verified.**
- [x] `[manual]` The attempt metronome plays a one-bar count-in at the piece tempo (every notated beat, e.g. all six eighths in 6/8) then stops so the student plays unaccompanied. **Verified.** (Changed from the original "then clicks steadily" design by request.)

### Slice 6 — Dynamics & articulation (§4 step 5)
- [x] `[test]` Dynamics layer: phrase-start markings, grade-gated; serializer emits the correct abc decorations (`!p!`, `!f!`, `!crescendo(!`, …). **Done:** `applyDynamics` places one marking from the grade's `dynamics` vocabulary at each phrase's first sounding note — static words (`p`..`ff`) as a single decoration, `cresc`/`dim` as a hairpin opening there and closing on the phrase's last sounding note; the opening phrase is always a static level and all-rest phrases are skipped. Phrase-start indices come from each `PhraseSpan`'s note count (length-preserved through rest/accidental insertion). `Note.decorations` carries abc tokens; `noteStream` wraps them `!…!` (and `splitGrandStaff` drops them on the mirrored rest so a dynamic never doubles). Tested: placement, grade gating (no hairpins where the vocab lacks them), hairpin open/close pairing, rest anchoring, determinism, plus generateForGrade output serialising + parsing warning-free.
- [x] `[test]` Articulation layer: slurs / staccato / accent / tenuto, grade-gated. **Done:** `applyArticulations` slurs maximal stepwise runs (chunked to ≤4 notes, never crossing the middle-C staff split so grand-staff parens stay balanced), then gives each remaining non-slurred note at most one point mark from the grade's `articulations` — staccato on a detached repeat/leap, accent on a leap arrival, tenuto on a held note. `Note` gains `slurStart`/`slurEnd`; `noteStream` emits `( … )` for slurs and maps `staccato`→`.` (abc has no `!staccato!`), wrapping `accent`/`tenuto` as `!…!`; `splitGrandStaff` drops slur/decoration flags on the mirrored rest. Grade 1 (empty vocab) gets none. Tested: slur grouping/capping/no-cross, point-mark eligibility, slurred notes never point-marked, determinism, abc serialization + warning-free parse.

**Manual checkpoints (end of slice):**
- [x] `[manual]` Dynamics and articulation render on the score and audibly affect playback where abcjs supports it. **Verified.**

### Slice 7 — Rhythm-only mode (§8)
- [x] `[test]` Rhythm-only generation: reuse the rhythm cells, single fixed pitch, single-line presentation. **Done:** `generateRhythm` reuses the grade's rhythm-cell draw (the bars/tempo/time-sig/restricted-meter step is now the shared `gradeRhythmPlan`, also feeding `generateForGrade` so its output is unchanged), skips pitch assignment, and fixes every slot to B4 — the pitch that sits on the single percussion-clef line (abcjs perc pitch 6). Key is C (no signature) with no dynamics/articulation/accidentals (melodic concerns). `toAbc` gains a `percussion` option emitting `K:C clef=perc stafflines=1` (single line, never a grand staff); `pieceForSettings` routes `mode === "rhythm-only"` through it for any instrument. Tested: fixed-pitch/no-rests invariant, grade-scaled rhythm vocabulary (quarters-only g1, sixteenths reachable g5+), bar/tempo/meter bounds, determinism, and warning-free perc-staff serialization across grades. Reference timbre stays the instrument's GM program until the next task swaps it for a woodblock.
- [x] Rhythm-only playback uses a woodblock/percussion timbre. **Done:** rhythm-only pieces emit `%%MIDI program 115` (GM 116 Woodblock, abcjs's `woodblock` sample) instead of the instrument's melodic program, so the reference plays a near-pitchless click — rhythm without pitch (§8). The constant `RHYTHM_GM_PROGRAM` lives with the rhythm-only generator; `pieceForSettings` passes it through `toAbc` for `mode === "rhythm-only"`. Tested: the rhythm-only abc's only `%%MIDI program` directive is 115 across instruments/seeds. (Instrument transposition still reaches the synth but is inaudible on a woodblock and irrelevant per §8; left untouched to avoid threading mode through the history-replay path.) Audible confirmation is the Slice 7 manual checkpoint.

**Manual checkpoints (end of slice):**
- [x] `[manual]` Rhythm-only mode shows a single-line staff and plays a percussion click with no pitch. **Verified.**

### Slice 8 — Tablet-first layout & iOS polish (§9)
Device work. Each concern is split into an auto implementation task (verified by build + lint, plus a unit test where one is meaningful) and a device check in the Manual checkpoints block. Build them in order; verify the batch together on an iPad in Safari.
- [x] `[test]` Debounce util; wire debounced re-render of the score on resize / orientation change. **Done:** `debounce(fn, ms)` is a trailing-edge debounce with `cancel()` (unit-tested: burst collapse, latest-args, timer restart, separate bursts, cancel); `ExerciseView`'s render effect now re-runs `renderAbc` on debounced (150ms) `resize`/`orientationchange`, removing the listeners and cancelling any pending call on cleanup. Re-layout (not just CSS scaling) is needed because abcjs lays out to a fixed width per call (§9). Crisp re-render on rotate is the Slice 8 manual checkpoint.
- [x] Responsive layout: landscape score-dominant + slim rail; portrait stacked; phone single-column scroll. **Done:** the base layout is a stacked single column (portrait + phone), with a `@media (max-width: 540px)` phone tier tightening spacing/padding (touch targets unchanged) and content scrolling vertically. `@media (orientation: landscape) and (min-width: 768px)` widens `main` to 80rem so the score uses more width and renders larger (abcjs scales the SVG to container width), with controls staying a slim bottom bar — the spec's "top/bottom bar" option rather than a side rail, chosen to avoid restructuring the per-view component tree. Verified by build + lint; the on-device feel is the manual checkpoint.
- [x] Countdown + "PLAY NOW!" banner styling, sized and high-contrast for music-stand distance. **Done:** `.countdown-value` (`clamp(4rem, 20vw, 12rem)`) and `.play-now-banner` (`clamp(3rem, 14vw, 9rem)`, ink-on-paper, full-width) are large high-contrast glance signals; build + lint pass.
- [x] 44 pt touch targets; remove hover-only affordances; suppress double-tap zoom + stray text selection (`touch-action`, `user-select`). **Done:** buttons are `min-height/min-width: 44px` (rating options 2.75rem); `touch-action: manipulation` on buttons + tappable labels stops double-tap zoom; `user-select: none` on buttons, tappable labels and glance signals stops stray selection (inputs/textarea keep selection). No affordance is hover-only — hover only restyles, never reveals info. Build + lint pass.
- [x] iOS AudioContext unlock: create/resume the context inside the Play and "Let's go" gestures. **Done:** `useReferenceAudio.play()` creates + `resume()`s the `AudioContext` inside the Play tap; the attempt metronome is `arm()`ed inside the "Let's go" handler (`App.handleStart`). Both are user gestures, so audio unlocks on iOS (wired in earlier slices; confirmed in place here).
- [x] `dvh` + `env(safe-area-inset-*)` handling so nothing sits under the notch / home indicator and `100vh` does not overflow. **Done:** `main` uses `min-height: 100dvh` (no `100vh` overflow under Safari's toolbar) and per-side `padding: max(1.5rem, env(safe-area-inset-*))` so content clears the notch / home indicator; the phone tier keeps the safe-area `max()` at tighter base padding. `index.html` viewport carries `viewport-fit=cover` so the insets are non-zero. Build + lint pass.
- [x] `[test]` Wake Lock helper: request during prep + attempt, release after; no-op where unsupported. **Done:** `keepAwake()` requests a `screen` wake lock, re-acquires it on `visibilitychange` (browsers drop it when hidden), and `release()` stops re-acquiring + drops it; it returns a no-op handle where `navigator.wakeLock`/`document` are absent (never throws — unit-tested). The `useWakeLock(active)` hook holds it while `view` is `prep` or `playNow` and releases on exit/unmount (wired in `App`).
- [x] (Stretch) PWA manifest for full-screen "add to home screen". **Done:** `public/manifest.webmanifest` (standalone display, app palette, SVG icon) + `public/icon.svg`, linked from `index.html` along with `apple-mobile-web-app-capable`/title/status-bar and `apple-touch-icon` for iOS add-to-home. Build emits both into `dist/` and the built HTML references them.

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

**Step 1 — Choose key & scale.** Pick a written key signature allowed by the grade (§5). Build the diatonic scale-degree set. Identify chord tones (degrees 1, 3, 5) for start/end anchoring. **Major or minor:** keys are major or (~40% of the time, seeded) natural minor, chosen across all grades; a minor key carries a trailing `m` (`"Am"`), uses its relative-major signature (so it fits the same `maxKeyAccidentals` tiers), and gets harmonic-minor cadences — the ♭7 is raised to a leading tone wherever it resolves up by step to the tonic (`raiseLeadingTones`), rendered as an explicit accidental. Melodic minor and church modes are out of scope.

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
- Place a dynamic marking at the start of each phrase (`f`/`p` at low grades; add `mf`/`mp`, then hairpin `cresc.`/`dim.` higher up). A hairpin spans at most 2 bars and resolves to a stated destination level (e.g. `cresc.` → `f`) so the swell has a defined target.
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
