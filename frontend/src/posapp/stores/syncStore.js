import { defineStore } from "pinia";
import { getPendingOfflineInvoiceCount } from "../../offline/index.js";

export const useSyncStore = defineStore("sync", {
	state: () => ({
		pendingInvoicesCount: 0,
	}),
	actions: {
		async updatePendingCount() {
			try {
				const count = await getPendingOfflineInvoiceCount();
				this.pendingInvoicesCount = count;
			} catch (error) {
				console.error("Failed to update pending invoices count", error);
			}
		},
		setPendingCount(count) {
			this.pendingInvoicesCount = count;
		},
	},
});
