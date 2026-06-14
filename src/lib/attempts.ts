import type { AttemptLog } from "./assessment.ts";
import { storage } from "./storage.ts";

const KEY = "sr.attempts";

// Persisted as a flat chronological list; each entry carries its pieceId so
// attempts for one piece are recoverable by filtering.
export const attempts = {
	all(): AttemptLog[] {
		return storage.load<AttemptLog[]>(KEY, []);
	},
	forPiece(pieceId: string): AttemptLog[] {
		return attempts.all().filter((a) => a.pieceId === pieceId);
	},
	save(log: AttemptLog): AttemptLog[] {
		const next = [...attempts.all(), log];
		storage.save(KEY, next);
		return next;
	},
};
