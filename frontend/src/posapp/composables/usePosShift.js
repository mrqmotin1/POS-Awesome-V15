import { ref, getCurrentInstance } from "vue";
import {
	initPromise,
	checkDbHealth,
	getOpeningStorage,
	setOpeningStorage,
	clearOpeningStorage,
	setTaxTemplate,
} from "../../offline/index.js";

export function usePosShift(openDialog) {
	const { proxy } = getCurrentInstance();
	const eventBus = proxy?.eventBus;

	const pos_profile = ref(null);
	const pos_opening_shift = ref(null);

	async function check_opening_entry() {
		await initPromise;
		await checkDbHealth();
		return frappe
			.call("posawesome.posawesome.api.shifts.check_opening_shift", {
				user: frappe.session.user,
			})
			.then((r) => {
				if (r.message) {
					pos_profile.value = r.message.pos_profile;
					pos_opening_shift.value = r.message.pos_opening_shift;
					if (pos_profile.value.taxes_and_charges) {
						frappe.call({
							method: "frappe.client.get",
							args: {
								doctype: "Sales Taxes and Charges Template",
								name: pos_profile.value.taxes_and_charges,
							},
							callback: (res) => {
								if (res.message) {
									setTaxTemplate(pos_profile.value.taxes_and_charges, res.message);
								}
							},
						});
					}
					eventBus?.emit("register_pos_profile", r.message);
					eventBus?.emit("set_company", r.message.company);
					try {
						frappe.realtime.emit("pos_profile_registered");
					} catch (e) {
						console.warn("Realtime emit failed", e);
					}
					console.info("LoadPosProfile");
					try {
						setOpeningStorage(r.message);
					} catch (e) {
						console.error("Failed to cache opening data", e);
					}
				} else {
					const data = getOpeningStorage();
					if (data) {
						pos_profile.value = data.pos_profile;
						pos_opening_shift.value = data.pos_opening_shift;
						eventBus?.emit("register_pos_profile", data);
						eventBus?.emit("set_company", data.company);
						try {
							frappe.realtime.emit("pos_profile_registered");
						} catch (e) {
							console.warn("Realtime emit failed", e);
						}
						console.info("LoadPosProfile (cached)");
						return;
					}
					openDialog && openDialog();
				}
			})
			.catch(() => {
				const data = getOpeningStorage();
				if (data) {
					pos_profile.value = data.pos_profile;
					pos_opening_shift.value = data.pos_opening_shift;
					eventBus?.emit("register_pos_profile", data);
					eventBus?.emit("set_company", data.company);
					try {
						frappe.realtime.emit("pos_profile_registered");
					} catch (e) {
						console.warn("Realtime emit failed", e);
					}
					console.info("LoadPosProfile (cached)");
					return;
				}
				openDialog && openDialog();
			});
	}

	function get_closing_data() {
		return frappe
			.call(
				"posawesome.posawesome.doctype.pos_closing_shift.pos_closing_shift.make_closing_shift_from_opening",
				{ opening_shift: pos_opening_shift.value },
			)
			.then((r) => {
				if (r.message) {
					eventBus?.emit("open_ClosingDialog", r.message);
				}
			});
	}

	// Open the Frappe printview popup for the submitted closing shift
	function load_print_page(name) {
		const print_format = "POS Closing Report";
		const doctype = "POS Closing Shift";
		const url =
			frappe.urllib.get_base_url() +
			"/printview?doctype=" +
			encodeURIComponent(doctype) +
			"&name=" +
			encodeURIComponent(name) +
			"&trigger_print=1" +
			"&format=" +
			encodeURIComponent(print_format);
		//console.log("Print URL", url);
		window.open(url, "Print");
	}

	function submit_closing_pos(data, CustomPrint = false) {
		frappe
			.call("posawesome.posawesome.doctype.pos_closing_shift.pos_closing_shift.submit_closing_shift", {
				closing_shift: data,
			})
			.then((r) => {
				if (r.message) {
					pos_opening_shift.value = null;
					pos_profile.value = null;
					clearOpeningStorage();
					eventBus?.emit("show_message", {
						title: `POS Shift Closed`,
						color: "success",
					});
					if (CustomPrint === true) {
						load_print_page(r.message);
						//console.log("Print page loaded", r.message);
					}
					check_opening_entry();
				}
			});
	}

	return { pos_profile, pos_opening_shift, check_opening_entry, get_closing_data, submit_closing_pos };
}
