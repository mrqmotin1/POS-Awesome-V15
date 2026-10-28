import { beforeEach, describe, expect, it, vi } from "vitest";

const toastShow = vi.fn();

vi.mock("../src/posapp/stores/toastStore", () => ({
	useToastStore: () => ({
		show: toastShow,
	}),
}));

import { useDiscounts } from "../src/posapp/composables/pos/shared/useDiscounts";
import { setManagerMode } from "../src/posapp/utils/useManagerMode";

const makeContext = () => ({
	pos_profile: { currency: "USD" },
	price_list_currency: "USD",
	selected_currency: "USD",
	conversion_rate: 1,
	currency_precision: 2,
	float_precision: 4,
	forceUpdate: vi.fn(),
	calc_stock_qty: vi.fn(),
	flt(value: unknown, precision = 2) {
		const numeric = Number(value);
		if (!Number.isFinite(numeric)) {
			return 0;
		}
		return Number(numeric.toFixed(precision));
	},
});

const makeOfferItem = (overrides: Record<string, unknown> = {}) => ({
	rate: 100,
	base_rate: 100,
	price_list_rate: 100,
	base_price_list_rate: 100,
	discount_amount: 0,
	base_discount_amount: 0,
	discount_percentage: 0,
	qty: 1,
	_manual_rate_set: false,
	_manual_rate_set_from_uom: false,
	_offer_constraints: {},
	...overrides,
});

describe("useDiscounts offer price enforcement", () => {
	beforeEach(() => {
		toastShow.mockReset();
		(globalThis as any).__ = (text: string) => text;
		(globalThis as any).flt = (value: unknown, precision = 2) => {
			const numeric = Number(value);
			if (!Number.isFinite(numeric)) {
				return 0;
			}
			return Number(numeric.toFixed(precision));
		};
	});

	it("clamps rate edits to the floor derived from max discount amount", () => {
		const context = makeContext();
		const item = makeOfferItem({
			_offer_constraints: {
				max_base_discount_amount: 20,
			},
		});

		const { calcPrices } = useDiscounts();
		calcPrices(item, 60, { target: { id: "rate" } }, context);

		expect(item.base_rate).toBeCloseTo(80);
		expect(item.rate).toBeCloseTo(80);
		expect(item.base_discount_amount).toBeCloseTo(20);
		expect(item.discount_amount).toBeCloseTo(20);
		expect(item.discount_percentage).toBeCloseTo(20);
		expect(toastShow).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Rate adjusted to maximum allowed discount",
			}),
		);
	});

	it("restores previous values when discount amount exceeds offer criteria", () => {
		const context = makeContext();
		const item = makeOfferItem({
			_offer_constraints: {
				max_base_discount_amount: 20,
			},
		});

		const { calcPrices } = useDiscounts();
		calcPrices(item, 35, { target: { id: "discount_amount" } }, context);

		expect(item.base_rate).toBeCloseTo(100);
		expect(item.rate).toBeCloseTo(100);
		expect(item.base_discount_amount).toBeCloseTo(0);
		expect(item.discount_amount).toBeCloseTo(0);
		expect(toastShow).toHaveBeenCalledWith(
			expect.objectContaining({
				title: "Offer criteria exceeded",
			}),
		);
	});
});

describe("useDiscounts non-manager item discount cap", () => {
	const cappedContext = () => ({
		...makeContext(),
		pos_profile: {
			currency: "USD",
			posa_max_discount_allowed: 7,
			posa_cap_item_discount_for_non_managers: 1,
		},
	});

	beforeEach(() => {
		toastShow.mockReset();
		setManagerMode(false);
		(globalThis as any).__ = (text: string) => text;
		(globalThis as any).flt = (value: unknown, precision = 2) => {
			const numeric = Number(value);
			if (!Number.isFinite(numeric)) {
				return 0;
			}
			return Number(numeric.toFixed(precision));
		};
	});

	it("caps a cashier's discount at the POS Profile max", () => {
		const item = makeOfferItem({ _offer_constraints: undefined });

		const { calcPrices } = useDiscounts();
		calcPrices(item, 15, { target: { id: "discount_percentage" } }, cappedContext());

		expect(item.discount_percentage).toBeCloseTo(7);
		expect(item.rate).toBeCloseTo(93);
		expect(toastShow).toHaveBeenCalledWith(
			expect.objectContaining({ title: "Discount limited by POS Profile" }),
		);
	});

	it("caps a rate cut that implies a larger discount", () => {
		const item = makeOfferItem({ _offer_constraints: undefined });

		const { calcPrices } = useDiscounts();
		calcPrices(item, 80, { target: { id: "rate" } }, cappedContext());

		expect(item.discount_percentage).toBeCloseTo(7);
		expect(item.rate).toBeCloseTo(93);
	});

	it("does not cap a Counter Manager", () => {
		setManagerMode(true);
		const item = makeOfferItem({ _offer_constraints: undefined });

		const { calcPrices } = useDiscounts();
		calcPrices(item, 15, { target: { id: "discount_percentage" } }, cappedContext());

		expect(item.discount_percentage).toBeCloseTo(15);
		expect(item.rate).toBeCloseTo(85);
		setManagerMode(false);
	});

	it("leaves discounts alone when the profile does not enable the cap", () => {
		const context = cappedContext();
		context.pos_profile.posa_cap_item_discount_for_non_managers = 0;
		const item = makeOfferItem({ _offer_constraints: undefined });

		const { calcPrices } = useDiscounts();
		calcPrices(item, 15, { target: { id: "discount_percentage" } }, context);

		expect(item.discount_percentage).toBeCloseTo(15);
	});
});
