import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

OLD_FIELD = "posa_collect_payment_at_cashier"
PAY_AT_COUNTER = "Pay at Counter"
PAY_AT_CASHIER = "Pay at Cashier"

# Minimal definition so the values can be copied now; the fixture sync that
# runs after post_model_sync patches fills in label, description and position.
NEW_FIELD = {
    "fieldname": "posa_payment_flow",
    "label": "Payment Flow",
    "fieldtype": "Select",
    "options": f"{PAY_AT_COUNTER}\n{PAY_AT_CASHIER}",
    "default": PAY_AT_COUNTER,
    "insert_after": "posa_allow_credit_sale",
}


def execute():
    """Replace the "Collect Payment at Cashier" check with the "Payment Flow" select,
    keeping each POS Profile's current choice."""
    cashier_profiles = []
    if frappe.db.has_column("POS Profile", OLD_FIELD):
        cashier_profiles = frappe.get_all("POS Profile", filters={OLD_FIELD: 1}, pluck="name")

    if not frappe.db.exists("Custom Field", f"POS Profile-{NEW_FIELD['fieldname']}"):
        create_custom_field("POS Profile", NEW_FIELD)

    frappe.db.sql(
        "update `tabPOS Profile` set posa_payment_flow = %s where ifnull(posa_payment_flow, '') = ''",
        PAY_AT_COUNTER,
    )
    for name in cashier_profiles:
        frappe.db.set_value("POS Profile", name, "posa_payment_flow", PAY_AT_CASHIER, update_modified=False)

    old_custom_field = f"POS Profile-{OLD_FIELD}"
    if frappe.db.exists("Custom Field", old_custom_field):
        frappe.delete_doc("Custom Field", old_custom_field, ignore_permissions=True, force=True)

    frappe.clear_cache(doctype="POS Profile")
