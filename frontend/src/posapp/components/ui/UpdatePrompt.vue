<template>
	<v-dialog v-model="visible" max-width="420" persistent>
		<v-card class="pos-update-dialog pos-themed-card">
			<v-card-title class="d-flex align-center">
				<v-icon size="22" class="mr-2">mdi-alert-decagram</v-icon>
				<span class="text-subtitle-1 font-weight-medium">
					{{ __("New version ready") }}
				</span>
			</v-card-title>
			<v-card-text>
				<div class="text-body-2">
					{{ __("A new update is available. Reload to apply changes.") }}
				</div>
				<div
					class="text-caption text-medium-emphasis mt-2"
					v-if="label || detail || branch"
				>
					<span v-if="label">{{ label }}</span>
					<span v-if="label && (detail || branch)"> • </span>
					<span v-if="detail">{{ detail }}</span>
					<span v-if="detail && branch"> • </span>
					<span v-if="branch">{{ branch }}</span>
				</div>
			</v-card-text>
			<v-card-actions>
				<v-spacer></v-spacer>
				<v-btn variant="text" color="primary" @click="dismiss">
					{{ __("Dismiss") }}
				</v-btn>
				<v-btn variant="elevated" color="primary" @click="reload">
					{{ updateStore.reloading ? __("Updating...") : __("Reload Now") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useUpdateStore } from "../../stores/updateStore";
import { useRtl } from "../../composables/core/useRtl";

defineOptions({
	name: "UpdatePrompt",
});

const updateStore = useUpdateStore();
const { isRtl } = useRtl();
const visible = ref(false);

// @ts-ignore
const __ = (window as any).__ || ((s: string) => s);

watch(
	() => updateStore.shouldPrompt,
	(shouldShow) => {
		visible.value = shouldShow;
	},
	{ immediate: true },
);

const label = computed(() => updateStore.formattedAvailableVersion);
const detail = computed(() => updateStore.formattedAvailableDetails);
const branch = computed(() => updateStore.formattedAvailableBranch);

function reload() {
	updateStore.resetSnooze();
	updateStore.reloadNow();
}

function dismiss() {
	updateStore.dismissUpdate();
	visible.value = false;
}
</script>

<style scoped>
.pos-update-dialog {
	border-radius: 14px;
}
</style>



