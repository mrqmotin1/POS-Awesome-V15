/**
 * Offline ESC/POS raw receipt renderer.
 *
 * Faithful TypeScript port of the server-side "Raw Printing" Jinja print format used
 * online. Online, Frappe renders that Jinja template (Python) and sends the resulting
 * ESC/POS string to QZ Tray. Offline there is no server, and the nunjucks-based HTML
 * renderer cannot execute the template's Python features (str.format padding,
 * frappe.get_doc/get_all, selectattr|sum, slicing). This module reproduces the exact
 * same ESC/POS byte string in the browser so the offline receipt matches the online one.
 *
 * The output is meant to be sent to QZ Tray as { type: "raw", format: "command",
 * flavor: "plain" } via printHtmlViaQz().
 */
import { enrichItemsWithBarcodes } from "./offline_print_template";

declare const frappe: any;

// --- ESC/POS control codes (mirror the Jinja `set` block) ---
const ESC = "\x1B";
const GS = "\x1D";
const SMALL2 = "\x1B\x4D\x01"; // ESC M 1 - small font
const NORMAL = "\x1B\x4D\x30"; // ESC M 0 - normal font
const INIT = ESC + "@";
const CENTER = ESC + "a" + "\x01";
const LEFT = ESC + "a" + "\x30";
const BOLD_ON = ESC + "E" + "\x01";
const BOLD_OFF = ESC + "E" + "\x30";
const CUT = GS + "V" + "\x41" + "\x03";
const LF = "\x0A";
const LINE = "------------------------------------------------"; // 48 dashes

// Hardcoded company registration / address block (mirrors the reference Jinja template).
const COMPANY_ADDRESS = [
	"Po. Box No. 60235 - Doha Qatar",
	"Alkhore Industrial Area",
	"Street No.27 - Zone 74 - Building No: 38",
];

// --- Python str.format helpers (no truncation, matching Python semantics) ---
function padRight(value: any, width: number): string {
	const s = String(value ?? "");
	return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function padLeft(value: any, width: number): string {
	const s = String(value ?? "");
	return s.length >= width ? s : " ".repeat(width - s.length) + s;
}

function padCenter(value: any, width: number): string {
	const s = String(value ?? "");
	if (s.length >= width) return s;
	const pad = width - s.length;
	const left = Math.floor(pad / 2); // Python `^` puts the extra space on the right
	return " ".repeat(left) + s + " ".repeat(pad - left);
}

// `"{:,.2f}".format(value)` -> "1,234.50"
function money(value: any): string {
	const n = Number(value || 0);
	return n.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}

// Column layouts mirror the online Jinja template exactly.
// Header uses cols = "{:<2} {:<20} {:>4} {:>8} {:>9}".
function headerRow(): string {
	return (
		padRight("SL", 2) +
		" " +
		padRight(" Items", 20) +
		" " +
		padLeft("Qty", 4) +
		" " +
		padLeft("Price", 8) +
		" " +
		padLeft("Amount", 9)
	);
}

// Item & barcode rows use "{:>2}    {:<27} {:>3} {:>12} {:>12}" (4 spaces after SL).
function itemRow(sl: any, name: any, qty: any, price: any, amount: any): string {
	return (
		padLeft(sl, 2) +
		"    " +
		padRight(name, 27) +
		" " +
		padLeft(qty, 3) +
		" " +
		padLeft(price, 12) +
		" " +
		padLeft(amount, 12)
	);
}

function sumPayments(payments: any[], modes: string[]): number {
	return (payments || [])
		.filter((p: any) => modes.includes(p.mode_of_payment))
		.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
}

// Match the existing HTML fallback: YYYY-MM-DD -> DD-MM-YYYY (doc.get_formatted)
function formatPostingDate(value: any): string {
	if (value && typeof value === "string" && value.includes("-")) {
		const parts = value.split("-");
		if (parts.length === 3) {
			return `${parts[2]}-${parts[1]}-${parts[0]}`;
		}
	}
	return value ? String(value) : "";
}

function getCompanyDetails(): Record<string, any> {
	try {
		const raw = localStorage.getItem("pos_offline_company_details");
		if (raw) return JSON.parse(raw);
	} catch (e) {
		console.error("Error parsing offline company details:", e);
	}
	return {};
}

export default async function renderOfflineInvoiceRaw(invoice: any): Promise<string> {
	if (!invoice) return "";

	// Clone before any await so reactive Vue mutations (invoice cleared after submit)
	// cannot affect the data we render.
	const doc = JSON.parse(JSON.stringify(invoice));
	console.log("Rendering offline invoice to raw ESC/POS:", doc);

	// Pull barcodes from the offline items DB when missing (replaces the template's
	// frappe.get_all("Item Barcode", ...) lookup).
	await enrichItemsWithBarcodes(doc.items || []);

	const company = getCompanyDetails();
	const companyName = company.name || doc.company || "";
	const staffName = frappe?.boot?.user?.first_name || doc.owner || "";

	const out: string[] = [];

	// --- Header ---
	out.push(INIT);
	out.push(CENTER);
	out.push(BOLD_ON + companyName + BOLD_OFF + LF);
	for (const line of COMPANY_ADDRESS) {
		out.push(line + LF);
	}
	out.push("Tel:" + (company.phone_no ?? "") + LF);
	if (company.tax_id) {
		out.push("TRN:" + company.tax_id + LF);
	}
	out.push(LINE + LF);
	out.push(BOLD_ON + padCenter("TAX INVOICE", 46) + BOLD_OFF + LF);

	// Fall back to the current date/time when the offline invoice has none yet.
	const now = new Date();
	const dateStr = doc.posting_date
		? formatPostingDate(doc.posting_date)
		: `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
	const timeStr = doc.posting_time
		? String(doc.posting_time).substring(0, 8)
		: now.toTimeString().substring(0, 8);
	out.push(padRight("Date: " + dateStr, 25) + " " + padLeft("Time: " + timeStr, 21) + LF);
	out.push(
		padRight("Staff: " + staffName, 25) +
			" " +
			padLeft("POS: " + (doc.pos_profile || "POS ID"), 21) +
			LF,
	);
	const offlineId = doc.posa_offline_invoice_id || "";
	const erpName = doc.name || "";
	// Prefer the locally-generated offline id; fall back to the ERP name suffix.
	const invNo = offlineId || (erpName ? String(erpName).split("-").pop() : "");
	out.push(padRight("Invoice No: " + invNo, 47) + LF);
	out.push(LINE + LF);

	// --- Item header row ---
	// Match online: header is printed in normal font (bold), then switch to small font
	// (Font B) for the item rows.
	out.push(BOLD_ON + headerRow() + BOLD_OFF);
	out.push(SMALL2 + LF);

	// --- Items ---
	(doc.items || []).forEach((item: any, index: number) => {
		const name = String(item.item_name || "")
			.replace(/\r/g, "")
			.replace(/\n/g, " ")
			.trim();
		const displayName = name.length > 26 ? name.slice(0, 24) + ".." : name;
		// Show the original (pre-discount) price-list rate and amount, mirroring the
		// online template's frappe.db.get_value("Item Price", ...) lookup. The invoice
		// item already carries price_list_rate; fall back to the charged rate.
		const priceListRate = Number(item.price_list_rate) || Number(item.rate) || 0;
		const originalAmount = priceListRate * (Number(item.qty) || 0);
		out.push(
			itemRow(
				index + 1,
				displayName,
				Math.trunc(Number(item.qty) || 0),
				money(priceListRate),
				money(originalAmount),
			) + LF,
		);
		let bcode = item.barcode;
		if (!bcode && Array.isArray(item.item_barcode) && item.item_barcode[0]) {
			const first = item.item_barcode[0];
			bcode = typeof first === "string" ? first : first.barcode;
		}
		// [TEMP-BARCODE-DEBUG] remove later
		console.log("[BARCODE-DEBUG] raw render", item.item_code, {
			resolved_bcode: bcode,
			will_print: !!bcode,
			barcode: item.barcode,
			item_barcode: item.item_barcode,
		});
		if (bcode) {
			out.push(itemRow("", "(" + bcode + ")", "", "", "") + LF);
		}
	});

	out.push(INIT);
	out.push(NORMAL);
	out.push(LEFT);
	out.push(LINE + LF);

	// --- Invoice summary ---
	out.push(BOLD_ON + padCenter("INVOICE SUMMARY", 48) + BOLD_OFF + LF);

	// custom_total_items_discount is set on the doc in document.ts (get_invoice_doc) from the
	// already-computed cart total; the fallback below derives it as sum(qty * discount_amount).
	// The offline invoice doc now carries the true post-discount figures (document.ts computes
	// net_total / total_taxes_and_charges / grand_total on the additional-discount-reduced base),
	// so render them directly. Mirrors the HTML renderer.
	const displayNet = Number(doc.net_total) || 0;
	const displayTax = Number(doc.total_taxes_and_charges) || 0;
	const payableGrand = Number(doc.grand_total) || 0;

	const itemDiscount = Math.abs(
		Number(doc.custom_total_items_discount) ||
			(doc.items || []).reduce(
				(sum: number, it: any) =>
					sum + (Number(it.qty) || 0) * (Number(it.discount_amount) || 0),
				0,
			),
	);
	const invoiceDiscount = Math.abs(Number(doc.discount_amount) || 0);
	const totalDiscount = itemDiscount + invoiceDiscount;

	// Original total before all discounts (grand_total is post-discount).
	const invoiceTotal = payableGrand + totalDiscount;

	out.push(padRight("Invoice Total", 25) + padLeft(money(invoiceTotal), 22) + LF);
	if (totalDiscount > 0) {
		out.push(padRight("Discount", 25) + padLeft("-" + money(totalDiscount), 22) + LF);
	}
	out.push(padRight("Total w/o VAT", 25) + padLeft(money(displayNet), 22) + LF);
	out.push(padRight("VAT", 25) + padLeft(money(displayTax), 22) + LF);
	out.push(LINE + LF);
	out.push(
		BOLD_ON + padRight("Total", 25) + padLeft(money(payableGrand), 22) + BOLD_OFF,
	);

	const cash = sumPayments(doc.payments, ["Cash"]);
	const card = sumPayments(doc.payments, ["Card", "Credit Card"]);
	const customerCredit = sumPayments(doc.payments, ["Customer Credit"]);
	out.push(LF);
	if (cash > 0) {
		out.push(padRight("Cash", 25) + padLeft(money(cash), 22) + LF);
	}
	if (card > 0) {
		out.push(padRight("Card", 25) + padLeft(money(card), 22) + LF);
	}
	if (customerCredit > 0) {
		out.push(padRight("Customer Credit", 25) + padLeft(money(customerCredit), 22) + LF);
	}

	const change = cash + card + customerCredit - payableGrand;
	if (change > 0) {
		out.push(padRight("Change", 25) + padLeft(money(change), 22) + LF);
	}

	out.push(padRight("No. of Items: " + (doc.items || []).length, 25) + LF);
	out.push(LINE + LF);

	// --- Footer ---
	out.push(CENTER);
	out.push(SMALL2 + "Exchange within 7 days with original bill and packing." + "\n");
	out.push(SMALL2 + "No exchange on under garments." + "\n");
	out.push("\x1D\x21\x10" + BOLD_ON + "Thank you. Come again." + BOLD_OFF + "\n");
	out.push("\x1D\x21\x00");
	out.push(LF + CUT);

	return out.join("");
}
