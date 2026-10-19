import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

# Why this exists: `bench new-site` / `install-app` marks every line of patches.txt
# as done in Patch Log WITHOUT running it. Most patch fields also live in
# fixtures/custom_field.json and reach fresh sites that way; the ones below do not,
# so they are ensured here on install and re-checked on every migrate (which also
# repairs sites whose Patch Log says done but whose fields are missing).
#
# Create-only on purpose: existing fields are never updated or re-ordered, so this
# is safe in after_migrate (unlike the workspace / section-reorder patches, which
# rewrite user layout and must stay one-shot in patches.txt).
# Field definitions mirror the patches named in each comment.

POS_PROFILE_FIELDS = [
    # add_pos_cash_movement_settings
    {
        "fieldname": "posa_allowed_expense_accounts",
        "label": "Allowed POS Expense Accounts",
        "fieldtype": "Table",
        "options": "POS Allowed Expense Account",
        "depends_on": "eval:doc.posa_enable_cash_movement==1 && doc.posa_allow_pos_expense==1",
        "insert_after": "posa_default_expense_account",
    },
    {
        "fieldname": "posa_default_source_account",
        "label": "Default POS Source Account",
        "fieldtype": "Link",
        "options": "Account",
        "depends_on": "eval:doc.posa_enable_cash_movement==1",
        "insert_after": "posa_allowed_expense_accounts",
    },
    {
        "fieldname": "posa_allow_source_account_override",
        "label": "Allow Source Account Selection",
        "fieldtype": "Check",
        "default": "0",
        "depends_on": "eval:doc.posa_enable_cash_movement==1",
        "insert_after": "posa_default_source_account",
    },
    {
        "fieldname": "posa_allowed_source_accounts",
        "label": "Allowed POS Source Accounts",
        "fieldtype": "Table",
        "options": "POS Allowed Source Account",
        "depends_on": "eval:doc.posa_enable_cash_movement==1 && doc.posa_allow_source_account_override==1",
        "insert_after": "posa_allow_source_account_override",
    },
    # add_customer_display_settings
    {
        "fieldname": "posa_section_customer_display",
        "label": "Customer Display",
        "fieldtype": "Section Break",
        "collapsible": 1,
        "insert_after": "posa_cash_movement_max_amount",
    },
    {
        "fieldname": "posa_enable_customer_display",
        "label": "Enable Customer Display",
        "fieldtype": "Check",
        "default": "0",
        "description": "Allow opening a read-only customer-facing cart screen.",
        "insert_after": "posa_section_customer_display",
    },
    {
        "fieldname": "posa_auto_open_customer_display",
        "label": "Auto Open Customer Display",
        "fieldtype": "Check",
        "default": "0",
        "depends_on": "eval:doc.posa_enable_customer_display==1",
        "description": "Open customer display window automatically when POS screen loads.",
        "insert_after": "posa_enable_customer_display",
    },
    # add_customer_display_name
    {
        "fieldname": "posa_customer_display_name",
        "label": "Customer Display Name",
        "fieldtype": "Select",
        # Empty on the server on purpose: posawesome/api/pos_profile.js fills the
        # monitors of the viewing computer. See add_customer_display_name.
        "options": "",
        "depends_on": "eval:doc.posa_enable_customer_display==1",
        "description": (
            "Which monitor the customer display opens on, full screen. "
            "Allow Chrome's 'window management' prompt when it appears, then pick a "
            "monitor from the list. "
            "The list shows the monitors of the computer you are viewing this form on, "
            "so open this profile on the computer that runs the POS. "
            "Leave empty to open a normal window. "
            "Needs Google Chrome or Microsoft Edge over HTTPS or localhost. "
            "On the computer running the POS, also set Chrome site permissions "
            "Pop-ups and redirects: Allow (auto open needs pop-ups). "
            "For the display to reach full screen with no touch at all, enable "
            "chrome://flags/#fullscreen-popup-windows, or allow-list this site with "
            "the AutomaticFullscreenAllowedForUrls enterprise policy - browsers "
            "otherwise require one touch on the customer screen."
        ),
        "insert_after": "posa_auto_open_customer_display",
    },
    # add_dashboard_settings
    {
        "fieldname": "posa_section_awesome_dashboard",
        "label": "Awesome Dashboard",
        "fieldtype": "Section Break",
        "collapsible": 1,
        "insert_after": "posa_customer_display_name",
    },
    {
        "fieldname": "posa_enable_awesome_dashboard",
        "label": "Enable Awesome Dashboard",
        "fieldtype": "Check",
        "default": "1",
        "description": "Show in-POS retail dashboard and reporting widgets.",
        "insert_after": "posa_section_awesome_dashboard",
    },
    {
        "fieldname": "posa_allow_company_dashboard_scope",
        "label": "Enable Company-Wide Dashboard Scope",
        "fieldtype": "Check",
        "default": "1",
        "depends_on": "eval:doc.posa_enable_awesome_dashboard==1",
        "description": "Allow this profile to view all company profiles in dashboard scope selector.",
        "insert_after": "posa_enable_awesome_dashboard",
    },
    {
        "fieldname": "posa_low_stock_alert_threshold",
        "label": "Low Stock Alert Threshold",
        "fieldtype": "Int",
        "default": "10",
        "depends_on": "eval:doc.posa_enable_awesome_dashboard==1",
        "description": "Items with stock at or below this value are highlighted in dashboard alerts.",
        "insert_after": "posa_allow_company_dashboard_scope",
    },
]

# add_dashboard_global_settings
POS_SETTINGS_FIELDS = [
    {
        "fieldname": "posa_section_dashboard",
        "label": "Awesome Dashboard",
        "fieldtype": "Section Break",
        "collapsible": 1,
        "insert_after": "posa_return_validity_days",
    },
    {
        "fieldname": "posa_enable_awesome_dashboard_global",
        "label": "Enable Awesome Dashboard",
        "fieldtype": "Check",
        "default": "1",
        "description": "Enable POS Awesome dashboard globally.",
        "insert_after": "posa_section_dashboard",
    },
    {
        "fieldname": "posa_dashboard_default_scope",
        "label": "Dashboard Default Scope",
        "fieldtype": "Select",
        "options": "All Profiles\nCurrent Profile",
        "default": "All Profiles",
        "depends_on": "eval:doc.posa_enable_awesome_dashboard_global==1",
        "description": "Default dashboard scope when POS opens.",
        "insert_after": "posa_enable_awesome_dashboard_global",
    },
    {
        "fieldname": "posa_dashboard_low_stock_alert_threshold",
        "label": "Dashboard Low Stock Alert Threshold",
        "fieldtype": "Int",
        "default": "10",
        "depends_on": "eval:doc.posa_enable_awesome_dashboard_global==1",
        "description": "Fallback low-stock threshold when profile-specific value is not set.",
        "insert_after": "posa_dashboard_default_scope",
    },
]

# add_item_price_index, add_composite_indexes, add_pos_scale_indexes,
# add_offline_sync_delta_indexes. add_index() is a no-op when the index exists.
INDEXES = [
    ("Item Price", ["price_list", "item_code"], "price_list_item_code"),
    (
        "Item",
        ["is_sales_item", "disabled", "is_fixed_asset", "has_variants", "item_group", "item_name"],
        "sales_disabled_fixed_variants_group_name",
    ),
    ("Item Barcode", ["barcode"], "barcode"),
    ("Item Barcode", ["parent"], "parent"),
    ("Serial No", ["item_code", "warehouse", "status"], "item_warehouse_status"),
    ("Bin", ["item_code", "warehouse"], "item_code_warehouse"),
    (
        "Stock Ledger Entry",
        ["warehouse", "item_code", "batch_no", "is_cancelled", "posting_date", "posting_time", "creation"],
        "warehouse_item_batch_cancel_posting_creation",
    ),
    ("Batch", ["item", "disabled", "expiry_date"], "item_disabled_expiry"),
    (
        "Item Price",
        ["price_list", "currency", "selling", "item_code", "uom", "valid_from", "valid_upto"],
        "pricelist_currency_selling_item_uom_validfrom_upto",
    ),
    ("Customer", ["disabled", "customer_group", "name"], "disabled_customer_group_name"),
    ("Customer", ["disabled", "modified", "name"], "disabled_modified_name"),
    (
        "Pricing Rule",
        ["selling", "disable", "company", "valid_from", "valid_upto"],
        "selling_disable_company_validity",
    ),
    ("Item Price", ["price_list", "modified", "name"], "price_list_modified_name"),
    (
        "Deleted Document",
        ["deleted_doctype", "creation", "deleted_name"],
        "doctype_creation_deleted_name",
    ),
    ("Bin", ["warehouse", "modified", "item_code"], "warehouse_modified_item_code"),
    ("Bin", ["warehouse", "item_code", "modified"], "warehouse_item_code_modified"),
    (
        "Item",
        ["modified", "item_group", "disabled", "is_sales_item", "is_fixed_asset", "item_code"],
        "modified_group_disabled_sales_fixed_item",
    ),
    (
        "Item",
        ["disabled", "is_sales_item", "is_fixed_asset", "item_group", "modified", "item_code"],
        "disabled_sales_fixed_group_modified_item",
    ),
    ("Customer", ["modified", "disabled", "customer_group", "name"], "modified_disabled_group_name"),
    ("Customer", ["disabled", "customer_group", "modified", "name"], "disabled_group_modified_name"),
    ("Price List", ["selling", "modified", "name"], "selling_modified_name"),
]

# add_item_fulltext_index (add_index() cannot create FULLTEXT)
FULLTEXT_INDEX = "item_name_description_ft"


def after_install():
    ensure_schema()


def after_migrate():
    ensure_schema()


def ensure_schema():
    create_custom_fields(
        {"POS Profile": POS_PROFILE_FIELDS, "POS Settings": POS_SETTINGS_FIELDS},
        ignore_validate=True,
        update=False,
    )

    for doctype, fields, index_name in INDEXES:
        try:
            frappe.db.add_index(doctype, fields, index_name=index_name)
        except Exception as error:
            frappe.log_error(str(error), f"POS Awesome ensure index: {index_name}")

    _ensure_item_fulltext_index()


def _ensure_item_fulltext_index():
    if frappe.db.db_type != "mariadb":
        return

    try:
        if frappe.db.has_index("tabItem", FULLTEXT_INDEX):
            return
        frappe.db.commit()
        frappe.db.sql_ddl(
            f"ALTER TABLE `tabItem` ADD FULLTEXT INDEX `{FULLTEXT_INDEX}` (item_name, description)"
        )
    except Exception as error:
        frappe.log_error(str(error), "POS Awesome ensure Item fulltext index")
