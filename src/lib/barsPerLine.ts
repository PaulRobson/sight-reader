// ~px per measure that reads well: the iPad-portrait density (≈4 bars across a
// ~740px score), reused as the desktop target so density stays consistent.
const TARGET_MEASURE_PX = 185;
const MIN_PER_LINE = 4;

// Preferred measures per staff line for abcjs `wrap`. Touch devices (iPad on a
// stand, phones) keep a spacious 4 — large notes for distance reading, which
// reads well there. A desktop mouse (fine pointer) packs more bars as the window
// widens so a few bars aren't stretched across the whole screen (with
// `responsive: "resize"` the SVG fills the container, so spacing per measure is
// container width ÷ measures per line). The floor keeps narrow desktop windows
// consistent with small devices.
export function barsPerLine(
	containerWidth: number,
	finePointer: boolean,
): number {
	if (!finePointer) return MIN_PER_LINE;
	return Math.max(MIN_PER_LINE, Math.round(containerWidth / TARGET_MEASURE_PX));
}
