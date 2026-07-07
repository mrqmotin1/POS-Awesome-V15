import { useToastStore } from "../../../stores/toastStore";

interface PrintItem {
	item_code: string;
	item_name: string;
	barcode: string;
	qty: number;
	uom?: string;
	[key: string]: any;
}

interface ErrorItem {
	item_code: string;
	barcode: string;
	reason: string;
}

function isValidEAN13(barcode: string): boolean {
	const barcodeStr = String(barcode || "").trim();
	if (!/^\d{13}$/.test(barcodeStr)) return false;
	const digits = barcodeStr.split("").map(Number) as number[];
	let sum = 0;
	for (let i = 0; i < 12; i++) {
		sum += digits[i]! * (i % 2 === 0 ? 1 : 3);
	}
	const calculatedCheckDigit = (10 - (sum % 10)) % 10;
	return calculatedCheckDigit === digits[12];
}

function isValid13DigitNumeric(barcode: string): boolean {
	return /^\d{13}$/.test(String(barcode || "").trim());
}

export function useMondayZplPrint() {
	const toastStore = useToastStore();

	const printBarcodeLabelsViaZpl = async (items: PrintItem[]) => {
		if (!items?.length) return;

		try {
			// 1. Resolve print format from Property Setter
			const printFormatRes = await frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "Property Setter",
					filters: {
						doc_type: "Item",
						property: "default_print_format",
					},
					fieldname: "value",
				},
			});

			const printFormat = (printFormatRes.message?.value as string) || "raw-barcode";

			// 2. Validate & collect errors
			const validItems: PrintItem[] = [];
			const errors: ErrorItem[] = [];

			for (const item of items) {
				const barcodeStr = String(item.barcode || "").trim();

				if (!isValid13DigitNumeric(barcodeStr)) {
					errors.push({
						item_code: item.item_code || "",
						barcode: item.barcode || "",
						reason: `Invalid barcode format (must be 13 digits)`,
					});
					continue;
				}

				const formatNameLower = (printFormat || "").toLowerCase();
				if (formatNameLower.includes("ben") && !isValidEAN13(barcodeStr)) {
					errors.push({
						item_code: item.item_code || "",
						barcode: item.barcode || "",
						reason: `BEN format requires valid EAN-13 checksum`,
					});
					continue;
				}

				validItems.push(item);
			}

			if (!validItems.length) {
				frappe.msgprint({
					title: __("No Valid Items"),
					message: __("No valid items to print: {0}", [
						errors.map((e) => `${e.item_code} (${e.reason})`).join(", "),
					]),
					indicator: "orange",
				});
				return;
			}

			// 3. Get printer
			const printer = await (window as any).QZ.getBarcodePrinter();
			if (!printer) {
				frappe.msgprint({
					title: __("Printer Not Found"),
					message: __(
						"Zebra printer not configured. Set your barcode printer in User Default Settings.",
					),
					indicator: "red",
				});
				return;
			}

			// 4. Build raw data array (collect all ZPL for all items in one batch)
			const data: any[] = [];

			for (const item of validItems) {
				try {
					const zplRes = await frappe.call({
						method: "mondayposhyper.barcode.api.get_zpl_for_item_new",
						args: {
							item_code: item.item_code,
							print_format: printFormat,
							barcode: item.barcode,
							uom: item.uom,
						},
					});

					if (!zplRes.message?.zpl_data) {
						errors.push({
							item_code: item.item_code || "",
							barcode: item.barcode || "",
							reason: "Failed to generate ZPL",
						});
						continue;
					}

					const zplData = zplRes.message.zpl_data;
					for (let i = 0; i < item.qty; i++) {
						data.push({
							type: "raw",
							format: "command",
							flavor: "plain",
							data: zplData,
						});
					}
				} catch (err) {
					console.error(`ZPL generation error for ${item.item_code}:`, err);
					errors.push({
						item_code: item.item_code || "",
						barcode: item.barcode || "",
						reason: `ZPL generation failed`,
					});
				}
			}

			if (!data.length) {
				frappe.msgprint({
					title: __("ZPL Generation Failed"),
					message: __("Could not generate ZPL for any items"),
					indicator: "red",
				});
				return;
			}

			// 5. Create QZ config
			const config = (window as any).qz.configs.create(printer, {
				signAlgorithm: "SHA256",
				forceRaw: true,
				density: 203,
				size: { width: 3, height: 2, units: "in" },
				margins: 0,
			});

			// 6. Print
			await (window as any).qz.print(config, data);

			// 7. Log audit trail
			const entriesToLog = validItems.map((item) => ({
				posting_date: undefined,
				item_code: item.item_code || "",
				item_name: item.item_name || "",
				barcode: item.barcode || "",
				barcode_type: item.barcode_type || "EAN",
				qty: item.qty || 1,
				uom: item.uom || "",
				price: item.price || 0,
				symbology: "EAN13",
				label_size: "custom",
				user: undefined,
				company: frappe.defaults.get_default("company") || "",
				pos_profile: "",
				print_method: "QZ Raw",
				status: "Sent",
				error_message: null,
				reference_doctype: null,
				reference_docname: null,
				batch_no: null,
				serial_no: null,
				warehouse: null,
			}));

			await frappe.call({
				method: "posawesome.posawesome.api.barcode_print_log.batch_create_print_logs",
				args: { entries: entriesToLog },
				silent: true,
			});

			// 8. Show success toast
			let successMsg = __("Printed {0} labels", [data.length]);
			if (errors.length) {
				successMsg +=
					" | " +
					__("Skipped {0} invalid items", [errors.length]) +
					": " +
					errors.map((e) => `${e.item_code}`).join(", ");
			}

			toastStore.show({
				title: successMsg,
				color: "success",
			});
		} catch (err) {
			console.error("Print error:", err);
			frappe.msgprint({
				title: __("Print Error"),
				message: __(String(err) || "An error occurred during printing"),
				indicator: "red",
			});

			try {
				(window as any).qz.websocket.disconnect();
			} catch {
				// ignore disconnect error
			}
		}
	};

	return {
		printBarcodeLabelsViaZpl,
	};
}
