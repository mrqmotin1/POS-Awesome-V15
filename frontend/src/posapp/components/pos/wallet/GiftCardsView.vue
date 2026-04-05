<template>
	<v-card class="gift-cards-view pos-themed-card">
		<div class="gift-cards-view__header">
			<div>
				<p class="gift-cards-view__eyebrow">{{ __("Gift Cards") }}</p>
				<h2 class="gift-cards-view__title">{{ __("Gift Card Management") }}</h2>
				<p class="gift-cards-view__subtitle">
					{{ __("Check balance for any card. Supervisors can issue and top up cards here.") }}
				</p>
			</div>
		</div>

		<div class="gift-cards-view__body">
			<div v-if="isSupervisor" class="gift-cards-view__modes">
				<v-btn variant="tonal" size="small" @click="mode = 'issue'">
					{{ __("Issue New Card") }}
				</v-btn>
				<v-btn variant="tonal" size="small" @click="mode = 'top_up'">
					{{ __("Top Up Card") }}
				</v-btn>
				<v-btn variant="tonal" size="small" @click="mode = 'check'">
					{{ __("Check Balance") }}
				</v-btn>
			</div>

			<v-text-field
				v-model="cardCode"
				:label="__('Gift Card Code')"
				variant="outlined"
				density="compact"
			/>

			<v-text-field
				v-if="mode !== 'check'"
				v-model="amount"
				:label="mode === 'issue' ? __('Initial Amount') : __('Top Up Amount')"
				variant="outlined"
				density="compact"
				type="number"
				min="0"
			/>

			<v-alert v-if="message" :type="messageType" variant="tonal" density="compact">
				{{ message }}
			</v-alert>

			<div class="gift-cards-view__stats">
				<div class="gift-cards-view__stat">
					<span>{{ __("Status") }}</span>
					<strong>{{ status || __("Unknown") }}</strong>
				</div>
				<div class="gift-cards-view__stat">
					<span>{{ __("Balance") }}</span>
					<strong>{{ formatCurrency(balance) }}</strong>
				</div>
			</div>

			<div class="gift-cards-view__actions">
				<v-btn variant="tonal" :loading="loading" @click="checkBalance">
					{{ __("Check Balance") }}
				</v-btn>
				<v-btn
					v-if="isSupervisor && mode === 'issue'"
					color="primary"
					variant="flat"
					:loading="loading"
					@click="issueCard"
				>
					{{ __("Issue New Card") }}
				</v-btn>
				<v-btn
					v-else-if="isSupervisor && mode === 'top_up'"
					color="primary"
					variant="flat"
					:loading="loading"
					@click="topUpCard"
				>
					{{ __("Top Up Card") }}
				</v-btn>
			</div>
		</div>
	</v-card>
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";

import { useEmployeeStore } from "../../../stores/employeeStore";
import { useUIStore } from "../../../stores/uiStore";

const __ = window.__;
const frappe = window.frappe;

const employeeStore = useEmployeeStore();
const uiStore = useUIStore();
const { currentCashier } = storeToRefs(employeeStore);
const { posProfile } = storeToRefs(uiStore);

const cardCode = ref("");
const amount = ref("");
const balance = ref(0);
const status = ref("");
const loading = ref(false);
const message = ref("");
const messageType = ref("info");
const mode = ref("check");

const isSupervisor = computed(() => Boolean(currentCashier.value?.is_supervisor));

const flt = (value) => {
	if (typeof window !== "undefined" && typeof window.flt === "function") {
		return window.flt(value || 0, 2);
	}
	return Number(value || 0);
};

const formatCurrency = (value) => {
	const numeric = flt(value);
	const formatter = typeof window?.format_currency === "function" ? window.format_currency : null;
	return formatter
		? formatter(numeric, posProfile.value?.currency || "")
		: `${posProfile.value?.currency || ""} ${numeric}`.trim();
};

const setMessage = (text, type = "info") => {
	message.value = text || "";
	messageType.value = type;
};

const checkBalance = async () => {
	if (!cardCode.value || !posProfile.value?.company) {
		setMessage(__("Gift card code is required."), "warning");
		return;
	}

	loading.value = true;
	setMessage("");
	try {
		const response = await frappe.call({
			method: "posawesome.posawesome.api.gift_cards.check_gift_card_balance",
			args: {
				gift_card_code: cardCode.value,
				company: posProfile.value.company,
			},
		});
		const card = response?.message || {};
		balance.value = flt(card.current_balance || 0);
		status.value = card.status || "";
		setMessage(__("Gift card loaded successfully."), "success");
	} catch (error) {
		setMessage(error?.message || __("Unable to load gift card balance."), "error");
	} finally {
		loading.value = false;
	}
};

const issueCard = async () => {
	if (!isSupervisor.value) {
		setMessage(__("A POS supervisor is required for this action."), "warning");
		return;
	}

	loading.value = true;
	setMessage("");
	try {
		const response = await frappe.call({
			method: "posawesome.posawesome.api.gift_cards.issue_gift_card",
			args: {
				pos_profile: posProfile.value?.name,
				cashier: currentCashier.value?.user,
				company: posProfile.value?.company,
				initial_amount: flt(amount.value || 0),
				gift_card_code: cardCode.value || null,
				currency: posProfile.value?.currency,
			},
		});
		const card = response?.message || {};
		cardCode.value = card.gift_card_code || cardCode.value;
		balance.value = flt(card.current_balance || 0);
		status.value = card.status || "Active";
		mode.value = "check";
		setMessage(__("Gift card issued successfully."), "success");
	} catch (error) {
		setMessage(error?.message || __("Unable to issue gift card."), "error");
	} finally {
		loading.value = false;
	}
};

const topUpCard = async () => {
	if (!isSupervisor.value) {
		setMessage(__("A POS supervisor is required for this action."), "warning");
		return;
	}

	loading.value = true;
	setMessage("");
	try {
		const response = await frappe.call({
			method: "posawesome.posawesome.api.gift_cards.top_up_gift_card",
			args: {
				pos_profile: posProfile.value?.name,
				cashier: currentCashier.value?.user,
				gift_card_code: cardCode.value,
				amount: flt(amount.value || 0),
			},
		});
		const card = response?.message || {};
		balance.value = flt(card.current_balance || 0);
		status.value = card.status || "Active";
		mode.value = "check";
		setMessage(__("Gift card topped up successfully."), "success");
	} catch (error) {
		setMessage(error?.message || __("Unable to top up gift card."), "error");
	} finally {
		loading.value = false;
	}
};
</script>

<style scoped>
.gift-cards-view {
	margin: 12px;
	border-radius: 20px;
}

.gift-cards-view__header {
	padding: 20px 20px 0;
}

.gift-cards-view__eyebrow {
	margin: 0 0 6px;
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.gift-cards-view__title {
	margin: 0;
	font-size: 1.25rem;
	color: var(--pos-text-primary);
}

.gift-cards-view__subtitle {
	margin: 8px 0 0;
	color: var(--pos-text-secondary);
}

.gift-cards-view__body {
	display: flex;
	flex-direction: column;
	gap: 14px;
	padding: 20px;
}

.gift-cards-view__modes {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.gift-cards-view__stats {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 12px;
}

.gift-cards-view__stat {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 12px;
	border-radius: 14px;
	border: 1px solid var(--pos-border-light);
	background: var(--pos-surface-muted);
}

.gift-cards-view__stat span {
	font-size: 0.78rem;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--pos-text-secondary);
}

.gift-cards-view__stat strong {
	font-size: 1rem;
	color: var(--pos-text-primary);
}

.gift-cards-view__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
}
</style>
