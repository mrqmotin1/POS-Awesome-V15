import frappe
from frappe.utils.password import check_password
@frappe.whitelist()
def validate_manager(barcode=None, username = None, password=None, required_role="Counter Manager"):
    """
    Validate manager credentials without logging out the current user.
    """
    """Authenticate a manager by their employee card barcode stored on the Employee doctype."""
    if barcode:
        employees = frappe.get_all(
            "Employee",
            filters={"custom_pos_manager_barcode": barcode, "status": "Active"},
            fields=["name", "employee_name", "user_id"],
            limit=1,
        )
        if not employees:
            return {"success": False, "error": "Card not recognized"}

        employee = employees[0]
        if not employee.get("user_id"):
            return {"success": False, "error": "Employee has no linked user account"}

        roles = frappe.get_roles(employee["user_id"])
        if required_role not in roles:
            return {"success": False, "error": "Not authorized"}

        return {
            "success": True,
            "username": employee["user_id"],
            "full_name": employee["employee_name"],
        }

    try:
        if not check_password(username, password):
            return {"success": False, "error": "Invalid password"}

        # Fetch the user doc
        user = frappe.get_doc("User", username)
        
        # Check if user is enabled
        if not user.enabled:
            return {"success": False, "error": "User is disabled"}

        # Check if user has the manager role
        if required_role in [r.role for r in user.roles]:
            return {"success": True}
        else:
            return {"success": False, "error": "Not authorized"}

    except frappe.DoesNotExistError:
        return {"success": False, "error": "User does not exist"}
    except Exception as e:
        return {"success": False, "error": str(e)}
    
    
