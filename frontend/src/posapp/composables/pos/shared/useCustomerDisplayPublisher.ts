import {
	computed,
	onBeforeUnmount,
	onMounted,
	watch,
	type Ref,
} from "vue";
import { useInvoiceStore } from "../../../stores/invoiceStore";
import { useCustomersStore } from "../../../stores/customersStore";
import {
	buildCustomerDisplayUrl,
	createCustomerDisplayTransport,
	getAutoOpenMarkerKey,
	getOrCreateCustomerDisplayChannelId,
	isCustomerDisplayEnabled,
	shouldAutoOpenCustomerDisplay,
	type CustomerDisplayLineItem,
	type CustomerDisplaySnapshot,
} from "../../../utils/customerDisplay";
import {
	buildWindowFeatures,
	listScreens,
	matchScreenByName,
	requestScreenDetails,
	supportsScreenDetails,
	type CustomerDisplayScreen,
} from "../../../utils/customerDisplayScreens";

declare const frappe: any;
declare const __: (_text: string, _args?: any[]) => string;

interface UseCustomerDisplayPublisherOptions {
	posProfile: Ref<any>;
	eventBus?: any;
}

const CUSTOMER_DISPLAY_WINDOW_NAME = "POSA_CUSTOMER_DISPLAY_WINDOW";
// Head start given to the POS window's own boot before the display window
// starts its desk boot, so the two do not deadlock on the session row.
const AUTO_OPEN_SETTLE_MS = 3000;
const CUSTOMER_DISPLAY_WINDOW_FEATURES =
	"popup=yes,width=1280,height=820,left=80,top=60,resizable=yes,scrollbars=yes";

const toNumber = (value: any) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const toFiniteOrNull = (value: any) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
};

const toText = (value: any) => {
	if (value === undefined || value === null) return "";
	return String(value).trim();
};

const toLineItem = (item: any, index: number): CustomerDisplayLineItem => {
	const qty = toNumber(item?.qty);
	const rate = toNumber(item?.rate);
	const amount = qty * rate;

	return {
		id:
			toText(item?.posa_row_id) ||
			toText(item?.item_code) ||
			`line_${index + 1}`,
		item_code: toText(item?.item_code),
		item_name:
			toText(item?.item_name) ||
			toText(item?.item_code) ||
			__("Item"),
		qty,
		rate,
		amount,
		uom: toText(item?.uom || item?.stock_uom),
	};
};

const getCustomerName = (
	invoiceDoc: any,
	customerInfo: Record<string, any>,
	selectedCustomer: string | null,
) =>
	toText(invoiceDoc?.customer_name) ||
	toText(customerInfo?.customer_name) ||
	toText(selectedCustomer);

export function useCustomerDisplayPublisher({
	posProfile,
	eventBus,
}: UseCustomerDisplayPublisherOptions) {
	const invoiceStore = useInvoiceStore();
	const customersStore = useCustomersStore();

	const channelId = getOrCreateCustomerDisplayChannelId();
	const transport = createCustomerDisplayTransport(channelId);

	const isEnabled = computed(() =>
		isCustomerDisplayEnabled(posProfile.value),
	);
	const shouldAutoOpen = computed(() =>
		shouldAutoOpenCustomerDisplay(posProfile.value),
	);
	const autoOpenMarker = computed(() => getAutoOpenMarkerKey(channelId));

	let publishTimer: ReturnType<typeof setTimeout> | null = null;
	// Set by onBeforeUnmount; async opens still in flight check it so a
	// composable whose transport is already closed never opens a window.
	let disposed = false;
	// Resolves the pending waitForPosToSettle() with false, if any.
	let cancelAutoOpenWait: (() => void) | null = null;
	// True from opening on a target monitor until the display reports ready.
	let fullscreenPending = false;

	/**
	 * The display fullscreens itself, since only it can resolve the screen its
	 * own window sits on. It is told to once it says it is listening: the
	 * BroadcastChannel does not queue, and the popup's desk boot takes an
	 * unknown time, so sending on a timer would race it.
	 */
	const unsubscribeControl = transport.subscribeControl((action) => {
		if (action !== "display_ready" || !fullscreenPending) {
			return;
		}
		fullscreenPending = false;
		transport.publishControl("enter_fullscreen");
	});

	const buildSnapshot = (): CustomerDisplaySnapshot => {
		const items = (invoiceStore.items || []).map(toLineItem);
		const total_qty = items.reduce((sum, row) => sum + row.qty, 0);
		const item_total = items.reduce((sum, row) => sum + row.amount, 0);
		const additional_discount = toNumber(invoiceStore.additionalDiscount);
		const delivery_charges = toNumber(invoiceStore.deliveryChargesRate);
		const is_return = Boolean(invoiceStore.invoiceDoc?.is_return);
		const gross_total = is_return ? Math.abs(item_total) : item_total;
		const discount_magnitude = Math.abs(additional_discount);
		const subtotal = gross_total - discount_magnitude + delivery_charges;
		const total_amount = toFiniteOrNull(subtotal) ?? item_total;
		const item_discount = Math.abs(toNumber(invoiceStore.discountTotal));
		const discount_total = item_discount + discount_magnitude;
		const gross_total_pre_discount = gross_total + item_discount;
		const customer_name = getCustomerName(
			invoiceStore.invoiceDoc,
			customersStore.customerInfo,
			customersStore.selectedCustomer,
		);
		const currency =
			toText(posProfile.value?.currency) ||
			toText(invoiceStore.invoiceDoc?.currency);

		return {
			channel_id: channelId,
			currency,
			customer_name,
			items,
			total_qty,
			total_amount,
			gross_total: gross_total_pre_discount,
			discount_total,
			updated_at: new Date().toISOString(),
		};
	};

	const publishSnapshot = () => {
		if (!isEnabled.value) {
			return;
		}
		transport.publish(buildSnapshot());
	};

	const schedulePublish = () => {
		if (!isEnabled.value) {
			return;
		}
		if (publishTimer) {
			clearTimeout(publishTimer);
		}
		publishTimer = setTimeout(() => {
			publishTimer = null;
			publishSnapshot();
		}, 80);
	};

	/**
	 * Resolves the POS Profile "Customer Display Name" to a monitor.
	 * Blank name, unsupported browser, denied permission or an unknown name all
	 * return null, and the display then opens exactly as it did before.
	 *
	 * Nothing here may take long on a click: window.open() runs after it and
	 * the click's activation expires, then the popup is blocked. So the
	 * unsupported case returns at once, and the retry is auto-open only.
	 */
	const resolveTargetScreen = async (
		retryLookup: boolean,
	): Promise<CustomerDisplayScreen | null> => {
		const configuredName = toText(posProfile.value?.posa_customer_display_name);
		if (!configuredName || !supportsScreenDetails()) {
			return null;
		}

		// One retry: on the auto-open path getScreenDetails() can lose a race with
		// the permission state during boot, and opening unplaced is worse than
		// opening a moment later.
		let details = await requestScreenDetails();
		if (!details && retryLookup) {
			await new Promise((resolve) => setTimeout(resolve, 1500));
			details = await requestScreenDetails();
		}
		if (!details) {
			return null;
		}

		const screen = matchScreenByName(listScreens(details), configuredName);
		if (!screen) {
			frappe?.show_alert?.(
				{
					message: __("Customer display screen not found: {0}", [
						configuredName,
					]),
					indicator: "orange",
				},
				5,
			);
		}
		return screen;
	};

	const openCustomerDisplay = async ({ retryLookup = false } = {}) => {
		if (!isEnabled.value) {
			frappe?.show_alert?.(
				{
					message: __("Enable Customer Display in POS Profile first."),
					indicator: "orange",
				},
				4,
			);
			return null;
		}

		const targetScreen = await resolveTargetScreen(retryLookup);
		if (disposed) {
			return null;
		}
		const url = buildCustomerDisplayUrl(channelId);
		const displayWindow = window.open(
			url,
			CUSTOMER_DISPLAY_WINDOW_NAME,
			targetScreen
				? buildWindowFeatures(targetScreen)
				: CUSTOMER_DISPLAY_WINDOW_FEATURES,
		);
		if (!displayWindow) {
			frappe?.show_alert?.(
				{
					message: __(
						"Customer display was blocked. Please allow pop-ups for this site.",
					),
					indicator: "red",
				},
				6,
			);
			return null;
		}

		if (targetScreen) {
			// Window features only apply when a new window is created. A re-open
			// reuses the named window and ignores them, so place it explicitly.
			try {
				displayWindow.moveTo(
					Math.round(targetScreen.availLeft),
					Math.round(targetScreen.availTop),
				);
				displayWindow.resizeTo(
					Math.round(targetScreen.availWidth),
					Math.round(targetScreen.availHeight),
				);
			} catch {
				// Ignore: the browser may refuse to place a reused window.
			}
		}
		// Answered when the display says it is ready; a re-open navigates the
		// named window, so it boots and reports ready again.
		fullscreenPending = Boolean(targetScreen);

		try {
			displayWindow.focus?.();
		} catch {
			// Ignore focus errors when browser restricts window interactions.
		}

		schedulePublish();
		return displayWindow;
	};

	const markAutoOpenDone = () => {
		if (typeof window === "undefined" || !window.sessionStorage) return;
		window.sessionStorage.setItem(autoOpenMarker.value, "1");
	};

	const clearAutoOpenMarker = () => {
		if (typeof window === "undefined" || !window.sessionStorage) return;
		window.sessionStorage.removeItem(autoOpenMarker.value);
	};

	const hasAutoOpened = () => {
		if (typeof window === "undefined" || !window.sessionStorage) return false;
		return window.sessionStorage.getItem(autoOpenMarker.value) === "1";
	};

	/**
	 * Waits until this window has finished loading and gone idle.
	 *
	 * The display window loads /app/posapp, which is a full desk boot. Opening
	 * it while the POS window is still booting puts two desk boots on one
	 * session, and every request writes the same tabSessions row and
	 * User.last_active - MariaDB deadlocks and Frappe reports
	 * "concurrent conflicting request". Letting the POS boot finish first also
	 * warms the session-update throttle, so the display's own boot no longer
	 * writes those rows at all.
	 *
	 * Resolves true when settled, false when cancelled by unmount. It must
	 * always resolve: the caller has already set the auto-open marker and needs
	 * to clear it again, or auto-open stays dead for the rest of the tab session.
	 */
	const waitForPosToSettle = () =>
		new Promise<boolean>((resolve) => {
			if (typeof window === "undefined") {
				resolve(true);
				return;
			}

			let settleTimer: ReturnType<typeof setTimeout> | null = null;
			let idleHandle: number | null = null;

			const finish = (settled: boolean) => {
				cancelAutoOpenWait = null;
				window.removeEventListener("load", afterLoad);
				if (settleTimer) {
					clearTimeout(settleTimer);
					settleTimer = null;
				}
				if (idleHandle !== null) {
					(window as any).cancelIdleCallback?.(idleHandle);
					idleHandle = null;
				}
				resolve(settled);
			};

			const afterLoad = () => {
				settleTimer = setTimeout(() => {
					settleTimer = null;
					const idle = (window as any).requestIdleCallback;
					if (typeof idle === "function") {
						idleHandle = idle(
							() => {
								idleHandle = null;
								finish(true);
							},
							{ timeout: 8000 },
						);
					} else {
						finish(true);
					}
				}, AUTO_OPEN_SETTLE_MS);
			};

			cancelAutoOpenWait = () => finish(false);

			if (document.readyState === "complete") {
				afterLoad();
			} else {
				window.addEventListener("load", afterLoad, { once: true });
			}
		});

	const tryAutoOpen = async () => {
		if (!isEnabled.value || !shouldAutoOpen.value || hasAutoOpened()) {
			return;
		}
		// Marked before awaiting: opening is async now, and the posProfile deep
		// watcher can fire again mid-await and open a second window.
		markAutoOpenDone();
		const settled = await waitForPosToSettle();
		const openedWindow = settled
			? await openCustomerDisplay({ retryLookup: true })
			: null;
		if (!openedWindow) {
			clearAutoOpenMarker();
		}
	};

	const handleOpenRequest = () => {
		openCustomerDisplay();
	};

	onMounted(() => {
		if (eventBus?.on) {
			eventBus.on("open_customer_display", handleOpenRequest);
		}
		tryAutoOpen();
		schedulePublish();
	});

	onBeforeUnmount(() => {
		if (eventBus?.off) {
			eventBus.off("open_customer_display", handleOpenRequest);
		}
		if (publishTimer) {
			clearTimeout(publishTimer);
			publishTimer = null;
		}
		disposed = true;
		fullscreenPending = false;
		cancelAutoOpenWait?.();
		unsubscribeControl();
		transport.close();
	});

	watch(
		() => invoiceStore.metadata.changeVersion,
		() => {
			schedulePublish();
		},
	);

	watch(
		() => [
			invoiceStore.additionalDiscount,
			invoiceStore.additionalDiscountPercentage,
			invoiceStore.discountTotal,
			invoiceStore.deliveryChargesRate,
			invoiceStore.invoiceDoc?.is_return,
		],
		() => {
			schedulePublish();
		},
	);

	watch(
		() => customersStore.selectedCustomer,
		() => {
			schedulePublish();
		},
	);

	watch(
		() => customersStore.customerInfo,
		() => {
			schedulePublish();
		},
		{ deep: true },
	);

	watch(
		posProfile,
		() => {
			tryAutoOpen();
			schedulePublish();
		},
		{ deep: true, immediate: true },
	);

	return {
		channelId,
		openCustomerDisplay,
		publishCustomerDisplaySnapshot: publishSnapshot,
	};
}
