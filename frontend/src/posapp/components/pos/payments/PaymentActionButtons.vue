<template>
	<v-card flat :class="['cards mb-0 mt-3 pa-0', { compact }]">
		<v-row align="start" no-gutters>
			<v-col cols="6">
				<v-btn
					ref="submitButton"
					block
					size="large"
					color="primary"
					theme="dark"
					class="submit-btn payment-footer-btn"
					@click="$emit('submit')"
					:loading="loading"
					:disabled="loading || validatePayment"
					:class="{ 'submit-highlight': highlightSubmit }"
				>
					{{ __("Submit") }}
				</v-btn>
			</v-col>
			<v-col cols="6" class="pl-1">
				<v-btn
					block
					size="large"
					color="success"
					theme="dark"
					class="payment-footer-btn"
					@click="$emit('submit-and-print')"
					:loading="loading"
					:disabled="loading || validatePayment"
				>
					{{ __("Submit & Print") }}
				</v-btn>
			</v-col>
			<v-col cols="12">
				<v-btn
					block
					size="large"
					color="error"
					theme="dark"
					variant="flat"
					class="mt-2 pa-1 payment-footer-btn"
					@click="$emit('cancel')"
				>
					{{ __("Cancel Payment") }}
				</v-btn>
			</v-col>
		</v-row>
	</v-card>
</template>

<script setup>
defineProps({
	loading: Boolean,
	validatePayment: Boolean,
	highlightSubmit: Boolean,
	compact: Boolean,
});

defineEmits(["submit", "submit-and-print", "cancel"]);

const __ = window.__;
</script>

<style scoped>
.cards {
	background: transparent !important;
}

.compact :deep(.v-btn),
:deep(.compact .v-btn) {
	min-height: 42px;
}

.payment-footer-btn {
	transition:
		filter 0.18s ease,
		box-shadow 0.18s ease,
		transform 0.18s ease !important;
}

.payment-footer-btn:hover,
.payment-footer-btn:focus,
.payment-footer-btn:focus-visible,
.payment-footer-btn:active {
	filter: brightness(0.94);
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18) !important;
	transform: translateY(-1px);
}

.payment-footer-btn:active {
	transform: translateY(0);
}

.payment-footer-btn :deep(.v-btn__overlay),
.payment-footer-btn :deep(.v-btn__underlay) {
	opacity: 0 !important;
	background: transparent !important;
}
</style>
