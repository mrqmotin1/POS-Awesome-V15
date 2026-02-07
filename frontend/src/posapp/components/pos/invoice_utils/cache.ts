// @ts-nocheck

/**
 * Cache Utils
 * Handles caching of item details and stock quantities.
 * 
 * Context requirements:
 * - context.pos_profile (warehouse)
 * - context.item_detail_cache
 * - context.item_stock_cache
 */

const ITEM_DETAIL_CACHE_TTL = 5000;
const STOCK_CACHE_TTL = 5000;

export function _getItemDetailCacheKey(context, item) {
    const code = item?.item_code;
    const warehouse = item?.warehouse || context.pos_profile?.warehouse;
    if (!code || !warehouse) {
        return null;
    }
    return `${code}::${warehouse}`;
}

export function _getCachedItemDetail(context, key) {
    if (!key) {
        return null;
    }
    const cache = context.item_detail_cache || {};
    const entry = cache[key];
    if (!entry) {
        return null;
    }
    if (Date.now() - entry.ts > ITEM_DETAIL_CACHE_TTL) {
        delete cache[key];
        return null;
    }
    return entry.data;
}

export function _storeItemDetailCache(context, key, data) {
    if (!key || !data) {
        return;
    }
    if (!context.item_detail_cache) {
        context.item_detail_cache = {};
    }
    context.item_detail_cache[key] = {
        ts: Date.now(),
        data: JSON.parse(JSON.stringify(data)),
    };
}

export function clearItemDetailCache(context) {
    context.item_detail_cache = {};
}

export function _getStockCacheKey(context, item) {
    const code = item?.item_code;
    const warehouse = item?.warehouse || context.pos_profile?.warehouse;
    if (!code || !warehouse) {
        return null;
    }
    return `${code}::${warehouse}`;
}

export function _getCachedStockQty(context, key) {
    if (!key) {
        return null;
    }
    const cache = context.item_stock_cache || {};
    const entry = cache[key];
    if (!entry) {
        return null;
    }
    if (Date.now() - entry.ts > STOCK_CACHE_TTL) {
        delete cache[key];
        return null;
    }
    return entry.qty;
}

export function _storeStockQty(context, key, qty) {
    if (!key) {
        return;
    }
    if (!context.item_stock_cache) {
        context.item_stock_cache = {};
    }
    context.item_stock_cache[key] = { ts: Date.now(), qty };
}

export function clearItemStockCache(context) {
    context.item_stock_cache = {};
}
