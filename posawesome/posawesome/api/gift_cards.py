from __future__ import annotations

import frappe

from posawesome.posawesome.api.employees import (
	_ensure_terminal_user,
	_get_user_doc,
	_is_pos_supervisor,
	_resolve_profile_name,
)


def _to_float(value) -> float:
	try:
		return round(float(value or 0), 2)
	except Exception:
		return 0.0


def _now_datetime():
	utils = getattr(frappe, "utils", None)
	if utils and hasattr(utils, "now_datetime"):
		return utils.now_datetime()
	return None


def _normalize_code(gift_card_code: str | None) -> str:
	code = str(gift_card_code or "").strip().upper()
	if not code:
		code = str(frappe.generate_hash() or "").strip().upper()[:10]
	if not code:
		frappe.throw(frappe._("Gift card code is required."))
	return code


def _require_supervisor(pos_profile=None, cashier=None):
	profile_name = _resolve_profile_name(pos_profile)
	if not profile_name:
		frappe.throw(frappe._("POS profile is required."))

	cashier = str(cashier or "").strip()
	if not cashier:
		frappe.throw(frappe._("Cashier is required."))

	_ensure_terminal_user(profile_name, cashier)
	user_doc = _get_user_doc(cashier)
	if not _is_pos_supervisor(user_doc):
		frappe.throw(frappe._("A POS supervisor is required for this action."))

	return profile_name, cashier, user_doc


def _get_gift_card(gift_card_code=None):
	code = _normalize_code(gift_card_code)
	if not frappe.db.exists("POS Gift Card", {"gift_card_code": code}):
		frappe.throw(frappe._("Gift card {0} does not exist.").format(code))
	return frappe.get_doc("POS Gift Card", code)


def _append_transaction(
	gift_card_doc,
	transaction_type,
	amount,
	balance_after,
	cashier=None,
	reference_doctype=None,
	reference_name=None,
):
	row = {
		"transaction_type": transaction_type,
		"amount": _to_float(amount),
		"balance_after": _to_float(balance_after),
		"cashier": cashier,
		"posting_datetime": _now_datetime(),
	}
	if reference_doctype:
		row["reference_doctype"] = reference_doctype
	if reference_name:
		row["reference_name"] = reference_name
	gift_card_doc.append("transactions", row)
	return row


def _serialize_gift_card(gift_card_doc):
	return {
		"name": getattr(gift_card_doc, "name", None),
		"gift_card_code": getattr(gift_card_doc, "gift_card_code", None),
		"company": getattr(gift_card_doc, "company", None),
		"currency": getattr(gift_card_doc, "currency", None),
		"current_balance": _to_float(getattr(gift_card_doc, "current_balance", 0)),
		"status": getattr(gift_card_doc, "status", None),
		"expiry_date": getattr(gift_card_doc, "expiry_date", None),
	}


@frappe.whitelist()
def issue_gift_card(
	pos_profile=None,
	cashier=None,
	company=None,
	initial_amount=0,
	gift_card_code=None,
	expiry_date=None,
	currency="PKR",
):
	_require_supervisor(pos_profile, cashier)

	amount = _to_float(initial_amount)
	if amount < 0:
		frappe.throw(frappe._("Initial amount cannot be negative."))
	if not company:
		frappe.throw(frappe._("Company is required."))

	code = _normalize_code(gift_card_code)
	if frappe.db.exists("POS Gift Card", {"gift_card_code": code}):
		frappe.throw(frappe._("Gift card {0} already exists.").format(code))

	gift_card_doc = frappe.new_doc("POS Gift Card")
	gift_card_doc.gift_card_code = code
	gift_card_doc.company = company
	gift_card_doc.currency = currency or "PKR"
	gift_card_doc.current_balance = amount
	gift_card_doc.status = "Active"
	gift_card_doc.expiry_date = expiry_date
	gift_card_doc.issued_by = cashier
	if amount > 0:
		_append_transaction(
			gift_card_doc,
			"Issue",
			amount,
			amount,
			cashier=cashier,
		)

	gift_card_doc.flags.ignore_permissions = True
	gift_card_doc.save(ignore_permissions=True)
	return _serialize_gift_card(gift_card_doc)


@frappe.whitelist()
def top_up_gift_card(pos_profile=None, cashier=None, gift_card_code=None, amount=0):
	_require_supervisor(pos_profile, cashier)

	top_up_amount = _to_float(amount)
	if top_up_amount <= 0:
		frappe.throw(frappe._("Top up amount must be greater than zero."))

	gift_card_doc = _get_gift_card(gift_card_code)
	if getattr(gift_card_doc, "status", "Active") != "Active":
		frappe.throw(frappe._("Only active gift cards can be topped up."))

	next_balance = _to_float(getattr(gift_card_doc, "current_balance", 0) + top_up_amount)
	gift_card_doc.current_balance = next_balance
	_append_transaction(
		gift_card_doc,
		"Top Up",
		top_up_amount,
		next_balance,
		cashier=cashier,
	)
	gift_card_doc.flags.ignore_permissions = True
	gift_card_doc.save(ignore_permissions=True)
	return _serialize_gift_card(gift_card_doc)


@frappe.whitelist()
def check_gift_card_balance(gift_card_code=None, company=None):
	gift_card_doc = _get_gift_card(gift_card_code)
	if company and getattr(gift_card_doc, "company", None) != company:
		frappe.throw(frappe._("Gift card does not belong to company {0}.").format(company))
	return _serialize_gift_card(gift_card_doc)


def redeem_gift_card(
	gift_card_code=None,
	amount=0,
	invoice_doctype=None,
	invoice_name=None,
	cashier=None,
	company=None,
):
	redeem_amount = _to_float(amount)
	if redeem_amount <= 0:
		frappe.throw(frappe._("Redeem amount must be greater than zero."))

	gift_card_doc = _get_gift_card(gift_card_code)
	if company and getattr(gift_card_doc, "company", None) != company:
		frappe.throw(frappe._("Gift card does not belong to company {0}.").format(company))
	status = getattr(gift_card_doc, "status", "Active")
	if status != "Active":
		frappe.throw(frappe._("Only active gift cards can be redeemed."))

	current_balance = _to_float(getattr(gift_card_doc, "current_balance", 0))
	if redeem_amount > current_balance:
		frappe.throw(frappe._("Gift card balance is insufficient."))

	next_balance = _to_float(current_balance - redeem_amount)
	gift_card_doc.current_balance = next_balance
	gift_card_doc.last_redeemed_on = _now_datetime()
	_append_transaction(
		gift_card_doc,
		"Redeem",
		redeem_amount,
		next_balance,
		cashier=cashier,
		reference_doctype=invoice_doctype,
		reference_name=invoice_name,
	)
	gift_card_doc.flags.ignore_permissions = True
	gift_card_doc.save(ignore_permissions=True)
	return _serialize_gift_card(gift_card_doc)
