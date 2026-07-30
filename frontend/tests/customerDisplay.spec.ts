import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildCustomerDisplayUrl,
	createCustomerDisplayTransport,
	getCustomerDisplayStorageKey,
	getOrCreateCustomerDisplayChannelId,
	type CustomerDisplaySnapshot,
} from "../src/posapp/utils/customerDisplay";
import {
	buildWindowFeatures,
	listScreens,
	matchScreenByName,
} from "../src/posapp/utils/customerDisplayScreens";

class MemoryStorage {
	private map = new Map<string, string>();

	getItem(key: string) {
		return this.map.has(key) ? this.map.get(key)! : null;
	}

	setItem(key: string, value: string) {
		this.map.set(key, String(value));
	}

	removeItem(key: string) {
		this.map.delete(key);
	}

	clear() {
		this.map.clear();
	}
}

const baseSnapshot: CustomerDisplaySnapshot = {
	channel_id: "cd_test",
	currency: "USD",
	customer_name: "Walk-in",
	items: [
		{
			id: "1",
			item_code: "ITEM-1",
			item_name: "Item 1",
			qty: 2,
			rate: 5,
			amount: 10,
			uom: "Nos",
		},
	],
	total_qty: 2,
	total_amount: 10,
	updated_at: "2026-02-16T10:00:00.000Z",
};

/**
 * Minimal BroadcastChannel: delivers to every other open instance on the same
 * topic and never to the sender, matching the real API.
 */
const channelRegistry = new Map<string, Set<MemoryBroadcastChannel>>();

class MemoryBroadcastChannel {
	private listeners = new Set<(_event: any) => void>();
	private closed = false;

	constructor(public name: string) {
		if (!channelRegistry.has(name)) {
			channelRegistry.set(name, new Set());
		}
		channelRegistry.get(name)!.add(this);
	}

	addEventListener(_type: string, handler: (_event: any) => void) {
		this.listeners.add(handler);
	}

	removeEventListener(_type: string, handler: (_event: any) => void) {
		this.listeners.delete(handler);
	}

	postMessage(data: any) {
		if (this.closed) return;
		(channelRegistry.get(this.name) || new Set()).forEach((peer) => {
			if (peer === this || peer.closed) return;
			peer.listeners.forEach((handler) => handler({ data }));
		});
	}

	close() {
		this.closed = true;
		this.listeners.clear();
		channelRegistry.get(this.name)?.delete(this);
	}
}

const createWindowMock = () => ({
	location: { origin: "http://localhost" },
	sessionStorage: new MemoryStorage(),
	localStorage: new MemoryStorage(),
	BroadcastChannel: MemoryBroadcastChannel,
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
});

const makeScreen = (overrides: Record<string, any> = {}) => ({
	label: "Built-in Retina Display",
	isPrimary: true,
	isInternal: true,
	left: 0,
	top: 0,
	width: 1920,
	height: 1080,
	availLeft: 0,
	availTop: 25,
	availWidth: 1920,
	availHeight: 1055,
	...overrides,
});

const dualScreenDetails = {
	screens: [
		makeScreen(),
		makeScreen({
			label: "DELL U2412M",
			isPrimary: false,
			isInternal: false,
			left: 1920,
			top: 0,
			width: 1280,
			height: 1024,
			availLeft: 1920,
			availTop: 0,
			availWidth: 1280,
			availHeight: 1024,
		}),
	],
};

describe("customerDisplay utils", () => {
	beforeEach(() => {
		(globalThis as any).window = createWindowMock();
	});

	afterEach(() => {
		delete (globalThis as any).window;
		channelRegistry.clear();
		vi.restoreAllMocks();
	});

	it("reuses session channel id once created", () => {
		const first = getOrCreateCustomerDisplayChannelId();
		const second = getOrCreateCustomerDisplayChannelId();

		expect(first).toBeTruthy();
		expect(second).toBe(first);
	});

	it("builds customer display url with channel query", () => {
		const url = buildCustomerDisplayUrl("cd_abc123");
		expect(url).toBe(
			"http://localhost/app/posapp?customer_display=1&channel=cd_abc123",
		);
	});

	it("stores and reads last snapshot via transport", () => {
		const transport = createCustomerDisplayTransport("cd_test");
		transport.publish(baseSnapshot);

		const stored = transport.getLastSnapshot();
		expect(stored).toEqual(baseSnapshot);

		const storageKey = getCustomerDisplayStorageKey("cd_test");
		expect((window as any).localStorage.getItem(storageKey)).toContain(
			"snapshot",
		);
		transport.close();
	});

	it("emits initial snapshot to subscriber", () => {
		const transport = createCustomerDisplayTransport("cd_init");
		transport.publish(baseSnapshot);

		let received: CustomerDisplaySnapshot | null = null;
		const unsubscribe = transport.subscribe((next) => {
			received = next;
		});

		expect(received).toEqual(baseSnapshot);
		unsubscribe();
		transport.close();
	});

	it("keeps control messages away from snapshot subscribers and storage", () => {
		const publisher = createCustomerDisplayTransport("cd_control");
		const display = createCustomerDisplayTransport("cd_control");

		const snapshots: any[] = [];
		const actions: string[] = [];
		const stopSnapshots = display.subscribe((next) => snapshots.push(next), false);
		const stopControl = display.subscribeControl((action) => actions.push(action));

		publisher.publishControl("enter_fullscreen");

		expect(actions).toEqual(["enter_fullscreen"]);
		expect(snapshots).toHaveLength(0);
		expect(display.getLastSnapshot()).toBeNull();
		expect(
			(window as any).localStorage.getItem(
				getCustomerDisplayStorageKey("cd_control"),
			),
		).toBeNull();

		stopSnapshots();
		stopControl();
		publisher.close();
		display.close();
	});
});

describe("customerDisplay screen targeting", () => {
	it("matches an exact monitor name", () => {
		const screens = listScreens(dualScreenDetails);
		expect(screens).toHaveLength(2);
		expect(matchScreenByName(screens, "DELL U2412M")?.label).toBe("DELL U2412M");
		expect(matchScreenByName(screens, "  dell u2412m  ")?.label).toBe("DELL U2412M");
	});

	it("matches a partial monitor name", () => {
		const screens = listScreens(dualScreenDetails);
		expect(matchScreenByName(screens, "dell")?.label).toBe("DELL U2412M");
	});

	it("resolves the secondary, external and primary keywords", () => {
		const screens = listScreens(dualScreenDetails);
		expect(matchScreenByName(screens, "secondary")?.label).toBe("DELL U2412M");
		expect(matchScreenByName(screens, "external")?.label).toBe("DELL U2412M");
		expect(matchScreenByName(screens, "primary")?.label).toBe(
			"Built-in Retina Display",
		);
	});

	it("resolves a 1-based screen number", () => {
		const screens = listScreens(dualScreenDetails);
		expect(matchScreenByName(screens, "1")?.label).toBe("Built-in Retina Display");
		expect(matchScreenByName(screens, "2")?.label).toBe("DELL U2412M");
		expect(matchScreenByName(screens, "3")).toBeNull();
	});

	it("returns null for a blank or unknown name so the popup stays unchanged", () => {
		const screens = listScreens(dualScreenDetails);
		expect(matchScreenByName(screens, "")).toBeNull();
		expect(matchScreenByName(screens, "   ")).toBeNull();
		expect(matchScreenByName(screens, null)).toBeNull();
		expect(matchScreenByName(screens, undefined)).toBeNull();
		expect(matchScreenByName(screens, "Samsung LC24")).toBeNull();
		expect(matchScreenByName([], "secondary")).toBeNull();
	});

	it("labels unnamed screens by position", () => {
		const screens = listScreens({ screens: [makeScreen({ label: "" })] });
		expect(screens[0].label).toBe("Display 1");
	});

	it("builds window features from the working area of the target screen", () => {
		const screens = listScreens(dualScreenDetails);
		const target = matchScreenByName(screens, "secondary")!;

		expect(buildWindowFeatures(target)).toBe(
			"popup=yes,fullscreen=yes,left=1920,top=0,width=1280,height=1024,resizable=yes,scrollbars=yes",
		);
	});
});
