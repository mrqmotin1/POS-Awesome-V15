// @ts-nocheck
import { ref, onUnmounted } from "vue";
import {
    getItemsLastSync,
    setItemsLastSync,
    isOffline,
} from "../../offline/index.js";
import { normalizeBackgroundSyncInterval, shouldRunBackgroundSync } from "../utils/backgroundSync.js";

/**
 * useItemSync Composable
 *
 * Manages background synchronization and incremental loading of items.
 */
export function useItemSync() {
    // State
    const background_sync_timer = ref(null);
    const background_sync_in_flight = ref(false);
    const isBackgroundLoading = ref(false);
    const last_background_sync_time = ref(null);

    // Context (Late Binding)
    const ctx = {
        pos_profile: null,
        enable_background_sync: true,
        background_sync_interval: 30,
        usesLimitSearch: false,
        itemsPageLimit: 100,
        // Methods to be provided via context
        refreshModifiedItems: null,
        backgroundSyncItems: null,
        get_items: null,
        search_onchange: null,
        itemDetailFetcher: null,
        eventBus: null,
        fetchServerItemsTimestamp: null,
        // Data references
        getItems: () => [],
        getDisplayedItems: () => [],
    };

    function registerContext(context) {
        Object.assign(ctx, context);
    }

    function startBackgroundSyncScheduler() {
        stopBackgroundSyncScheduler();
        if (!ctx.enable_background_sync) {
            return;
        }

        const intervalMs = normalizeBackgroundSyncInterval(ctx.background_sync_interval) * 1000;
        background_sync_timer.value = setInterval(() => {
            performBackgroundSync({ source: "interval" });
        }, intervalMs);

        performBackgroundSync({ source: "initial" });
    }

    function stopBackgroundSyncScheduler() {
        if (background_sync_timer.value) {
            clearInterval(background_sync_timer.value);
            background_sync_timer.value = null;
        }
    }

    async function ensureBackgroundSyncBaseline() {
        const lastSync = getItemsLastSync();
        if (lastSync) {
            last_background_sync_time.value = lastSync;
            return lastSync;
        }

        if (ctx.fetchServerItemsTimestamp) {
            const serverTimestamp = await ctx.fetchServerItemsTimestamp();
            if (serverTimestamp) {
                setItemsLastSync(serverTimestamp);
                last_background_sync_time.value = serverTimestamp;
                return serverTimestamp;
            }
        }

        return null;
    }

    async function performBackgroundSync({ source = "manual" } = {}) {
        if (
            !shouldRunBackgroundSync({
                posProfile: ctx.pos_profile,
                enableBackgroundSync: ctx.enable_background_sync,
                backgroundSyncInFlight: background_sync_in_flight.value,
                isOffline: isOffline(),
                usesLimitSearch: ctx.usesLimitSearch,
            })
        ) {
            return;
        }

        background_sync_in_flight.value = true;
        try {
            await ensureBackgroundSyncBaseline();

            if (ctx.refreshModifiedItems) {
                const { items: updatedItems } = await ctx.refreshModifiedItems();

                if (updatedItems && updatedItems.length) {
                    if (ctx.itemDetailFetcher) {
                        await ctx.itemDetailFetcher.update_items_details(updatedItems, { forceRefresh: true });
                    }
                    if (ctx.eventBus) {
                        ctx.eventBus.emit("set_all_items", ctx.getItems());
                    }
                }
            }

            if (ctx.itemDetailFetcher) {
                // Refresh cached quantities/prices for all items so non-visible items stay in sync.
                await ctx.itemDetailFetcher.refreshAllItemDetailsInBatches(ctx.itemsPageLimit || 100);

                const displayed = ctx.getDisplayedItems();
                if (displayed && displayed.length > 0) {
                    await ctx.itemDetailFetcher.update_items_details(displayed);
                }
            }

            last_background_sync_time.value = new Date().toISOString();
        } catch (error) {
            console.error(`Background sync failed (${source})`, error);
        } finally {
            background_sync_in_flight.value = false;
        }
    }

    function kickoffBackgroundSync() {
        if (isBackgroundLoading.value || ctx.usesLimitSearch) {
            return Promise.resolve([]);
        }

        isBackgroundLoading.value = true;

        if (!ctx.backgroundSyncItems) {
            isBackgroundLoading.value = false;
            return Promise.resolve([]);
        }

        return ctx.backgroundSyncItems()
            .then((appended) => {
                if (Array.isArray(appended) && appended.length) {
                    if (ctx.eventBus) {
                        ctx.eventBus.emit("set_all_items", ctx.getItems());
                    }
                }
                return appended;
            })
            .finally(() => {
                finishBackgroundLoad();
            });
    }

    function finishBackgroundLoad() {
        isBackgroundLoading.value = false;

        // Note: pendingItemSearch handling might still be needed in the component 
        // if it needs to re-trigger search after background load.
        // We can expose a way to tell the component to re-check pending state.

        if (ctx.onBackgroundLoadFinished) {
            ctx.onBackgroundLoadFinished();
        }
    }

    onUnmounted(() => {
        stopBackgroundSyncScheduler();
    });

    return {
        // State
        background_sync_in_flight,
        isBackgroundLoading,
        last_background_sync_time,

        // Methods
        registerContext,
        startBackgroundSyncScheduler,
        stopBackgroundSyncScheduler,
        performBackgroundSync,
        ensureBackgroundSyncBaseline,
        kickoffBackgroundSync,
        finishBackgroundLoad,
    };
}
