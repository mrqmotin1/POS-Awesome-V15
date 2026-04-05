<template>
	<v-dialog
		:model-value="modelValue"
		max-width="520"
		@update:model-value="$emit('update:modelValue', $event)"
	>
		<v-card class="gift-card-dialog">
			<div class="gift-card-dialog__header">
				<div>
					<h3 class="gift-card-dialog__title">{{ __("Gift Card") }}</h3>
					<p class="gift-card-dialog__subtitle">
						{{ __("Scan or enter a gift card code to check balance or redeem.") }}
					</p>
				</div>
			</div>

			<v-card-text class="gift-card-dialog__content">
				<div v-if="isSupervisor" class="gift-card-dialog__modes">
					<v-btn variant="tonal" size="small" @click="$emit('set-mode', 'issue')">
						{{ __("Issue New Card") }}
					</v-btn>
					<v-btn variant="tonal" size="small" @click="$emit('set-mode', 'top_up')">
						{{ __("Top Up Card") }}
					</v-btn>
					<v-btn variant="tonal" size="small" @click="$emit('set-mode', 'redeem')">
						{{ __("Redeem") }}
					</v-btn>
				</div>

				<v-text-field
					:model-value="cardCode"
					:label="__('Gift Card Code')"
					variant="solo"
					density="compact"
					hide-details
					@update:model-value="$emit('update:cardCode', $event)"
				/>

				<div class="gift-card-dialog__stats">
					<p><strong>{{ __("Status") }}:</strong> {{ status || __("Unknown") }}</p>
					<p><strong>{{ __("Balance") }}:</strong> {{ balance }}</p>
				</div>

				<v-text-field
					v-if="mode === 'redeem'"
					:model-value="redeemAmount"
					:label="__('Redeem Amount')"
					variant="solo"
					density="compact"
					hide-details
					@update:model-value="$emit('update:redeemAmount', $event)"
				/>

				<v-text-field
					v-else
					:model-value="redeemAmount"
					:label="mode === 'issue' ? __('Initial Amount') : __('Top Up Amount')"
					variant="solo"
					density="compact"
					hide-details
					@update:model-value="$emit('update:redeemAmount', $event)"
				/>

				<p v-if="errorMessage" class="gift-card-dialog__error">{{ errorMessage }}</p>
			</v-card-text>

			<v-card-actions class="gift-card-dialog__actions">
				<v-btn variant="text" @click="$emit('update:modelValue', false)">
					{{ __("Close") }}
				</v-btn>
				<v-btn variant="tonal" :disabled="loading" @click="$emit('check-balance')">
					{{ __("Check Balance") }}
				</v-btn>
				<v-btn
					v-if="mode === 'redeem'"
					color="primary"
					variant="flat"
					:disabled="loading"
					@click="$emit('apply-redemption')"
				>
					{{ __("Apply Redemption") }}
				</v-btn>
				<v-btn
					v-else-if="mode === 'issue'"
					color="primary"
					variant="flat"
					:disabled="loading"
					@click="$emit('issue-card')"
				>
					{{ __("Issue New Card") }}
				</v-btn>
				<v-btn
					v-else
					color="primary"
					variant="flat"
					:disabled="loading"
					@click="$emit('top-up-card')"
				>
					{{ __("Top Up Card") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup>
defineProps({
	modelValue: {
		type: Boolean,
		default: false,
	},
	cardCode: {
		type: String,
		default: "",
	},
	redeemAmount: {
		type: [Number, String],
		default: 0,
	},
	balance: {
		type: [Number, String],
		default: 0,
	},
	status: {
		type: String,
		default: "",
	},
	isSupervisor: {
		type: Boolean,
		default: false,
	},
	loading: {
		type: Boolean,
		default: false,
	},
	mode: {
		type: String,
		default: "redeem",
	},
	errorMessage: {
		type: String,
		default: "",
	},
});

defineEmits([
	"update:modelValue",
	"update:cardCode",
	"update:redeemAmount",
	"set-mode",
	"check-balance",
	"apply-redemption",
	"issue-card",
	"top-up-card",
]);

const __ = window.__;
</script>

<style scoped>
.gift-card-dialog {
	border-radius: var(--pos-radius-lg);
}

.gift-card-dialog__header {
	padding: var(--pos-space-4) var(--pos-space-4) 0;
}

.gift-card-dialog__title {
	margin: 0;
	font-size: 1.1rem;
	font-weight: 700;
}

.gift-card-dialog__subtitle {
	margin: 6px 0 0;
	color: var(--pos-text-secondary);
	font-size: 0.92rem;
}

.gift-card-dialog__content {
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-3);
}

.gift-card-dialog__modes {
	display: flex;
	flex-wrap: wrap;
	gap: var(--pos-space-2);
}

.gift-card-dialog__stats p {
	margin: 0;
}

.gift-card-dialog__actions {
	padding: 0 var(--pos-space-4) var(--pos-space-4);
	gap: var(--pos-space-2);
}

.gift-card-dialog__error {
	margin: 0;
	color: rgb(var(--v-theme-error));
	font-weight: 600;
}
</style>
