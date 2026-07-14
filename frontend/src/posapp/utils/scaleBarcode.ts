/**
 * Utility functions for scale barcode manipulation and settings.
 */

/**
 * Interface for normalized scale barcode settings.
 */
export interface ScaleBarcodeSettings {
    prefix: string;
    prefix_included_or_not: number;
    no_of_prefix_characters: number;
    item_code_starting_digit: number;
    item_code_total_digits: number;
    weight_starting_digit: number;
    weight_total_digits: number;
    weight_decimals: number;
    price_included_in_barcode_or_not: number;
    price_starting_digit: number;
    price_total_digit: number;
    price_decimals: number;
}

/**
 * Coerces a value to a finite integer, falling back to 0.
 */
const toInt = (value: any): number => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : 0;
};

/**
 * Normalizes raw scale barcode settings.
 * @param rawSettings Raw settings object
 * @returns Normalized ScaleBarcodeSettings
 */
export const normalizeScaleBarcodeSettings = (rawSettings: any = {}): ScaleBarcodeSettings => {
    const settings = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
    const prefix = String(settings.prefix || "").trim();

    return {
        prefix,
        prefix_included_or_not: toInt(settings.prefix_included_or_not),
        no_of_prefix_characters: toInt(settings.no_of_prefix_characters),
        item_code_starting_digit: toInt(settings.item_code_starting_digit),
        item_code_total_digits: toInt(settings.item_code_total_digits),
        weight_starting_digit: toInt(settings.weight_starting_digit),
        weight_total_digits: toInt(settings.weight_total_digits),
        weight_decimals: toInt(settings.weight_decimals),
        price_included_in_barcode_or_not: toInt(settings.price_included_in_barcode_or_not),
        price_starting_digit: toInt(settings.price_starting_digit),
        price_total_digit: toInt(settings.price_total_digit),
        price_decimals: toInt(settings.price_decimals),
    };
};

/**
 * Parses the backend response for scale barcode settings.
 * @param response Raw backend response
 * @returns ScaleBarcodeSettings or null
 */
export const parseScaleBarcodeSettingsResponse = (response: any): ScaleBarcodeSettings | null => {
    const message = response && response.message ? response.message : null;
    if (!message) {
        return null;
    }

    if (message.settings) {
        return message.settings as ScaleBarcodeSettings;
    }

    if (typeof message === "object") {
        const hasKey = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
        if (
            hasKey(message, "prefix") ||
            hasKey(message, "prefix_included_or_not") ||
            hasKey(message, "no_of_prefix_characters")
        ) {
            return message as ScaleBarcodeSettings;
        }
    }

    return null;
};

/**
 * Gets the scale barcode prefix from settings.
 * @param settings Scale barcode settings
 * @returns Prefix string
 */
export const getScaleBarcodePrefix = (settings: Partial<ScaleBarcodeSettings> = {}): string => {
    const prefix = settings?.prefix;
    return typeof prefix === "string" ? prefix.trim() : "";
};

/**
 * Checks if a value matches the scale barcode prefix.
 * @param settings Scale barcode settings
 * @param value Barcode value to check
 * @returns boolean
 */
export const scaleBarcodeMatches = (settings: Partial<ScaleBarcodeSettings> = {}, value: string | null | undefined): boolean => {
    const prefix = getScaleBarcodePrefix(settings);
    if (!prefix) {
        return false;
    }
    return String(value || "").startsWith(prefix);
};

/**
 * Parsed scale barcode payload. Mirrors the backend `parse_scale_barcode` message.
 */
export interface ParsedScaleBarcode {
    barcode: string;
    item_code: string;
    qty?: number;
    price?: number;
}

/**
 * Extracts a numeric value from a barcode using 1-indexed start and length.
 * Port of `_extract_numeric_segment` in barcode.py.
 * @returns parsed number or null when segment is out of bounds/unconfigured
 */
export const extractNumericSegment = (
    barcode: string,
    start: number,
    length: number,
    decimals = 0,
): number | null => {
    if (!(start && length)) {
        return null;
    }

    const startIndex = Math.max(start - 1, 0);
    const endIndex = startIndex + Math.max(length, 0);
    if (barcode.length < endIndex) {
        return null;
    }

    const whole = barcode.slice(startIndex, endIndex);
    let decimalPart = "";
    if (decimals && decimals > 0) {
        const decimalEnd = endIndex + decimals;
        if (barcode.length < decimalEnd) {
            return null;
        }
        decimalPart = barcode.slice(endIndex, decimalEnd);
    }

    const numberStr = decimalPart ? `${whole}.${decimalPart}` : whole;
    const parsed = Number(numberStr);
    return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Parses a scale barcode entirely client-side using cached settings.
 * Port of `_parse_scale_barcode_data` in barcode.py — avoids a server round-trip per scan.
 * @returns parsed payload or null when the barcode is not a scale barcode
 */
export const parseScaleBarcodeData = (
    settings: Partial<ScaleBarcodeSettings> = {},
    barcode: string | null | undefined,
): ParsedScaleBarcode | null => {
    const barcodeValue = String(barcode || "").trim();
    if (!barcodeValue) {
        return null;
    }

    const prefixValue = getScaleBarcodePrefix(settings);
    const prefixIncluded = Number(settings.prefix_included_or_not) || 0;
    const prefixLength = prefixIncluded ? Number(settings.no_of_prefix_characters) || 0 : 0;

    if (prefixValue && !barcodeValue.startsWith(prefixValue)) {
        return null;
    }

    if (prefixIncluded && prefixLength && barcodeValue.length < prefixLength) {
        return null;
    }

    const itemStart = Number(settings.item_code_starting_digit) || 0;
    const itemDigits = Number(settings.item_code_total_digits) || 0;
    if (!(itemStart && itemDigits)) {
        return null;
    }

    const itemStartIndex = Math.max(itemStart - 1, 0);
    const itemEndIndex = itemStartIndex + itemDigits;
    if (barcodeValue.length < itemEndIndex) {
        return null;
    }

    const data: ParsedScaleBarcode = {
        barcode: barcodeValue,
        item_code: barcodeValue.slice(itemStartIndex, itemEndIndex),
    };

    const qty = extractNumericSegment(
        barcodeValue,
        Number(settings.weight_starting_digit) || 0,
        Number(settings.weight_total_digits) || 0,
        Number(settings.weight_decimals) || 0,
    );
    if (qty !== null) {
        data.qty = qty;
    }

    if (Number(settings.price_included_in_barcode_or_not)) {
        const price = extractNumericSegment(
            barcodeValue,
            Number(settings.price_starting_digit) || 0,
            Number(settings.price_total_digit) || 0,
            Number(settings.price_decimals) || 0,
        );
        if (price !== null) {
            data.price = price;
        }
    }

    return data;
};
