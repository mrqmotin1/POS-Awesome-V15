import { describe, expect, it } from "vitest";
import {
	buildBootstrapSnapshot,
	validateBootstrapSnapshot,
} from "../src/offline/bootstrapSnapshot";

describe("bootstrap snapshot", () => {
	it("returns confirmation_required on build mismatch", () => {
		const snapshot = buildBootstrapSnapshot({
			buildVersion: "build-1",
			profileName: "Main POS",
			profileModified: "2026-04-08 10:00:00",
			openingShiftName: "POS-OPEN-1",
			openingShiftUser: "test@example.com",
			prerequisites: {
				pos_profile: "ready",
				pos_opening_shift: "ready",
				payment_methods: "ready",
			},
		});

		const result = validateBootstrapSnapshot(snapshot, {
			buildVersion: "build-2",
			profileName: "Main POS",
			profileModified: "2026-04-08 10:00:00",
			sessionUser: "test@example.com",
		});

		expect(result.mode).toBe("confirmation_required");
		expect(result.reasons).toContain("build_version_mismatch");
	});

	it("returns limited mode when matching snapshot is incomplete", () => {
		const result = validateBootstrapSnapshot(
			buildBootstrapSnapshot({
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				openingShiftName: "POS-OPEN-1",
				openingShiftUser: "test@example.com",
				prerequisites: {
					pos_profile: "ready",
					pos_opening_shift: "ready",
					payment_methods: "missing",
				},
			}),
			{
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				sessionUser: "test@example.com",
			},
		);

		expect(result.mode).toBe("limited");
		expect(result.missingPrerequisites).toContain("payment_methods");
	});

	it("returns invalid when opening shift belongs to a different user", () => {
		const result = validateBootstrapSnapshot(
			buildBootstrapSnapshot({
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				openingShiftName: "POS-OPEN-1",
				openingShiftUser: "another@example.com",
				prerequisites: {
					pos_profile: "ready",
					pos_opening_shift: "ready",
					payment_methods: "ready",
				},
			}),
			{
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				sessionUser: "test@example.com",
			},
		);

		expect(result.mode).toBe("invalid");
		expect(result.reasons).toContain("opening_shift_user_mismatch");
	});

	it("disables pricing capability when pricing prerequisites are missing", () => {
		const result = validateBootstrapSnapshot(
			buildBootstrapSnapshot({
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				openingShiftName: "POS-OPEN-1",
				openingShiftUser: "test@example.com",
				prerequisites: {
					pos_profile: "ready",
					pos_opening_shift: "ready",
					payment_methods: "ready",
					pricing_rules_snapshot: "missing",
					pricing_rules_context: "missing",
				},
			}),
			{
				buildVersion: "build-2",
				profileName: "Main POS",
				profileModified: "2026-04-08 10:00:00",
				sessionUser: "test@example.com",
			},
		);

		expect(result.mode).toBe("limited");
		expect(result.capabilities.canApplyPricingOffline).toBe(false);
		expect(result.capabilities.canSellOffline).toBe(true);
	});
});
