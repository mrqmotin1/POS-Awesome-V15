export const normalizeScaleBarcodeSettings = (rawSettings = {}) => {
	const settings = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
	const prefix = String(settings.prefix || "").trim();
	const prefixIncludedRaw = Number(settings.prefix_included_or_not);
	const prefixLengthRaw = Number(settings.no_of_prefix_characters);

	const prefixIncluded = Number.isFinite(prefixIncludedRaw) ? prefixIncludedRaw : 0;
	const prefixLength = Number.isFinite(prefixLengthRaw) ? prefixLengthRaw : 0;

	return {
		prefix,
		prefix_included_or_not: prefixIncluded,
		no_of_prefix_characters: prefixLength,
	};
};

export const parseScaleBarcodeSettingsResponse = (response) => {
	const message = response && response.message ? response.message : null;
	if (!message) {
		return null;
	}

	if (message.settings) {
		return message.settings;
	}

	if (typeof message === "object") {
		const hasKey = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
		if (
			hasKey(message, "prefix") ||
			hasKey(message, "prefix_included_or_not") ||
			hasKey(message, "no_of_prefix_characters")
		) {
			return message;
		}
	}

	return null;
};

export const getScaleBarcodePrefix = (settings = {}) => {
	const prefix = settings?.prefix;
	return typeof prefix === "string" ? prefix.trim() : "";
};

export const scaleBarcodeMatches = (settings = {}, value) => {
	const prefix = getScaleBarcodePrefix(settings);
	if (!prefix) {
		return false;
	}
	return String(value || "").startsWith(prefix);
};
