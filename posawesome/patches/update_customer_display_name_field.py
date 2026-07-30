import frappe

from posawesome.patches.add_customer_display_settings import _upsert_custom_field

FIELDNAME = "posa_customer_display_name"
CUSTOM_FIELD_NAME = f"POS Profile-{FIELDNAME}"


def execute():
    """Point the customer display monitor field at the detected monitor list.

    The field is a Select whose options are filled in by the browser showing the
    form - see posawesome/api/pos_profile.js - because only the browser can
    enumerate the monitors a computer has. This refreshes the description to say
    so, and makes sure the fieldtype has not drifted.
    """
    print(f"--- Starting patch: refresh POS Profile field '{FIELDNAME}'. ---")

    if not frappe.db.exists("Custom Field", CUSTOM_FIELD_NAME):
        print(
            f"POS Profile field '{FIELDNAME}' does not exist yet. Nothing to "
            "refresh - add_customer_display_name creates it."
        )
        print(f"--- Finished patch: refresh POS Profile field '{FIELDNAME}'. ---")
        return

    _upsert_custom_field(
        {
            "fieldname": FIELDNAME,
            "label": "Customer Display Name",
            "fieldtype": "Select",
            # Empty on the server on purpose. The monitors belong to whichever
            # computer is viewing the form, so posawesome/api/pos_profile.js
            # fills the list there. Keeping it empty also means
            # _validate_selects skips this field, so a monitor saved on one
            # computer can never block a save on another.
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
        }
    )

    frappe.clear_cache(doctype="POS Profile")

    # Read the field back rather than trusting the write, so a silent failure
    # shows up in the migrate output instead of a success message.
    fieldtype, options = frappe.db.get_value(
        "Custom Field", CUSTOM_FIELD_NAME, ["fieldtype", "options"]
    )

    if fieldtype == "Select" and not options:
        print(
            f"POS Profile field '{FIELDNAME}' is a Select with a browser-filled list. "
            "Open a POS Profile in Chrome and allow the window management prompt "
            "to see the monitors of that computer."
        )
        print(f"--- Finished patch: refresh POS Profile field '{FIELDNAME}'. ---")
    else:
        print(
            f"FAILED to refresh POS Profile field '{FIELDNAME}': fieldtype is "
            f"'{fieldtype}' with options {options!r}, expected 'Select' with none. "
            "Server-side options would block saving a profile whose monitor is "
            "not attached to this computer."
        )
