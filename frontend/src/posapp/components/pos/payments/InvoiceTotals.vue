<template>
	<v-row v-if="invoice_doc" class="invoice-totals-grid">
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Net Total')"
				class="sleek-field pos-themed-input"
				:model-value="formatCurrency(invoice_doc.net_total, displayCurrency)"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Tax and Charges')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.total_taxes_and_charges, displayCurrency)"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Total Amount')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.total, displayCurrency)"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="diff_label"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="
					formatCurrency(diff_payment < 0 ? -diff_payment : diff_payment, displayCurrency)
				"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Item / Rate Discounts')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(itemDiscountTotal)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12">
			<div class="discount-context-card">
				<div class="discount-context-card__icon">
					<v-icon icon="mdi-information-outline" size="18" />
				</div>
				<div class="discount-context-card__copy">
					<strong>{{ frappe._("Discount clarity") }}</strong>
					<span>
						{{
							frappe._(
								"Item and rate discounts are already included in item rates and Net Total.",
							)
						}}
						{{
							frappe._(
								"Additional Discount is the separate invoice-level discount.",
							)
						}}
					</span>
				</div>
			</div>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Additional Discount')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.discount_amount)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Total Discount')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(totalDiscountAmount)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Grand Total')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.grand_total)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col v-if="invoice_doc && invoice_doc.rounded_total" cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Rounded Total')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.rounded_total)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
	</v-row>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
	invoice_doc: Object,
	displayCurrency: String,
	diff_payment: Number,
	diff_label: String,
	itemDiscountTotal: {
		type: Number,
		default: 0,
	},
	currencySymbol: Function,
	formatCurrency: Function,
});

const frappe = window.frappe;

const toNumber = (value) => {
	const parsed = Number(value || 0);
	return Number.isFinite(parsed) ? parsed : 0;
};

const totalDiscountAmount = computed(
	() =>
		Math.abs(toNumber(props.itemDiscountTotal)) +
		Math.abs(toNumber(props.invoice_doc?.discount_amount)),
);
</script>

<style scoped>
.invoice-totals-grid {
	margin: 0;
	row-gap: var(--pos-space-2);
}

.invoice-totals-grid :deep(.v-col) {
	padding-top: 0;
	padding-bottom: 0;
}

.invoice-totals-grid :deep(.v-field) {
	border-radius: var(--pos-radius-sm);
	background: var(--pos-surface-raised);
}

.discount-context-card {
	display: flex;
	align-items: flex-start;
	gap: var(--pos-space-2);
	padding: 10px 12px;
	border-radius: var(--pos-radius-sm);
	background:
		linear-gradient(
			135deg,
			rgba(var(--v-theme-info), 0.12),
			rgba(var(--v-theme-info), 0.04)
		),
		var(--pos-surface-raised);
	border: 1px solid rgba(var(--v-theme-info), 0.22);
	color: var(--pos-text-primary);
}

.discount-context-card__icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 999px;
	background: rgba(var(--v-theme-info), 0.14);
	color: rgb(var(--v-theme-info));
	flex: 0 0 auto;
}

.discount-context-card__copy {
	display: flex;
	flex-direction: column;
	gap: 2px;
	font-size: 0.82rem;
	line-height: 1.35;
	color: var(--pos-text-secondary);
}

.discount-context-card__copy strong {
	font-size: 0.78rem;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--pos-text-primary);
}
</style>
