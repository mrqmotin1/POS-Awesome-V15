<template>
	<div
		v-if="modelValue"
		class="navbar-settings-panel-backdrop"
		data-test="navbar-settings-panel"
		@click.self="emit('update:modelValue', false)"
	>
		<section class="navbar-settings-panel pos-themed-card">
			<div class="navbar-settings-panel__header">
				<div class="navbar-settings-panel__copy">
					<div class="navbar-settings-panel__eyebrow">{{ __("Settings") }}</div>
					<div class="navbar-settings-panel__title">
						{{ __("POS controls and maintenance") }}
					</div>
					<div class="navbar-settings-panel__subtitle">
						{{ __("Offline tools, terminal actions, and system preferences in one place.") }}
					</div>
				</div>
				<button
					type="button"
					class="navbar-settings-panel__close"
					data-test="navbar-settings-panel-close"
					@click="emit('update:modelValue', false)"
				>
					<span class="mdi mdi-close" aria-hidden="true"></span>
				</button>
			</div>

			<div class="navbar-settings-panel__body">
				<div
					v-for="section in sections"
					:key="section.id"
					class="navbar-settings-panel__section"
					:data-test="`settings-panel-section-${section.id}`"
				>
					<div class="navbar-settings-panel__section-head">
						<div class="navbar-settings-panel__section-title">{{ section.title }}</div>
						<div class="navbar-settings-panel__section-description">
							{{ section.description }}
						</div>
					</div>

					<div class="navbar-settings-panel__actions">
						<button
							v-for="action in section.actions"
							:key="action.id"
							type="button"
							class="navbar-settings-panel__action"
							:class="`navbar-settings-panel__action--${action.tone || 'neutral'}`"
							:disabled="action.disabled"
							:data-test="`settings-panel-action-${action.id}`"
							@click="emit('select-action', action.id)"
						>
							<span class="navbar-settings-panel__action-icon">
								<span :class="['mdi', action.icon]" aria-hidden="true"></span>
							</span>
							<span class="navbar-settings-panel__action-copy">
								<span class="navbar-settings-panel__action-title">{{ action.label }}</span>
								<span class="navbar-settings-panel__action-subtitle">{{ action.subtitle }}</span>
							</span>
						</button>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>

<script setup>
defineOptions({
	name: "NavbarSettingsPanel",
});

defineProps({
	modelValue: {
		type: Boolean,
		default: false,
	},
	sections: {
		type: Array,
		default: () => [],
	},
});

const emit = defineEmits(["update:modelValue", "select-action"]);

const __ = window.__ || ((text) => text);
</script>

<style scoped>
.navbar-settings-panel {
	width: min(560px, calc(100vw - 24px));
	border-radius: 24px;
	border: 1px solid var(--pos-border);
	overflow: hidden;
}

.navbar-settings-panel-backdrop {
	position: fixed;
	inset: 0;
	z-index: 1100;
	background: rgba(15, 23, 42, 0.22);
	backdrop-filter: blur(4px);
	display: grid;
	place-items: center;
	padding: 12px;
}

.navbar-settings-panel__header {
	padding: 20px 22px 16px;
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 14px;
	border-bottom: 1px solid var(--pos-border);
	background: linear-gradient(135deg, rgba(25, 118, 210, 0.06), rgba(66, 165, 245, 0.12));
}

.navbar-settings-panel__close {
	width: 36px;
	height: 36px;
	border-radius: 999px;
	border: 1px solid var(--pos-border);
	background: var(--pos-card-bg);
	color: var(--pos-text-primary);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.navbar-settings-panel__copy,
.navbar-settings-panel__body,
.navbar-settings-panel__section,
.navbar-settings-panel__section-head,
.navbar-settings-panel__actions,
.navbar-settings-panel__action-copy {
	display: grid;
	gap: 6px;
}

.navbar-settings-panel__eyebrow {
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--pos-primary);
}

.navbar-settings-panel__title {
	font-size: 18px;
	font-weight: 700;
	color: var(--pos-text-primary);
}

.navbar-settings-panel__subtitle,
.navbar-settings-panel__section-description,
.navbar-settings-panel__action-subtitle {
	font-size: 12px;
	line-height: 1.45;
	color: var(--pos-text-secondary);
}

.navbar-settings-panel__body {
	padding: 18px 22px 22px;
	max-height: min(72vh, 720px);
	overflow-y: auto;
}

.navbar-settings-panel__section {
	gap: 12px;
}

.navbar-settings-panel__section-title,
.navbar-settings-panel__action-title {
	font-size: 13px;
	font-weight: 700;
	color: var(--pos-text-primary);
}

.navbar-settings-panel__actions {
	gap: 10px;
}

.navbar-settings-panel__action {
	border: 1px solid var(--pos-border);
	background: var(--pos-card-bg);
	border-radius: 16px;
	padding: 12px;
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	text-align: left;
	transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.navbar-settings-panel__action:hover {
	transform: translateY(-1px);
	border-color: var(--pos-primary);
	box-shadow: 0 6px 16px var(--pos-shadow);
}

.navbar-settings-panel__action:disabled {
	opacity: 0.58;
	cursor: not-allowed;
	transform: none;
	box-shadow: none;
}

.navbar-settings-panel-fade-enter-active,
.navbar-settings-panel-fade-leave-active {
	transition: opacity 0.18s ease, transform 0.18s ease;
}

.navbar-settings-panel-fade-enter-from,
.navbar-settings-panel-fade-leave-to {
	opacity: 0;
	transform: translateY(6px);
}

.navbar-settings-panel__action-icon {
	width: 38px;
	height: 38px;
	border-radius: 12px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: white;
	flex-shrink: 0;
}

.navbar-settings-panel__action--primary .navbar-settings-panel__action-icon {
	background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%);
}

.navbar-settings-panel__action--secondary .navbar-settings-panel__action-icon {
	background: linear-gradient(135deg, #7b1fa2 0%, #ba68c8 100%);
}

.navbar-settings-panel__action--warning .navbar-settings-panel__action-icon {
	background: linear-gradient(135deg, #ff9800 0%, #ffc107 100%);
}

.navbar-settings-panel__action--info .navbar-settings-panel__action-icon {
	background: linear-gradient(135deg, #0288d1 0%, #4fc3f7 100%);
}

.navbar-settings-panel__action--danger .navbar-settings-panel__action-icon {
	background: linear-gradient(135deg, #d32f2f 0%, #f44336 100%);
}

.navbar-settings-panel__action--neutral .navbar-settings-panel__action-icon {
	background: linear-gradient(135deg, #616161 0%, #9e9e9e 100%);
}
</style>
