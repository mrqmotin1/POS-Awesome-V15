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

    # Drop EVERY index on the offline-id column, whatever its name. Earlier
    # versions created a UNIQUE index (Frappe auto-names it `posa_offline_invoice_id`
    # when the custom field had unique=1, plus a legacy `posa_offline_invoice_id_index`).
    # Flipping unique=0 via db.set_value does NOT drop that index, so the live UNIQUE
    # constraint kept rejecting offline syncs with "must be unique". Remove all of them.
    for doctype in FIELDS_BY_DOCTYPE:
        try:
            rows = frappe.db.sql(
                "SHOW INDEX FROM `tab%s` WHERE Column_name='posa_offline_invoice_id'" % doctype,
                as_dict=True,
            )
            for index_name in {r["Key_name"] for r in rows}:
                frappe.db.sql_ddl(
                    "ALTER TABLE `tab%s` DROP INDEX `%s`" % (doctype, index_name)
                )
        except Exception:
            frappe.log_error(
                title="add_offline_invoice_numbering drop index",
                message=frappe.get_traceback(),
            )
