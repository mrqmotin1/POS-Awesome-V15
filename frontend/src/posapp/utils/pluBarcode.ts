/**
 * Client-side decoder for NATC 15-digit PLU weighed-item barcodes.
 *
 * This mirrors the server implementation in
 * `posawesome/posawesome/api/item_processing/barcode.py`
 * (`decode_plu_barcode` / `validate_mod10_checksum`) so that PLU scanning works
 * fully offline — no server round-trip is required to decode a label.
 *
 * Barcode layout (15 digits):
 *   2 | <6-digit PLU code> | <5-digit weight> | <3-digit Mod10 checksum>
 *   ^ discriminator "2" marks a weighed item
 *
 * Only the weight is encoded in the barcode. Price and UOM come from the Item
 * record (system), not the label.
 */

declare const __: (_str: string, _args?: any[]) => string;

/** Matches a NATC PLU barcode: discriminator "2" followed by 14 digits. */
export const PLU_BARCODE_PATTERN = /^2\d{14}$/;

export interface PluDecodeResult {
	valid: boolean;
	error?: string;
	item_code?: string;
	weight?: number;
}

/**
 * Validate the 3-digit Mod10 checksum (digits 13-15) against the first 12
 * digits, using the same Luhn-style weighting as the server.
 */
export const validateMod10Checksum = (barcode: string): boolean => {
	if (barcode.length !== 15 || !/^\d{15}$/.test(barcode)) {
		return false;
	}

	const payload = barcode.slice(0, 12);
	const storedChecksum = parseInt(barcode.slice(12, 15), 10);

	let total = 0;
	for (let i = 0; i < payload.length; i++) {
		let n = barcode.charCodeAt(i) - 48; // numeric value of the digit
		if (i % 2 === 1) {
			n *= 2;
			if (n > 9) {
				n -= 9;
			}
		}
		total += n;
	}

	const computed = (1000 - (total % 1000)) % 1000;
	return computed === storedChecksum;
};

/**
 * Decode a PLU barcode into `{ item_code, weight }`. Returns
 * `{ valid: false, error }` for any malformed or failing label. Pure and
 * synchronous — safe to call while offline.
 */
export const decodePluBarcode = (raw: string): PluDecodeResult => {
	const barcode = String(raw ?? "").trim();

	if (barcode.length !== 15) {
		return { valid: false, error: __("Invalid barcode length") };
	}
	if (barcode[0] !== "2") {
		return { valid: false, error: __("Not a PLU weighed item barcode") };
	}
	if (!/^\d{15}$/.test(barcode)) {
		return { valid: false, error: __("Barcode must be numeric") };
	}

	const itemCodeRaw = barcode.slice(1, 7); // 6-digit PLU code
	const weight = parseInt(barcode.slice(7, 12), 10); // 5-digit weight

	if (!validateMod10Checksum(barcode)) {
		return {
			valid: false,
			error: __("Checksum validation failed — rescan or reweigh"),
		};
	}
	if (weight === 0) {
		return { valid: false, error: __("Weight is zero — invalid label") };
	}

	return { valid: true, item_code: itemCodeRaw, weight };
};
