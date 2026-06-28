import { describe, expect, it } from "vitest";
import { keyLabel } from "./keyLabel.ts";

const abc = (key: string) => `X:1\nM:4/4\nL:1/16\nK:${key}\nC4`;

describe("keyLabel", () => {
	it("labels major keys", () => {
		expect(keyLabel(abc("C clef=treble"))).toBe("C major");
		expect(keyLabel(abc("Bb clef=bass"))).toBe("B♭ major");
		expect(keyLabel(abc("F#"))).toBe("F♯ major");
	});

	it("labels minor keys", () => {
		expect(keyLabel(abc("Am"))).toBe("A minor");
		expect(keyLabel(abc("F#m"))).toBe("F♯ minor");
		expect(keyLabel(abc("Bbm clef=treble"))).toBe("B♭ minor");
	});

	it("returns null without a key header", () => {
		expect(keyLabel("X:1\nM:4/4\nC4")).toBeNull();
	});
});
