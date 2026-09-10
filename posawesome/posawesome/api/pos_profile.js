// Copyright (c) 20201 Youssef Restom and contributors
// For license information, please see license.txt

frappe.ui.form.on("POS Profile", {
	setup: function (frm) {
		frm.set_query("posa_cash_mode_of_payment", function () {
			return {
				filters: { type: "Cash" },
			};
		});

		frm.set_query("posa_default_expense_account", function (doc) {
			return {
				filters: {
					company: doc.company,
					is_group: 0,
					root_type: "Expense",
				},
			};
		});

		frm.set_query("posa_back_office_cash_account", function (doc) {
			return {
				filters: {
					company: doc.company,
					is_group: 0,
					account_type: "Cash",
				},
			};
		});

		frm.set_query("posa_default_source_account", function (doc) {
			return {
				filters: {
					company: doc.company,
					is_group: 0,
					account_type: "Cash",
				},
			};
		});

		frm.set_query("posa_gift_card_liability_account", function (doc) {
			return {
				filters: {
					company: doc.company,
					is_group: 0,
					root_type: "Liability",
				},
			};
		});

		if (frm.fields_dict["posa_allowed_expense_accounts"]) {
			frm.set_query("account", "posa_allowed_expense_accounts", function (doc) {
				return {
					filters: {
						company: doc.company,
						is_group: 0,
						root_type: "Expense",
					},
				};
			});
		}

		if (frm.fields_dict["posa_allowed_source_accounts"]) {
			frm.set_query("account", "posa_allowed_source_accounts", function (doc) {
				return {
					filters: {
						company: doc.company,
						is_group: 0,
						account_type: "Cash",
					},
				};
			});
		}

		frappe.call({
			method: "posawesome.posawesome.api.utilities.get_language_options",
			callback: function (r) {
				if (!r.exc) {
					frm.fields_dict["posa_language"].df.options = r.message;
					frm.refresh_field("posa_language");
				}
			},
		});
	},

	refresh: function (frm) {
		posawesome_setup_customer_display_screens(frm);
	},

	posa_enable_customer_display: function (frm) {
		posawesome_setup_customer_display_screens(frm);
	},
});

/**
 * Fills posa_customer_display_name with the monitors connected to the computer
 * showing this form.
 *
 * The names can only come from the browser - the server has no way to know what
 * monitors a computer has - so they are the real labels the Window Management
 * API reports: "Built-in Retina Display", "MI monitor". They are therefore
 * machine-specific: a name picked here resolves at POS open time only on a
 * computer that has that monitor.
 *
 * Needs Chrome or Edge over HTTPS or localhost. Chrome raises its
 * window-management permission prompt on the first getScreenDetails() call and
 * remembers the answer for the site.
 */
function posawesome_setup_customer_display_screens(frm) {
	const field = frm.fields_dict["posa_customer_display_name"];
	if (!field || !frm.doc.posa_enable_customer_display) {
		return;
	}

	const set_description = (text) =>
		frm.set_df_property("posa_customer_display_name", "description", text);

	const set_options = (labels) => {
		const saved = frm.doc.posa_customer_display_name;
		// Keep whatever is already saved, even if that monitor is not attached
		// right now, so opening the form elsewhere cannot silently wipe it.
		const options = [""].concat(labels);
		if (saved && !options.includes(saved)) {
			options.push(saved);
		}
		field.df.options = options.join("\n");
		frm.refresh_field("posa_customer_display_name");
	};

	const read_screens = () =>
		window
			.getScreenDetails()
			.then((details) => {
				const screens = (details && details.screens) || [];
				set_options(
					screens.map(
						(screen, index) => (screen.label || "").trim() || `Display ${index + 1}`
					)
				);
				return true;
			})
			.catch(() => false);

	const add_detect_button = () => {
		// The button is added after the refresh that cleared custom buttons, so
		// guard against stacking duplicates when refresh fires repeatedly.
		if (frm.custom_buttons && frm.custom_buttons[__("Detect Monitors")]) {
			return;
		}
		frm.add_custom_button(__("Detect Monitors"), () => {
			read_screens().then((ok) => {
				if (ok) {
					frappe.show_alert({
						message: __("Monitors detected. Pick one in Customer Display Name."),
						indicator: "green",
					});
				} else {
					frappe.msgprint({
						title: __("Could not read monitors"),
						indicator: "orange",
						message: __(
							"Allow the Window management permission for this site in Chrome, then try again."
						),
					});
				}
			});
		});
	};

	if (typeof window.getScreenDetails !== "function") {
		set_description(
			__(
				"This browser cannot list monitors. Open this profile in Google Chrome or Microsoft Edge, on the computer that runs the POS."
			)
		);
		return;
	}

	// Keep the button available even after a successful read: monitors get
	// unplugged and swapped, so detection has to be repeatable, and it is the
	// way back after dismissing the permission prompt.
	add_detect_button();

	// Chrome shows its window-management prompt on the first getScreenDetails()
	// call and remembers the answer, so calling it here is what puts the monitor
	// names in the list. Only a previous "Block" is worth skipping: re-asking
	// cannot succeed and the browser would not prompt again anyway.
	const permission_state = () => {
		if (!navigator.permissions || !navigator.permissions.query) {
			return Promise.resolve("unknown");
		}
		return navigator.permissions
			.query({ name: "window-management" })
			.then((status) => status.state)
			.catch(() => "unknown");
	};

	permission_state().then((state) => {
		if (state === "denied") {
			set_description(
				__(
					"Chrome is blocking monitor detection for this site. Open the padlock in the address bar, set Window management to Allow, then click Detect Monitors above."
				)
			);
			return;
		}

		// read_screens() swallows a rejection and returns false, so a browser
		// that does demand a click for the prompt just leaves the list empty
		// and the Detect Monitors button covers it.
		read_screens().then((filled) => {
			if (filled) {
				return;
			}
			set_description(
				__(
					"Click Detect Monitors above and allow the permission prompt to list this computer's monitors."
				)
			);
		});
	});
}
