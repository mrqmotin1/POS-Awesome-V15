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
 * that is showing this form.
 *
 * The list can only come from the browser: the server has no way to know what
 * monitors a POS terminal has. So this profile must be opened on the terminal
 * itself for the names to be the right ones.
 *
 * Needs the Window Management API - Chrome/Edge, over HTTPS or localhost.
 * Anywhere else the field stays a free-text-style empty list and the customer
 * display keeps opening as a normal window.
 */
function posawesome_setup_customer_display_screens(frm) {
	const field = frm.fields_dict["posa_customer_display_name"];
	if (!field || !frm.doc.posa_enable_customer_display) {
		return;
	}

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

	if (typeof window.getScreenDetails !== "function") {
		frm.set_df_property(
			"posa_customer_display_name",
			"description",
			__(
				"This browser cannot list monitors. Use Google Chrome or Microsoft Edge over HTTPS or localhost, opened on the POS terminal."
			)
		);
		return;
	}

	// Reading screens raises a permission prompt, which browsers only allow off
	// a user gesture. Once granted it is remembered for the site, so the common
	// case is a silent read on every later form load.
	const fill_when_allowed = () => {
		if (!navigator.permissions || !navigator.permissions.query) {
			return Promise.resolve(false);
		}
		return navigator.permissions
			.query({ name: "window-management" })
			.then((status) => (status.state === "granted" ? read_screens() : false))
			.catch(() => false);
	};

	fill_when_allowed().then((filled) => {
		// The button is added after the refresh that cleared custom buttons, so
		// guard against stacking duplicates when refresh fires repeatedly.
		if (filled || (frm.custom_buttons && frm.custom_buttons[__("Detect Monitors")])) {
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
	});
}
