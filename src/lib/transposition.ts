import type { InstrumentDef } from "./instruments.ts";

// §6: the student reads written pitch and hears the sounding (concert) pitch, so
// reference playback must shift by the instrument's offset to match what the
// instrument produces. The shift touches the synth only, never the rendered SVG.
export const transposition = {
	// soundingMidi = writtenMidi + soundingOffsetSemitones.
	soundingMidi(writtenMidi: number, offsetSemitones: number): number {
		return writtenMidi + offsetSemitones;
	},
	// The constant transpose handed to the abcjs synth (midiTranspose). The shift
	// is the same for every note, so it equals how far written MIDI 0 moves.
	synthMidiTranspose(instrument: InstrumentDef): number {
		return transposition.soundingMidi(0, instrument.soundingOffsetSemitones);
	},
};
