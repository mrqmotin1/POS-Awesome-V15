"""Push a refresh signal to POS Payments (cashier desk) when its unpaid list changes.

A counter submitting or cancelling a POS bill, or a cashier settling one, changes
which invoices are outstanding. The desk listens for this event and reloads its
list, so new bills show without waiting for the fallback poll.
"""

import frappe

CASHIER_DESK_REFRESH_EVENT = "posa_cashier_desk_refresh"


def _publish(company):
    frappe.publish_realtime(
        CASHIER_DESK_REFRESH_EVENT,
        {"company": company},
        after_commit=True,
    )


def on_sales_invoice_change(doc, method=None):
    # Only POS bills reach the desk.
    if not doc.get("pos_profile"):
        return
    _publish(doc.company)


def on_payment_entry_change(doc, method=None):
    if doc.get("party_type") != "Customer":
        return
    if not any(row.reference_doctype == "Sales Invoice" for row in doc.get("references") or []):
        return
    _publish(doc.company)
