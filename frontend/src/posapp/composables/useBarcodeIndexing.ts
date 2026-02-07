// @ts-nocheck

import { ref } from "vue";

// --- Stateless Helpers (formerly utils/barcodeIndex.js) ---

export const ensureBarcodeIndex = (index) => {
    if (index && typeof index.set === "function") {
        return index;
    }
    return new Map();
};

export const resetBarcodeIndex = (index) => {
    const map = ensureBarcodeIndex(index);
    map.clear();
    return map;
};

const registerCode = (index, item, code) => {
    if (code === undefined || code === null) {
        return;
    }
    const normalized = String(code).trim();
    if (!normalized) {
        return;
    }
    if (!index.has(normalized)) {
        index.set(normalized, item);
    }
    const lower = normalized.toLowerCase();
    if (!index.has(lower)) {
        index.set(lower, item);
    }
};

export const indexItemInBarcodeIndex = (index, item) => {
    if (!item) {
        return index;
    }
    const map = ensureBarcodeIndex(index);
    registerCode(map, item, item.item_code);
    registerCode(map, item, item.barcode);
    if (Array.isArray(item.item_barcode)) {
        item.item_barcode.forEach((barcode) => registerCode(map, item, barcode?.barcode));
    }
    if (Array.isArray(item.barcodes)) {
        item.barcodes.forEach((barcode) => registerCode(map, item, barcode));
    }
    if (Array.isArray(item.serial_no_data)) {
        item.serial_no_data.forEach((serial) => registerCode(map, item, serial?.serial_no));
    }
    if (Array.isArray(item.batch_no_data)) {
        item.batch_no_data.forEach((batch) => registerCode(map, item, batch?.batch_no));
    }
    return map;
};

export const replaceBarcodeIndex = (index, items = []) => {
    const map = resetBarcodeIndex(index);
    items.forEach((item) => indexItemInBarcodeIndex(map, item));
    return map;
};

export const lookupItemInBarcodeIndex = (index, code) => {
    if (code === undefined || code === null) {
        return null;
    }
    const map = ensureBarcodeIndex(index);
    const normalized = String(code).trim();
    if (!normalized) {
        return null;
    }
    return map.get(normalized) || map.get(normalized.toLowerCase()) || null;
};

// --- Composable ---

export function useBarcodeIndexing() {
    const barcodeIndex = ref(null);

    const ensureIndex = () => {
        barcodeIndex.value = ensureBarcodeIndex(barcodeIndex.value);
        return barcodeIndex.value;
    };

    const reset = () => {
        barcodeIndex.value = resetBarcodeIndex(barcodeIndex.value);
    };

    const indexItem = (item) => {
        barcodeIndex.value = indexItemInBarcodeIndex(ensureIndex(), item);
    };

    const replaceIndex = (items) => {
        // If items is a Ref, unwrap it, otherwise use as is
        const itemsList = typeof items === 'function' ? items() : (items && items.value ? items.value : items);
        barcodeIndex.value = replaceBarcodeIndex(ensureIndex(), itemsList);
    };

    const lookupItem = (code) => {
        return lookupItemInBarcodeIndex(ensureIndex(), code);
    };

    // Logic extracted from ItemsSelector.vue: searchItemsByCode
    const searchItemsByCode = (items, code) => {
        if (!items || !code) return [];
        const itemsList = typeof items === 'function' ? items() : (items && items.value ? items.value : items);

        return itemsList.filter((item) => {
            const searchTerm = code.toLowerCase();
            const barcodeMatch =
                (item.barcode && item.barcode.toLowerCase().includes(searchTerm)) ||
                (Array.isArray(item.barcodes) &&
                    item.barcodes.some((bc) => String(bc).toLowerCase().includes(searchTerm))) ||
                (Array.isArray(item.item_barcode) &&
                    item.item_barcode.some(
                        (b) => b.barcode && b.barcode.toLowerCase().includes(searchTerm),
                    ));
            return (
                item.item_code.toLowerCase().includes(searchTerm) ||
                item.item_name.toLowerCase().includes(searchTerm) ||
                barcodeMatch
            );
        });
    };

    return {
        barcodeIndex,
        ensureBarcodeIndex: ensureIndex,
        resetBarcodeIndex: reset,
        indexItem,
        replaceBarcodeIndex: replaceIndex,
        lookupItemByBarcode: lookupItem,
        searchItemsByCode,
    };
}
