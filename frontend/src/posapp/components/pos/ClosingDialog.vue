<template>
	<v-dialog v-model="closingDialog" max-width="900px" persistent>
		<v-card elevation="8" class="closing-dialog-card">
			<ClosingHeader @close="closeDialog" />

			<v-card-text class="pa-0 white-background">
				<v-container class="pa-6">
					<v-row class="mb-6">
						<v-col cols="12" class="pa-1">
							<ShiftOverview
								:loading="overviewLoading"
								:primary-insights="primaryInsights"
								:secondary-insights="secondaryInsights"
								:multi-currency-totals="multiCurrencyTotals"
								:credit-invoices-by-currency="creditInvoicesByCurrency"
								:returns-by-currency="returnsByCurrency"
								:change-returned-rows="changeReturnedRows"
								:cash-expected-by-currency="cashExpectedByCurrency"
								:payments-by-mode="paymentsByMode"
								:overview-company-currency="overviewCompanyCurrency"
								:format-currency-with-symbol="formatCurrencyWithSymbol"
								:should-show-company-equivalent="shouldShowCompanyEquivalent"
								:show-exchange-rates="showExchangeRates"
								:format-exchange-rates="formatExchangeRates"
								:is-cash-mode="isCashMode"
								:overpayment-deduction-for-currency="overpaymentDeductionForCurrency"
							/>
						</v-col>
					</v-row>
					<v-row>
						<v-col cols="12" class="pa-1">
							<PaymentReconciliation
								:payments="dialog_data.payment_reconciliation"
								:headers="headers"
								:items-per-page="itemsPerPage"
								:company-currency-symbol="companyCurrencySymbol"
								:format-currency="formatCurrency"
								:format-float="formatFloat"
							/>
						</v-col>
					</v-row>
				</v-container>
			</v-card-text>

			<v-divider></v-divider>
			<v-card-actions class="dialog-actions-container">
				<v-spacer></v-spacer>
				<v-btn
					theme="dark"
					@click="closeDialog"
					class="pos-action-btn cancel-action-btn"
					size="large"
					elevation="2"
				>
					<v-icon start>mdi-close-circle-outline</v-icon>
					<span>{{ __("Close") }}</span>
				</v-btn>
				<v-btn
					theme="dark"
					@click="submitDialog"
					class="pos-action-btn submit-action-btn"
					size="large"
					elevation="2"
				>
					<v-icon start>mdi-check-circle-outline</v-icon>
					<span>{{ __("Submit") }}</span>
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
/* global __ */
import format from "../../format";
import { useUIStore } from "../../stores/uiStore.js";
import { ref, inject, onMounted, onBeforeUnmount, watch } from "vue";
import { useClosingShift } from "../../composables/useClosingShift";
import { useClosingSummary } from "../../composables/useClosingSummary";

import ClosingHeader from "./closing/ClosingHeader.vue";
import ShiftOverview from "./closing/ShiftOverview.vue";
import PaymentReconciliation from "./closing/PaymentReconciliation.vue";

export default {
	name: "ClosingDialog",
	components: {
		ClosingHeader,
		ShiftOverview,
		PaymentReconciliation,
	},
	mixins: [format],
	setup() {
		const uiStore = useUIStore();
		const eventBus = inject("eventBus");
		const __ = inject("__");

		// Initialize composables
		const {
			closingDialog,
			dialog_data,
			overview,
			overviewLoading,
			pos_profile,
			closeDialog,
			fetchOverview,
			submitDialog,
		} = useClosingShift(eventBus);

		// Formatters for summary composable
		// We can't access mixin methods directly in setup easily without binding or updated structure
		// But we can recreate wrappers or use the imported 'format' mixin logic if extracted
		// For now, we'll rely on the methods exposed via the component instance or re-implement helpers
		// Since mixins are Options API, we need to bridge them.
		
		// To properly use the format methods in the composable (if they are pure functions), we should import them.
		// However, format.js exports a mixin object.
		// Let's create a proxy object or just pass the component instance context later.
		// Actually, useClosingSummary only needs pure functions for formatting.
		// Let's replicate strict helpers or refactor format.js to be composable-friendly later.
		// For now, defining the closures that call `this` via a bound context in Options API is standard, 
		// but inside setup() `this` is unavailable.
		
		// Solution: We will pass simple wrapper functions that will be hooked up in `created` 
		// or we can use a temporary format object if we refactor `format.js`.
		
		// Ideally, `format.js` should export standalone functions too. 
		// Assuming we can't change `format.js` drastically right now.
		// We will implement `useClosingSummary` to take the formatting functions as arguments
		// and we will construct them using the `format` mixin logic which is standard.
		// BUT: `format.js` uses `frappe` global. We can implement standard formatters locally in setup using frappe.
		
		const formatters = {
			formatCurrencyWithSymbol: (amount, currency) => {
				const resolvedCurrency = currency || unref(pos_profile)?.currency || "";
				const symbol = get_currency_symbol(resolvedCurrency); // Global frappe function usually
				const formatted = format_currency(amount || 0);
				if (symbol) return `${symbol} ${formatted}`;
				return `${resolvedCurrency} ${formatted}`.trim();
			},
			formatCount: (value) => flt(value || 0, 0), // Global flt/format
			formatCurrency: (amount) => format_currency(amount || 0),
			currencySymbol: (currency) => get_currency_symbol(currency),
			__: (text) => __(text),
		};

		// Helper to use mixin methods from within setup (Standard Vue 3 workaround for mixins)
		// Since we cannot access `this` in setup, we'll implement the logic needed for `useClosingSummary`
		// directly or via helpers that mirror the mixin.
		
		// Actually, let's keep it simple. `useClosingSummary` expects functions.
		// The formatters can be defined here using `frappe` globals which `format.js` likely uses.
		
		const formatCurrency = (v) => window.format_currency(v);
		const formatFloat = (v, d) => window.flt(v, d);
		const currencySymbol = (c) => window.get_currency_symbol(c);
		const translate = (t) => window.__(t);

		const summaryFormatters = {
			formatCurrencyWithSymbol: (amount, currency) => {
				const resolvedCurrency = currency || "";
				const symbol = currencySymbol(resolvedCurrency);
				const formatted = formatCurrency(amount || 0);
				if (symbol) return `${symbol} ${formatted}`;
				return `${resolvedCurrency} ${formatted}`.trim();
			},
			formatCount: (value) => formatFloat(value || 0, 0),
			formatCurrency,
			currencySymbol,
			__: translate,
		};

		const summary = useClosingSummary(overview, pos_profile, dialog_data, summaryFormatters);

		return {
			uiStore,
			eventBus,
			closingDialog,
			dialog_data,
			overview,
			overviewLoading,
			pos_profile,
			closeDialog,
			fetchOverview,
			submitDialog,
			...summary,
		};
	},
	data: () => ({
		itemsPerPage: 20,
		headers: [],
		baseHeaders: [
			{
				title: __("Mode of Payment"),
				value: "mode_of_payment",
				align: "start",
				sortable: true,
			},
			{
				title: __("Opening Amount"),
				align: "end",
				sortable: true,
				value: "opening_amount",
			},
			{
				title: __("Closing Amount"),
				value: "closing_amount",
				align: "end",
				sortable: true,
			},
		],
		extendedHeaders: [
			{
				title: __("Expected Amount (In Company Currency)"),
				value: "expected_amount",
				align: "end",
				sortable: false,
			},
			{
				title: __("Difference (In Company Currency)"),
				value: "difference",
				align: "end",
				sortable: false,
			},
			{
				title: __("Variance %"),
				value: "variance_percent",
				align: "end",
				sortable: false,
			},
		],
	}),
	created() {
		this.headers = [...this.baseHeaders];
		
		// Re-wiring event bus here as we moved the logic to composable
		// logic moved to setup ? No, event bus listeners are best in lifecycle hooks or setup
		// We can listen in created/mounted using the exposed methods from setup
		
		this.eventBus.on("open_ClosingDialog", (data) => {
			this.closingDialog = true;
			this.dialog_data = data;
			// We need to pass the currency from profile if available globally or fetch it
			// The fetchOverview logic now resides in useClosingShift
			// But we need to call it. 
			
			// We exposed fetchOverview from setup, so we can call it here.
			this.fetchOverview(data.pos_opening_shift, this.pos_profile?.currency);
		});

		this.$watch(
			() => this.uiStore.posProfile,
			(profile) => {
				if (profile) {
					this.pos_profile = profile;
					if (!this.pos_profile.hide_expected_amount) {
						this.headers = [...this.baseHeaders, ...this.extendedHeaders];
					} else {
						this.headers = [...this.baseHeaders];
					}
				}
			},
			{ deep: true, immediate: true }
		);
	},
	methods: {
		handleKeydown(event) {
			if (event.key === "Escape" && this.closingDialog) {
				this.closeDialog();
			}
		},
	},
	mounted() {
		window.addEventListener("keydown", this.handleKeydown);
	},
	beforeUnmount() {
		this.eventBus.off("open_ClosingDialog");
		window.removeEventListener("keydown", this.handleKeydown);
	},
};
</script>

<style scoped>
.closing-dialog-card {
	border-radius: 16px;
	overflow: hidden;
}

.white-background {
	background-color: #ffffff;
}

.dialog-actions-container {
	padding: 16px 24px;
	background-color: #f5f5f5;
	border-top: 1px solid #e0e0e0;
}

.pos-action-btn {
	border-radius: 8px;
	text-transform: none;
	font-weight: 600;
	letter-spacing: 0.5px;
	padding: 0 24px;
}

.cancel-action-btn {
	background-color: #ffffff !important;
	color: #757575 !important;
	border: 1px solid #e0e0e0;
}

.submit-action-btn {
	background-color: #4caf50 !important;
	color: #ffffff !important;
	margin-left: 16px;
}
</style>
