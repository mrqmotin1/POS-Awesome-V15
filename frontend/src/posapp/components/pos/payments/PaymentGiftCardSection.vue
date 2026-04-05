<template>
	<div v-if="enabled" class="gift-card-entry">
		<div class="gift-card-entry__copy">
			<p class="gift-card-entry__label">{{ __("Gift Card") }}</p>
			<h4 class="gift-card-entry__title">{{ __("Redeem or scan a prepaid gift card") }}</h4>
			<p class="gift-card-entry__subtitle">
				<template v-if="appliedAmount > 0">
					{{ __("Applied") }} {{ formatCurrency(appliedAmount) }} {{ __("from") }}
					{{ cardCode || __("gift card") }}
				</template>
				<template v-else>
					{{ __("Use barcode, QR scan, or manual code entry.") }}
				</template>
			</p>
		</div>
		<div class="gift-card-entry__actions">
			<v-btn color="primary" variant="flat" @click="$emit('open')">
				{{ __("Redeem / Scan") }}
			</v-btn>
			<v-btn
				v-if="appliedAmount > 0"
				variant="tonal"
				color="warning"
				@click="$emit('clear')"
			>
				{{ __("Clear") }}
			</v-btn>
		</div>
	</div>
</template>

<script setup>
defineProps({
	enabled: {
		type: Boolean,
		default: false,
	},
	appliedAmount: {
		type: Number,
		default: 0,
	},
	cardCode: {
		type: String,
		default: "",
	},
	formatCurrency: {
		type: Function,
		required: true,
	},
});

defineEmits(["open", "clear"]);

const __ = window.__;
</script>

<style scoped>
.gift-card-entry {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--pos-space-3);
	padding: var(--pos-space-3);
	border-radius: var(--pos-radius-md);
	border: 1px solid var(--pos-border-light);
	background: linear-gradient(
		180deg,
		rgba(var(--v-theme-primary), 0.08) 0%,
		var(--pos-surface-raised) 100%
	);
}

.gift-card-entry__copy {
	min-width: 0;
}

.gift-card-entry__label {
	margin: 0 0 4px;
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.gift-card-entry__title {
	margin: 0;
	font-size: 1rem;
	font-weight: 700;
	color: var(--pos-text-primary);
}

.gift-card-entry__subtitle {
	margin: 6px 0 0;
	font-size: 0.85rem;
	color: var(--pos-text-secondary);
}

.gift-card-entry__actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--pos-space-2);
	justify-content: flex-end;
}

@media (max-width: 768px) {
	.gift-card-entry {
		flex-direction: column;
		align-items: stretch;
	}

	.gift-card-entry__actions {
		justify-content: stretch;
	}
}
</style>
