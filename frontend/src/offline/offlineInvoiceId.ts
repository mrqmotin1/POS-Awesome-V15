import { memory, persist, initPromise } from "./db";

type AnyRecord = Record<string, any>;

const SEQ_KEY = "offline_invoice_seq";
// Fully automated, non-configurable format: {pos_profile}-YYYY-#####
// (e.g. STORE1-2026-00001). The .YYYY. token makes the sequence reset yearly.
const DEFAULT_SERIES = ".PROFILE.-.YYYY.-.#####";

interface SeqRecord {
	period: string;
	seq: number;
}

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

/**
 * Render an offline invoice id from a naming-series pattern.
 *
 * Supported tokens (dot-delimited, ERPNext-style):
 *   .PROFILE.  -> the POS profile name (per-terminal uniqueness segment)
 *   .YYYY.     -> 4-digit year
 *   .YY.       -> 2-digit year
 *   .MM.       -> 2-digit month
 *   .DD.       -> 2-digit day
 *   a run of '#' (optionally wrapped in dots) -> zero-padded sequence number
 */
export function renderSeries(
	series: string,
	profile: string,
	seq: number,
	now: Date = new Date(),
): string {
	const yyyy = String(now.getFullYear());
	const yy = yyyy.slice(-2);
	const mm = pad2(now.getMonth() + 1);
	const dd = pad2(now.getDate());

	let out = series || DEFAULT_SERIES;

	// Replace the incrementing segment first (run of '#', possibly dot-wrapped).
	out = out.replace(/\.?(#+)\.?/, (_match, hashes: string) =>
		String(seq).padStart(hashes.length, "0"),
	);

	// Replace named tokens. Use a single pass so literal text is preserved.
	out = out
		.replace(/\.PROFILE\./g, profile || "")
		.replace(/\.YYYY\./g, yyyy)
		.replace(/\.YY\./g, yy)
		.replace(/\.MM\./g, mm)
		.replace(/\.DD\./g, dd);

	return out;
}

function counters(): AnyRecord {
	if (!memory[SEQ_KEY] || typeof memory[SEQ_KEY] !== "object") {
		memory[SEQ_KEY] = {};
	}
	return memory[SEQ_KEY];
}

/**
 * Generate the next offline invoice id for a POS profile.
 *
 * The format is fully automated ({pos_profile}-DD-MM-YYYY-#####); there is no
 * configurable series. The counter is stored per profile in IndexedDB-backed
 * memory and persisted BEFORE the id is returned, so a refresh/crash mid-save
 * can never reissue the same number. Each terminal uses a unique POS profile,
 * so sequences never collide across terminals.
 */
export async function nextOfflineInvoiceId(profile: string): Promise<string> {
	await initPromise;

	const effectiveSeries = DEFAULT_SERIES;
	const profileKey = profile || "default";
	const now = new Date();

	// Counter never resets — it just keeps incrementing per profile. The year in
	// the rendered id reflects the current year, but the sequence does not roll over.
	const store = counters();
	const current: SeqRecord = store[profileKey] || { period: "ALL", seq: 0 };

	const seq = current.seq + 1;
	store[profileKey] = { period: "ALL", seq };
	persist(SEQ_KEY);

	return renderSeries(effectiveSeries, profileKey, seq, now);
}

export { DEFAULT_SERIES };
