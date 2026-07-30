import frappe

from posawesome.patches.add_customer_display_settings import _upsert_custom_field

FIELDNAME = "posa_customer_display_name"
CUSTOM_FIELD_NAME = f"POS Profile-{FIELDNAME}"


def execute():
    """Add the monitor the customer display should open on.

    Left empty, the display opens as a plain popup exactly as before.
    """
    print(f"--- Starting patch: add '{FIELDNAME}' to POS Profile. ---")

    existed_before = frappe.db.exists("Custom Field", CUSTOM_FIELD_NAME)

    _upsert_custom_field(
        {
            "fieldname": "posa_customer_display_name",
            "label": "Customer Display Name",
            # Select, but the options are filled in by the browser showing this
            # form (see posawesome/api/pos_profile.js). The server cannot know
            # what monitors a terminal has, so there is nothing to store here.
            "fieldtype": "Select",
            "options": "",
            "depends_on": "eval:doc.posa_enable_customer_display==1",
            "description": (
                "Monitor to open the customer display on, full screen. "
                "Leave empty to open a normal window. "
                "The list shows the monitors of the computer you are viewing this form on, "
                "so open this profile on the POS terminal itself. "
                "Requires Google Chrome or Microsoft Edge over HTTPS or localhost. "
                "On the terminal, set Chrome site permissions Window management: Allow "
                "and Pop-ups and redirects: Allow (auto open needs pop-ups). "
                "For the display to reach full screen with no touch at all, enable "
                "chrome://flags/#fullscreen-popup-windows, or allow-list this site with "
                "the AutomaticFullscreenAllowedForUrls enterprise policy - browsers "
                "otherwise require one touch on the customer screen."
            ),
            "insert_after": "posa_auto_open_customer_display",
        }
    )

    frappe.clear_cache(doctype="POS Profile")

    # Read the field back rather than trusting the write, so a silent failure
    # shows up in the migrate output instead of a success message.
    if frappe.db.exists("Custom Field", CUSTOM_FIELD_NAME):
        action = "Updated" if existed_before else "Created"
        print(
            f"{action} POS Profile field '{FIELDNAME}' "
            "(Customer Display > Customer Display Name)."
        )
        print(f"--- Finished patch: add '{FIELDNAME}' to POS Profile. ---")
    else:
        print(
            f"FAILED to create POS Profile field '{FIELDNAME}'. "
            "The customer display will keep opening as a normal window."
        )
