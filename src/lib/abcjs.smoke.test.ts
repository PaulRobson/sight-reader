import abcjs from "abcjs";
import { expect, it } from "vitest";

it("exposes the synth audio API (abcjs npm import includes audio)", () => {
	expect(typeof abcjs.synth.CreateSynth).toBe("function");
	expect(typeof abcjs.synth.supportsAudio).toBe("function");
	expect(typeof abcjs.renderAbc).toBe("function");
});
