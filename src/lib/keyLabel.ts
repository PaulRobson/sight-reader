// Human-readable key from a tune's K: header, e.g. "K:Am" -> "A minor",
// "K:Bb clef=bass" -> "B♭ major". Null when no key header is present.
export function keyLabel(abc: string): string | null {
	const m = /^K:\s*([A-G])(#|b)?(m)?/m.exec(abc);
	if (!m) return null;
	const [, letter, accidental, minor] = m;
	const symbol = accidental === "#" ? "♯" : accidental === "b" ? "♭" : "";
	return `${letter}${symbol} ${minor ? "minor" : "major"}`;
}
