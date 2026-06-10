import { initPromise } from "./db";

// Offline invoice id format: {pos_profile}-{YYYY}-{RAND8}
// e.g. Counter-1-2026-9F1C2D4A
//
// Uniqueness is STATELESS: it comes from an 8-char random hex token, not from a
// persisted counter. The previous counter lived in the offline DB (`keyval`), which
// clearAllCache()/Dexie.delete() wipes on every resync — that reset the sequence to 0
// and produced duplicate ids. Random entropy needs no stored state, so a cleared cache
// or a brand-new (incognito) browser instance still yields a unique id every time, with
// no server to dedup against. 32 bits = 4.29e9 values; collisions are scoped to the same
// profile + year, so they are effectively impossible.
//
// Data-level dedup on sync is handled separately by posa_client_request_id (immutable,
// unique per sale), so this id is purely the human-readable / tracking number.

const RAND_LEN = 8;

/**
 * Generate an 8-char uppercase hex token from the best available entropy source.
 * Prefers crypto.randomUUID(), then crypto.getRandomValues(), then Math.random().
 */
function randomToken(): string {
	try {
		const c: any = typeof globalThis !== "undefined" ? (globalThis as any).crypto : undefined;
		if (c && typeof c.randomUUID === "function") {
			return c.randomUUID().replace(/-/g, "").slice(0, RAND_LEN).toUpperCase();
		}
		if (c && typeof c.getRandomValues === "function") {
			const bytes = new Uint8Array(RAND_LEN / 2);
			c.getRandomValues(bytes);
			return Array.from(bytes)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("")
				.slice(0, RAND_LEN)
				.toUpperCase();
		}
	} catch {
		// fall through to Math.random fallback
	}
	let out = "";
	while (out.length < RAND_LEN) {
		out += Math.floor(Math.random() * 16).toString(16);
	}
	return out.slice(0, RAND_LEN).toUpperCase();
}

/**
 * Generate the next offline invoice id for a POS profile.
 *
 * Format: {pos_profile}-{YYYY}-{RAND8} (e.g. Counter-1-2026-9F1C2D4A).
 * Fully automated and non-configurable. Stateless — survives cache clears and fresh
 * browser instances. Each terminal uses a unique POS profile, so ids never collide
 * across terminals either.
 */
export async function nextOfflineInvoiceId(profile: string): Promise<string> {
	await initPromise;

	const profileKey = profile || "default";
	const year = new Date().getFullYear();

	return `${profileKey}-${year}-${randomToken()}`;
}
