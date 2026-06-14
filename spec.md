# Sight-Reading Trainer — Build Spec & Todo List

A proof-of-concept web app that generates musical-sounding sight-reading exercises, renders them as sheet music, plays a reference recording matched to the player's instrument, runs a configurable preparation countdown, and lets the student self-assess afterward.

**Scope note:** This is a POC. No microphone/MIDI input, no automated performance scoring, no backend. All state is client-side (localStorage). Items explicitly out of scope are listed at the end so they don't get built by accident.

**Device note:** The primary target is an **iPad (tablet) in landscape on a music stand**, viewed from ~1–2 m away. Desktop shares that layout. Phone is supported as a graceful adaptation and must **not** compromise the tablet/desktop UI. Design for the large viewport first. Cross-cutting device requirements are in §9 and apply across all phases.

---

## 1. Recommended tech stack

- **Vite** (already set up) + **React + TypeScript** (use whatever the existing Vite template is; React + TS assumed below).
- **[abcjs](https://www.abcjs.net/) (v6.x)** — does notation rendering **and** audio synthesis in one library. This is the core dependency and the reason the architecture is simple. It handles:
  - SVG sheet-music rendering (`renderAbc`)
  - Audio playback via a built-in synth + General MIDI soundfont
  - Per-voice / per-playback transposition (for transposing instruments)
  - A built-in metronome count-in
  - Dynamics and articulation decorations (these render and partially affect playback)
- **localStorage** for settings, history, and saved pieces. No state library needed; plain React state + a thin persistence helper is fine.

**abcjs gotchas to handle up front (these waste hours otherwise):**
- Use the **`abcjs-basic`** build, not the render-only build, or audio silently does nothing.
- The synth must `prime()` (download soundfont samples) before playback; first play has noticeable latency. Show a loading spinner on the Play button during priming.
- Browser autoplay policy: audio can only start after a user gesture. The "Play reference" button is a gesture; the auto-start at end of countdown is **not**, so don't auto-play audio at countdown end — only show the "PLAY NOW" banner and (optionally) start the metronome, which must itself have been armed by the earlier user gesture. On iPad/iOS Safari this is stricter still — see §9 for the AudioContext-resume-on-tap requirement.
- Manage `AudioContext` state explicitly; a suspended context is a common silent-failure cause.
- The exact synth API (`CreateSynth`, `init`, `prime`, `start`, `SynthController`) should be confirmed against current docs at https://docs.abcjs.net/ — treat any API names here as indicative, not authoritative.

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

## 3. Build phases (todo list)

### Phase 0 — Scaffolding
- [ ] Install `abcjs`; confirm the `-basic` build is what's imported.
- [ ] Set up app shell: Settings panel ➜ Exercise view, with routing or simple view state.
- [ ] localStorage persistence helper (`load<T>(key, fallback)`, `save(key, value)`).
- [ ] Seedable PRNG (e.g. mulberry32) so `GeneratedPiece.seed` reproduces a piece exactly. Do **not** use bare `Math.random()` for generation.

### Phase 1 — Settings
- [ ] Instrument picker, backed by an `InstrumentDef[]` table (§6). Start with: Trombone, Cello, Piano, Flute, Violin, Clarinet in B♭, Trumpet in B♭, Alto Sax (E♭), Guitar.
- [ ] Clef selector (constrained to the instrument's `clefs`; piano shows grand staff).
- [ ] Grade slider/select 1–8 (drives the difficulty table in §5).
- [ ] Mode toggle: Melodic / Rhythm-only.
- [ ] Countdown duration input (default 60s, allow 0 = skip).
- [ ] Toggle: metronome during attempt (default on).
- [ ] Toggle: allow reference playback before attempt (default off — see §7).
- [ ] Persist all settings to localStorage.

### Phase 2 — Generation engine (the heart of it — see §4)
- [ ] Difficulty config table mapping grade ➜ parameters (§5).
- [ ] Rhythm-cell library per time signature.
- [ ] Melodic generator with stepwise bias, leap resolution, phrase structure, motif repetition/sequence, start/end on chord tones.
- [ ] Range clamping to the instrument's written range.
- [ ] Dynamics & articulation layer (grade-gated).
- [ ] Serializer: internal representation ➜ abcjs string.
- [ ] Rhythm-only variant: single fixed pitch, rhythm cells only, percussion/rhythm presentation.

### Phase 3 — Render & playback
- [ ] Render the abc string to SVG with `renderAbc` into the exercise view (use the `responsive: "resize"` option so it scales to the container — see §9).
- [ ] "Play reference" button: init synth, `prime()` (with spinner), play.
- [ ] Apply instrument transposition to playback so the sounding pitch matches what the student would hear on their instrument (§6).
- [ ] Set synth timbre from the instrument's GM program.
- [ ] Stop/replay controls.

### Phase 4 — Countdown & attempt flow (§7)
- [ ] On "Let's go": generate piece, render it immediately (student reads during prep), start countdown.
- [ ] Visible countdown timer with a Skip button.
- [ ] At zero: large "PLAY NOW!" banner; if metronome-on-attempt, start a count-in (one bar of clicks) then a steady click at the piece tempo.
- [ ] "New piece" / "Try again (same piece)" controls. "Same piece" re-uses the stored seed.

### Phase 5 — Self-assessment & history
- [ ] After the attempt, show the self-assessment form (the 5 dimensions in `AttemptLog`).
- [ ] Save attempt to localStorage, linked to `pieceId`.
- [ ] Simple history view: list of past attempts with date, grade, and ratings; show trend (even just average-over-time per dimension).

### Phase 6 — Tablet-first layout & iOS polish (§9)
- [ ] Responsive layout: landscape = score-dominant with a slim controls rail; portrait = stacked; phone = single column with scroll.
- [ ] Re-render the score on resize/orientation change (debounced).
- [ ] Large, high-contrast countdown timer and "PLAY NOW!" banner, readable from music-stand distance.
- [ ] 44 pt touch targets; no hover-only UI; suppress double-tap zoom and stray text selection.
- [ ] iOS audio unlock on user gesture; `dvh` + safe-area handling; Wake Lock during prep + attempt.
- [ ] (Stretch) PWA manifest for full-screen "add to home screen" practice.

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

## 11. Suggested first vertical slice (to de-risk)

Before building the full grade table, get one thin path working end to end:
1. Hardcode: Piano, treble clef, grade 1, 4/4, C major, 4 bars.
2. Generate with stepwise bias + start/end on C, serialize to abc, render.
3. Wire `prime()` + Play with a spinner; confirm audio actually sounds.
4. Add the 60s countdown + "PLAY NOW" banner.
5. Add the self-assessment form + localStorage history.

Once that loop works and *sounds musical*, expand the instrument table, grades, transposition, dynamics/articulation, and rhythm-only mode. Getting audio to make sound at all is historically the riskiest part — do it early.
