<template>
	<div v-if="enabled" class="gift-card-entry">
		<div class="gift-card-entry__copy">
			<div class="gift-card-entry__label-row">
				<p class="gift-card-entry__label">{{ __("Gift Card") }}</p>
				<span class="gift-card-entry__state" :class="{ 'gift-card-entry__state--applied': appliedAmount > 0 }">
					{{ appliedAmount > 0 ? __("Applied") : __("Ready") }}
				</span>
			</div>
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
			<div class="gift-card-entry__meta">
				<span class="gift-card-entry__meta-pill">{{ __("Scan-First Flow") }}</span>
				<span v-if="cardCode" class="gift-card-entry__meta-pill gift-card-entry__meta-pill--code">
					{{ cardCode }}
				</span>
			</div>
		</div>
		<div class="gift-card-entry__actions">
			<v-btn color="primary" variant="flat" @click="$emit('open')">
				{{ appliedAmount > 0 ? __("Review / Edit") : __("Redeem / Scan") }}
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
	padding: 16px;
	border-radius: 18px;
	border: 1px solid rgba(var(--v-theme-primary), 0.12);
	background:
		radial-gradient(circle at top left, rgba(var(--v-theme-primary), 0.14), transparent 34%),
		linear-gradient(180deg, rgba(var(--v-theme-primary), 0.06) 0%, var(--pos-surface-raised) 100%);
	box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.gift-card-entry__copy {
	min-width: 0;
}

.gift-card-entry__label-row {
	display: flex;
	align-items: center;
	gap: 8px;
	margin-bottom: 4px;
}

.gift-card-entry__label {
	margin: 0;
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.gift-card-entry__state,
.gift-card-entry__meta-pill {
	display: inline-flex;
	align-items: center;
	padding: 6px 10px;
	border-radius: 999px;
	font-size: 0.74rem;
	font-weight: 700;
}

.gift-card-entry__state {
	background: rgba(var(--v-theme-primary), 0.1);
	color: var(--pos-text-secondary);
}

.gift-card-entry__state--applied {
	background: rgba(var(--v-theme-success), 0.12);
	color: rgb(var(--v-theme-success));
}

.gift-card-entry__title {
	margin: 0;
	font-size: 1.02rem;
	font-weight: 700;
	color: var(--pos-text-primary);
}

.gift-card-entry__subtitle {
	margin: 6px 0 0;
	font-size: 0.85rem;
	color: var(--pos-text-secondary);
}

.gift-card-entry__meta {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin-top: 12px;
}

.gift-card-entry__meta-pill {
	background: rgba(var(--v-theme-surface), 0.88);
	color: var(--pos-text-secondary);
	border: 1px solid rgba(var(--v-theme-primary), 0.1);
}

.gift-card-entry__meta-pill--code {
	color: var(--pos-text-primary);
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
