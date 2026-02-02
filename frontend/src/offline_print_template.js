/* global frappe */
import { getPrintTemplate, getTermsAndConditions, memoryInitPromise } from "./offline/index.js";
import nunjucks from "nunjucks";

function normaliseTemplate(template) {
	// Nunjucks doesn't understand Python-style triple quotes.
	// Convert any """multiline""" strings to standard JS strings so the
	// renderer can parse templates that include SQL or other blocks.
	if (!template) return template;
	return template.replace(/"""([\s\S]*?)"""/g, (_, str) => {
		const escaped = str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
		return `"${escaped}"`;
	});
}

function attachFormatter(obj) {
	if (!obj || typeof obj !== "object" || obj.get_formatted) return;
	// mimic Frappe's get_formatted by returning the raw field value
	obj.get_formatted = function (field) {
		return this?.[field];
	};
}

function computePaidAmount(doc) {
	if (!doc) return 0;

	const paymentsTotal = (doc.payments || []).reduce(
		(sum, p) => sum + Math.abs(parseFloat(p.amount) || 0),
		0,
	);

	const creditSale =
		doc.is_credit_sale === true ||
		doc.is_credit_sale === 1 ||
		doc.is_credit_sale === "1" ||
		String(doc.is_credit_sale).toLowerCase() === "yes";

	if (creditSale || paymentsTotal === 0) {
		return 0;
	}

	const base = doc.paid_amount ?? doc.grand_total ?? 0;
	return paymentsTotal || base;
}

function defaultOfflineHTMLOld(invoice, terms = "") {
	if (!invoice) return "";

	const itemsRows = (invoice.items || [])
		.map((it) => {
			const sn = it.serial_no
				? `<div class="serial">SR.No: ${it.serial_no.replace(/\n/g, ", ")}</div>`
				: "";
			const marker =
				invoice.posa_show_custom_name_marker_on_print && it.name_overridden ? " (custom)" : "";
			return `<tr>
                <td>${it.item_code}${
					it.item_name && it.item_name !== it.item_code
						? `<div class="item-name">${it.item_name}${marker}</div>`
						: ""
				}${sn}</td>
                <td class="qty">${it.qty} ${it.uom || ""}</td>
                <td class="rate">${it.rate}</td>
                <td class="amount">${it.amount}</td>
            </tr>`;
		})
		.join("");

	const taxesRows = (invoice.taxes || [])
		.map(
			(row) => `<tr>
                <td style="width:60%">${row.description}@${row.rate}%</td>
                <td style="width:40%; text-align:right;">${row.tax_amount}</td>
            </tr>`,
		)
		.join("");

	const discountRow = invoice.discount_amount
		? `<tr>
                <td style="width:60%">Discount</td>
                <td style="width:40%; text-align:right;">${invoice.discount_amount}</td>
            </tr>`
		: "";

	const changeRow = invoice.change_amount
		? `<tr>
                <td style="width:60%">Change Amount</td>
                <td style="width:40%; text-align:right;">${invoice.change_amount}</td>
            </tr>`
		: "";

	const termsSection = terms
		? `<div class="terms"><strong>Terms & Conditions</strong><div>${terms}</div></div>`
		: "";

	const paidAmount = computePaidAmount(invoice);

	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.name || ""}</title>
    <style>
        body { font-family: Arial, sans-serif; width: 80mm; margin: 0 auto; padding: 5mm; }
        .header { text-align: center; }
        .header h2 { margin: 0; }
        .info { margin-bottom: 4px; }
        .info div { font-size: 12px; line-height: 1.2; }
        table { width: 100%; border-collapse: collapse; }
        th, td { font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #ccc; }
        th { text-align: left; }
        td.qty, td.rate, td.amount { text-align: right; }
        table.totals td { border-bottom: none; }
        .terms { margin-top: 8px; font-size: 10px; }
        .footer { text-align: center; margin-top: 8px; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>${invoice.company || "Invoice"}</h2>
        <p><strong>${invoice.is_duplicate ? "Duplicate" : "Original"}</strong></p>
    </div>
    <div class="info">
        <div><strong>Invoice:</strong> ${invoice.name || ""}</div>
        <div><strong>Date:</strong> ${invoice.posting_date || ""} ${invoice.posting_time || ""}</div>
        <div><strong>Customer:</strong> ${invoice.customer_name || invoice.customer || ""}</div>
        <div><strong>Mobile:</strong> ${invoice.contact_mobile || ""}</div>
        <div><strong>Additional Note:</strong> ${invoice.posa_notes || ""}</div>
        ${invoice.posa_authorization_code ? `<div><strong>Authorization Code:</strong> ${invoice.posa_authorization_code}</div>` : ""}
    </div>
    <table class="items">
        <thead>
            <tr>
                <th style="width:40%">Item</th>
                <th style="width:20%; text-align:right;">Qty</th>
                <th style="width:20%; text-align:right;">Rate</th>
                <th style="width:20%; text-align:right;">Amt</th>
            </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
    </table>
    <table class="totals">
        <tbody>
            ${taxesRows}
            ${discountRow}
            <tr>
                <td style="width:60%"><strong>Total</strong></td>
                <td style="width:40%; text-align:right;">${invoice.grand_total}</td>
            </tr>
            <tr>
                <td style="width:60%">Paid</td>
                <td style="width:40%; text-align:right;">${paidAmount}</td>
            </tr>
            ${changeRow}
        </tbody>
    </table>
    ${termsSection}
    <div class="footer">Thank you, please visit again.</div>
</body>
</html>`;
}


// Off line print template For TAMANNA PHARMACY
function defaultOfflineHTML(invoice) {
    if (!invoice) return "";

    // Load company from offline storage
    let company = {};
    const company_json = localStorage.getItem("pos_offline_company_details");
    if (company_json) {
        try {
            company = JSON.parse(company_json);
        } catch (e) {
            console.error("Company parse error", e);
        }
    }

    const postingTime = new Date().toLocaleTimeString();

    const itemsHTML = (invoice.items || []).map((item, index) => {
        const price =  item.price_list_rate ?? 0;
        const qty = item.qty ?? 0;
        const amount = price * qty;

        return `
        <div class="item-line">
            <span style="width:8%;">${index + 1}</span>
            <span class="name" style="width:40%;">${item.item_name || ""}</span>
            <span style="width:15%; text-align:center;">${price.toFixed(2)}</span>
            <span style="width:10%; text-align:center;">${qty}</span>
            <span style="width:22%; text-align:right;">${amount.toFixed(2) || 0.00}</span>
        </div>`;
    }).join("");

    const payType = invoice.custom_pay_type || "Cash";

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Sales Receipt ${invoice.name || ""}</title>

<style>
@media print {
  @page { size: auto; margin: 0; }
  body {
    margin: 0;
    padding: 0;
    font-family: monospace;
    font-size: 7px !important;
  }
  .bangla-text {
    font-family: Arial, sans-serif;
    font-size: 12px;
    line-height: 1.35;
  }
  .receipt {
    width: 320px;
    margin: auto;
    padding: 0 5px;
    font-size: 12px;
  }
  hr {
    border-top: 1px dashed #000;
    margin: 3px 0;
  }
  .info-block p, .summary-line, .item-line {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin: 0;
  }
  .item-line .name {
    flex: 1;
    padding: 0 4px;
    word-break: break-word;
  }
}
</style>
</head>

<body>

<img src="/assets/posawesome/icons/tamanna.png"
     style="
       width: 300px;
       height: 60px;
       display: block;
       margin: 0 auto 5px;
     ">

<div class="receipt">

<div style="text-align:center;line-height:1.1;">
  ${company.registration_details || ""}<br>
  Mob: ${company.phone_no || ""}
</div>

<div style="text-align:center;font-weight:bold;">Sales Recipt</div>

<p style="text-align:center;margin-top:0;">
  <strong>Invoice: ${(invoice.name || "").split("-").pop()}</strong>
</p>

<hr>

<div class="info-block">
  <p>
    <span>Date: ${invoice.posting_date || ""}</span>
    <span>Staff ID: ${invoice.staff_id || ""}</span>
  </p>
  <p>
    <span>Time: ${postingTime}</span>
    <span>POS ID: ${invoice.pos_profile || ""}</span>
  </p>
</div>

<hr>

<div class="item-line">
  <span style="width:8%;"><strong>SL</strong></span>
  <span class="name" style="width:40%;"><strong>Items</strong></span>
  <span style="width:15%;text-align:center;"><strong>Price</strong></span>
  <span style="width:10%;text-align:center;"><strong>Qty</strong></span>
  <span style="width:22%;text-align:right;"><strong>Amount</strong></span>
</div>

${itemsHTML}

<hr>

<div class="summary-line">
  <span>Total | BDT</span>
  <span>${(invoice.total + invoice.custom_total_items_discount || 0).toFixed(2)}</span>
</div>

<div class="summary-line">
  <span>Discount Amount</span>
  <span>${Math.abs(invoice.custom_total_items_discount || 0).toFixed(2)}</span>
</div>

<div class="summary-line">
  <span>Return Adjustment</span>
  <span>0.00</span>
</div>

<hr>

<div class="summary-line" style="font-weight:bold;">
  <span>Net Total | BDT</span>
  <span>${(invoice.rounded_total || invoice.grand_total || 0).toFixed(2)}</span>
</div>

<div class="summary-line">
  <span>Pay Type</span>
  <span><strong>${payType}</strong></span>
</div>

<div class="summary-line">
  <span>Paid By Cash</span>
  <span>${payType === "Cash" ? (invoice.rounded_total || 0).toFixed(2) : "0.00"}</span>
</div>

<div class="summary-line">
  <span>Paid By Card</span>
  <span>${payType === "Card" ? (invoice.rounded_total || 0).toFixed(2) : "0.00"}</span>
</div>

<hr>

<div class="bangla-text">
বিঃদ্রঃ ১. তাপ সংবেদনশীল সকল ঔষধ, সুগার টেস্ট স্ট্রিপ এবং ঔষধের কাটা পাতা অফেরতযোগ্য।<br>
২. ঔষধ ক্রয়ের সময় নিজ দায়িত্বে ঔষধের পরিমাণ এবং মেয়াদ উত্তীর্ণের তারিখ দেখে নিন।<br>
৩. ক্রয়কৃত পণ্য সর্বোচ্চ ৫ দিনের মধ্যে পরিবর্তনযোগ্য এবং সেলস স্লিপ সাথে আনতে হবে।
</div>

<div style="text-align:center;margin-top:10px;font-size:12px">
******ধন্যবাদ******
</div>

<hr>

<div style="text-align:center;font-size:14px;">
Powered by <strong>MondayPOS ERP</strong>
</div>

</div>
</body>
</html>`;
}


export default async function renderOfflineInvoiceHTML(invoice) {
	if (!invoice) return "";

	await memoryInitPromise;

	const template = normaliseTemplate(getPrintTemplate());
	const terms = getTermsAndConditions();
	const doc = {
		...invoice,
		terms: invoice.terms || terms,
		terms_and_conditions: invoice.terms_and_conditions || terms,
	};

	doc.paid_amount = computePaidAmount(doc);
	attachFormatter(doc);
	(doc.items || []).forEach(attachFormatter);
	(doc.taxes || []).forEach(attachFormatter);

	if (!template) {
		console.warn("No offline print template cached; using fallback template");
		return defaultOfflineHTML(doc, doc.terms_and_conditions);
	}

	try {
		const env = nunjucks.configure({ autoescape: false });
		env.addFilter("format_currency", (value, currency) => {
			const number = typeof value === "number" ? value : parseFloat(value);
			if (Number.isNaN(number)) return value;
			try {
				return new Intl.NumberFormat(undefined, {
					style: currency ? "currency" : "decimal",
					currency: currency || undefined,
				}).format(number);
			} catch {
				return currency ? `${currency} ${number}` : String(number);
			}
		});
		env.addFilter("currency", (value, currency) => env.filters.format_currency(value, currency));
		env.getFilter = function (name) {
			return this.filters[name] || ((v) => v);
		};

		const context = {
			doc,
			terms: doc.terms,
			terms_and_conditions: doc.terms_and_conditions,
			_: frappe?._ ? frappe._ : (t) => t,
			frappe: {
				db: { get_value: () => "", sql: () => [] },
				get_list: () => [],
			},
		};
		return env.renderString(template, context);
	} catch (e) {
		console.error("Failed to render offline invoice", e);
		return defaultOfflineHTML(doc, doc.terms_and_conditions);
	}
}
