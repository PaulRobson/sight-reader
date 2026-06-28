import { findInstrument } from "./instruments.ts";
import { transposition } from "./transposition.ts";

// Sounding-pitch transpose for the synth (§6); the score stays at written pitch.
export function midiTransposeForInstrument(instrumentId: string): number {
	return transposition.synthMidiTranspose(findInstrument(instrumentId));
}
