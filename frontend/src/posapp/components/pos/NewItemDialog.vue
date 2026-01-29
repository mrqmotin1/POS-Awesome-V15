<template>
	<v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="500px">
		<v-card>
			<v-card-title class="text-h6 pa-4">
				{{ __("Create New Item") }}
			</v-card-title>
			<v-card-text class="pa-4">
				<v-form ref="form" @submit.prevent="submit">
					<v-row dense>
						<v-col cols="12">
							<v-text-field
								v-model="form.item_code"
								:label="frappe._('Item Code')"
								density="compact"
								variant="outlined"
								class="pos-themed-input"
								:rules="[(v) => !!v || __('* Required')]"
							></v-text-field>
						</v-col>
						<v-col cols="12">
							<v-text-field
								v-model="form.item_name"
								:label="frappe._('Item Name')"
								density="compact"
								variant="outlined"
								class="pos-themed-input"
								:rules="[(v) => !!v || __('* Required')]"
							></v-text-field>
						</v-col>
						<v-col cols="12">
							<v-select
								v-model="form.item_group"
								:items="itemsGroup.filter((g) => g !== 'ALL')"
								:label="frappe._('Item Group')"
								density="compact"
								variant="outlined"
								class="pos-themed-input"
								:rules="[(v) => !!v || __('* Required')]"
							></v-select>
						</v-col>
						<v-col cols="6">
							<v-autocomplete
								v-model="form.stock_uom"
								:items="uomList"
								:label="frappe._('Stock UOM')"
								density="compact"
								variant="outlined"
								class="pos-themed-input"
								:rules="[(v) => !!v || __('* Required')]"
							></v-autocomplete>
						</v-col>
						<v-col cols="6">
							<v-text-field
								v-model="form.standard_rate"
								:label="frappe._('Standard Rate')"
								type="number"
								density="compact"
								variant="outlined"
								class="pos-themed-input"
							></v-text-field>
						</v-col>
					</v-row>
				</v-form>
			</v-card-text>
			<v-card-actions class="pa-4 pt-0">
				<v-spacer></v-spacer>
				<v-btn color="error" variant="text" @click="close">
					{{ __("Cancel") }}
				</v-btn>
				<v-btn color="primary" variant="tonal" @click="submit" :loading="loading">
					{{ __("Create") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script>
export default {
	props: {
		modelValue: {
			type: Boolean,
			default: false,
		},
		itemsGroup: {
			type: Array,
			default: () => [],
		},
	},
	emits: ["update:modelValue", "item-created"],
	data() {
		return {
			loading: false,
			form: {
				item_code: "",
				item_name: "",
				item_group: "",
				stock_uom: "Nos",
				standard_rate: 0,
			},
			uomList: [],
		};
	},
	watch: {
		modelValue(val) {
			if (val) {
				this.resetForm();
			}
		},
	},
	mounted() {
		this.getUOMs();
	},
	methods: {
		close() {
			this.$emit("update:modelValue", false);
		},
		resetForm() {
			this.form = {
				item_code: "",
				item_name: "",
				item_group:
					this.itemsGroup.length > 1 && this.itemsGroup[1] !== "ALL"
						? this.itemsGroup[1]
						: this.itemsGroup[0] !== "ALL"
							? this.itemsGroup[0]
							: "",
				stock_uom: "Nos",
				standard_rate: 0,
			};
		},
		async getUOMs() {
			if (this.uomList.length) return;
			try {
				const r = await frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "UOM",
						fields: ["name"],
						limit_page_length: 0,
					},
				});
				if (r.message) {
					this.uomList = r.message.map((d) => d.name);
				}
			} catch (e) {
				console.error("Failed to fetch UOMs", e);
				// Fallback
				this.uomList = ["Nos", "Kg", "Meter", "Box"];
			}
		},
		async submit() {
			const { valid } = await this.$refs.form.validate();
			if (!valid) {
				frappe.msgprint(__("Please fill all required fields"));
				return;
			}

			this.loading = true;
			try {
				const res = await frappe.call({
					method: "frappe.client.insert",
					args: {
						doc: {
							doctype: "Item",
							item_code: this.form.item_code,
							item_name: this.form.item_name,
							item_group: this.form.item_group,
							stock_uom: this.form.stock_uom,
							standard_rate: this.form.standard_rate,
							is_stock_item: 1,
						},
					},
				});

				const newItem = res.message || res;
				newItem.actual_qty = 0; // Initialize stock

				frappe.show_alert({
					message: __("Item created successfully"),
					indicator: "green",
				});

				this.$emit("item-created", newItem);
				this.close();
			} catch (e) {
				console.error(e);
				frappe.msgprint(__("Failed to create item"));
			} finally {
				this.loading = false;
			}
		},
	},
};
</script>
