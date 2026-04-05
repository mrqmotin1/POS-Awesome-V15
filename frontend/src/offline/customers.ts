import { memory, persist, isOffline, db } from "./db";

type AnyRecord = Record<string, any>;

export function saveOfflineCustomer(entry: AnyRecord) {
	const key = "offline_customers";
	const entries = memory.offline_customers;
	// Serialize to avoid storing reactive objects that IndexedDB
	// cannot clone.
	let cleanEntry;
	try {
		cleanEntry = JSON.parse(JSON.stringify(entry));
	} catch (e) {
		console.error("Failed to serialize offline customer", e);
		throw e;
	}
	entries.push(cleanEntry);
	memory.offline_customers = entries;
	persist(key);
}

export function updateOfflineInvoicesCustomer(
	oldName: string,
	newName: string,
) {
	let updated = false;
	const invoices = memory.offline_invoices || [];
	invoices.forEach((inv) => {
		if (inv.invoice && inv.invoice.customer === oldName) {
			inv.invoice.customer = newName;
			if (inv.invoice.customer_name) {
				inv.invoice.customer_name = newName;
			}
			updated = true;
		}
	});
	if (updated) {
		memory.offline_invoices = invoices;
		persist("offline_invoices");
	}
}

export function getOfflineCustomers() {
	return memory.offline_customers;
}

export function clearOfflineCustomers() {
	memory.offline_customers = [];
	persist("offline_customers");
}

export async function syncOfflineCustomers() {
	const customers = getOfflineCustomers();
	if (!customers.length) {
		return { pending: 0, synced: 0 };
	}
	if (isOffline()) {
		return { pending: customers.length, synced: 0 };
	}

	const failures: AnyRecord[] = [];
	let synced = 0;

	for (const cust of customers) {
		try {
			const result = await frappe.call({
				method: "posawesome.posawesome.api.customers.create_customer",
				args: cust.args,
			});
			synced++;
			if (
				result &&
				result.message &&
				result.message.name &&
				result.message.name !== cust.args.customer_name
			) {
				updateOfflineInvoicesCustomer(
					cust.args.customer_name,
					result.message.name,
				);
			}
		} catch (error) {
			console.error("Failed to create customer", error);
			failures.push(cust);
		}
	}

	if (failures.length) {
		memory.offline_customers = failures;
		persist("offline_customers");
	} else {
		clearOfflineCustomers();
	}

	return { pending: failures.length, synced };
}

export function getCustomerStorage() {
	return memory.customer_storage || [];
}

export async function getStoredCustomer(customerName: string) {
	try {
		const customers = getCustomerStorage();
		return customers.find((c) => c.name === customerName) || null;
	} catch (e) {
		console.error("Failed to get stored customer", e);
		return null;
	}
}

export async function setCustomerStorage(customers: AnyRecord[]) {
	try {
		const clean = customers.map((c) => ({
			name: c.name,
			customer_name: c.customer_name,
			mobile_no: c.mobile_no,
			email_id: c.email_id,
			primary_address: c.primary_address,
			tax_id: c.tax_id,
			stored_value_balance: c.stored_value_balance || 0,
			stored_value_sources: c.stored_value_sources || 0,
		}));

		await db.table("customers").bulkPut(clean);
		memory.customer_storage = clean;
		persist("customer_storage");
	} catch (e) {
		console.error("Failed to save customers to storage", e);
	}
}

function getStoredValueSnapshotKey(customer: string, company: string) {
	return `${String(company || "").trim()}::${String(customer || "").trim()}`;
}

export function saveStoredValueSnapshot(
	customer: string,
	company: string,
	sources: AnyRecord[],
) {
	try {
		const key = getStoredValueSnapshotKey(customer, company);
		if (!key.trim() || !Array.isArray(sources)) {
			return;
		}
		const cleanSources = JSON.parse(JSON.stringify(sources));
		const availableAmount = cleanSources.reduce(
			(sum: number, row: AnyRecord) => sum + Number(row?.total_credit || 0),
			0,
		);
		const cache = memory.stored_value_snapshot_cache || {};
		cache[key] = {
			customer,
			company,
			sources: cleanSources,
			available_amount: availableAmount,
			source_count: cleanSources.length,
			timestamp: Date.now(),
		};
		memory.stored_value_snapshot_cache = cache;
		persist("stored_value_snapshot_cache");
	} catch (e) {
		console.error("Failed to cache stored value snapshot", e);
	}
}

export function getCachedStoredValueSnapshot(customer: string, company: string) {
	try {
		const key = getStoredValueSnapshotKey(customer, company);
		const cache = memory.stored_value_snapshot_cache || {};
		const cachedData = cache[key];
		if (cachedData) {
			const isValid =
				Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000;
			return isValid ? cachedData : null;
		}
		return null;
	} catch (e) {
		console.error("Failed to get cached stored value snapshot", e);
		return null;
	}
}

export function clearStoredValueSnapshotCache() {
	try {
		memory.stored_value_snapshot_cache = {};
		persist("stored_value_snapshot_cache");
	} catch (e) {
		console.error("Failed to clear stored value snapshot cache", e);
	}
}

export function saveGiftCardSnapshot(giftCardCode: string, snapshot: AnyRecord) {
	try {
		const code = String(giftCardCode || "").trim().toUpperCase();
		if (!code) {
			return;
		}
		const cache = memory.gift_card_snapshot_cache || {};
		cache[code] = {
			...JSON.parse(JSON.stringify(snapshot || {})),
			timestamp: Date.now(),
		};
		memory.gift_card_snapshot_cache = cache;
		persist("gift_card_snapshot_cache");
	} catch (e) {
		console.error("Failed to cache gift card snapshot", e);
	}
}

export function getCachedGiftCardSnapshot(giftCardCode: string) {
	try {
		const code = String(giftCardCode || "").trim().toUpperCase();
		const cache = memory.gift_card_snapshot_cache || {};
		const cachedData = cache[code];
		if (cachedData) {
			const isValid =
				Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000;
			return isValid ? cachedData : null;
		}
		return null;
	} catch (e) {
		console.error("Failed to get cached gift card snapshot", e);
		return null;
	}
}

export function clearGiftCardSnapshotCache() {
	try {
		memory.gift_card_snapshot_cache = {};
		persist("gift_card_snapshot_cache");
	} catch (e) {
		console.error("Failed to clear gift card snapshot cache", e);
	}
}

export function saveCustomerBalance(customer: string, balance: number) {
	try {
		const cache = memory.customer_balance_cache;
		cache[customer] = {
			balance: balance,
			timestamp: Date.now(),
		};
		memory.customer_balance_cache = cache;
		persist("customer_balance_cache");
	} catch (e) {
		console.error("Failed to cache customer balance", e);
	}
}

export function getCachedCustomerBalance(customer: string) {
	try {
		const cache = memory.customer_balance_cache || {};
		const cachedData = cache[customer];
		if (cachedData) {
			const isValid =
				Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000;
			return isValid ? cachedData.balance : null;
		}
		return null;
	} catch (e) {
		console.error("Failed to get cached customer balance", e);
		return null;
	}
}

export function clearCustomerBalanceCache() {
	try {
		memory.customer_balance_cache = {};
		persist("customer_balance_cache");
	} catch (e) {
		console.error("Failed to clear customer balance cache", e);
	}
}

export function clearExpiredCustomerBalances() {
	try {
		const cache = memory.customer_balance_cache || {};
		const now = Date.now();
		const validCache: AnyRecord = {};

		Object.keys(cache).forEach((customer) => {
			const cachedData = cache[customer];
			if (
				cachedData &&
				now - cachedData.timestamp < 24 * 60 * 60 * 1000
			) {
				validCache[customer] = cachedData;
			}
		});

		memory.customer_balance_cache = validCache;
		persist("customer_balance_cache");
	} catch (e) {
		console.error("Failed to clear expired customer balances", e);
	}
}
