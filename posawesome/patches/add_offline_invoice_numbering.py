import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


# Custom fields that carry the locally-generated offline invoice id onto the
# synced transaction. Read-only + searchable so the offline receipt number stays
# linked and discoverable in ERPNext. NOT unique: the id only exists for offline
# sales, and enforcing uniqueness made online sales (blank id) trip a uniqueness
# warning. posa_client_request_id already guards against duplicate syncs.
INVOICE_FIELD = {
    "fieldname": "posa_offline_invoice_id",
    "label": "Offline Invoice ID",
    "fieldtype": "Data",
    "read_only": 1,
    "in_list_view": 1,
    "in_standard_filter": 1,
    "no_copy": 1,
    "unique": 0,
    "insert_after": "posa_client_request_id",
    "translatable": 0,
}

FIELDS_BY_DOCTYPE = {
    "Sales Invoice": INVOICE_FIELD,
    "POS Invoice": INVOICE_FIELD,
}

# POS Profile setting controlling offline invoice numbering. The id format is
# fully automated ({pos_profile}-DD-MM-YYYY-#####), so only an on/off toggle is
# exposed.
POS_PROFILE_FIELDS = [
    {
        "fieldname": "posa_enable_offline_invoice_numbering",
        "label": "Enable Offline Invoice Numbering",
        "fieldtype": "Check",
        "default": "0",
        "insert_after": "posa_local_storage",
    },
]

# Fields removed in later iterations; deleted idempotently on existing installs.
REMOVED_FIELDS = [
    "POS Profile-posa_offline_invoice_naming_series",
]


def _upsert_field(doctype, field):
    custom_field_name = f"{doctype}-{field['fieldname']}"
    if not frappe.db.exists("Custom Field", custom_field_name):
        create_custom_field(doctype, field)
    else:
        frappe.db.set_value(
            "Custom Field",
            custom_field_name,
            {key: value for key, value in field.items() if key != "fieldname"},
            update_modified=False,
        )
    frappe.clear_cache(doctype=doctype)


def execute():
    for doctype, field in FIELDS_BY_DOCTYPE.items():
        _upsert_field(doctype, field)

    for field in POS_PROFILE_FIELDS:
        _upsert_field("POS Profile", field)

    for custom_field_name in REMOVED_FIELDS:
        if frappe.db.exists("Custom Field", custom_field_name):
            frappe.delete_doc("Custom Field", custom_field_name, ignore_permissions=True)
    frappe.clear_cache(doctype="POS Profile")

    # Drop the unique index created by earlier versions. The offline id is not
    # unique anymore (online invoices share a blank value), so the index must go
    # to avoid duplicate-entry errors on online sales.
    for doctype in FIELDS_BY_DOCTYPE:
        try:
            if frappe.db.has_index(f"tab{doctype}", "posa_offline_invoice_id_index"):
                frappe.db.sql_ddl(
                    f"ALTER TABLE `tab{doctype}` DROP INDEX `posa_offline_invoice_id_index`"
                )
        except Exception:
            frappe.log_error(
                title="add_offline_invoice_numbering index drop",
                message=frappe.get_traceback(),
            )
