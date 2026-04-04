from __future__ import annotations

import frappe
from frappe import _


def _resolve_profile_name(pos_profile=None) -> str:
	if isinstance(pos_profile, dict):
		return str(pos_profile.get("name") or "").strip()

	if isinstance(pos_profile, str):
		return pos_profile.strip()

	return ""


def _get_terminal_users(profile_name: str) -> list[str]:
	rows = frappe.get_all(
		"POS Profile User",
		filters={"parent": profile_name},
		fields=["user"],
		order_by="idx asc, creation asc",
		ignore_permissions=True,
	)
	return [row.get("user") for row in rows if row.get("user")]


@frappe.whitelist()
def get_terminal_employees(pos_profile=None):
	profile_name = _resolve_profile_name(pos_profile)
	if not profile_name:
		frappe.throw(_("POS profile is required to load terminal employees."))

	users = _get_terminal_users(profile_name)
	if not users:
		return []

	user_rows = frappe.get_all(
		"User",
		filters={"name": ["in", users], "enabled": 1},
		fields=["name", "full_name", "enabled"],
		order_by="full_name asc, name asc",
		ignore_permissions=True,
	)
	user_map = {row.get("name"): row for row in user_rows}
	current_user = frappe.session.user

	employees = []
	for user in users:
		row = user_map.get(user)
		if not row:
			continue
		employees.append(
			{
				"user": row.get("name"),
				"full_name": row.get("full_name") or row.get("name"),
				"enabled": row.get("enabled", 1),
				"is_current": row.get("name") == current_user,
			}
		)

	return employees


@frappe.whitelist()
def verify_terminal_employee_pin(pos_profile=None, user=None, pin=None):
	profile_name = _resolve_profile_name(pos_profile)
	if not profile_name:
		frappe.throw(_("POS profile is required to verify cashier access."))

	user = str(user or "").strip()
	pin = str(pin or "").strip()
	if not user or not pin:
		frappe.throw(_("Cashier and PIN are required."))

	terminal_users = _get_terminal_users(profile_name)
	if user not in terminal_users:
		frappe.throw(_("Selected cashier is not assigned to this POS profile."))

	user_rows = frappe.get_all(
		"User",
		filters={"name": user, "enabled": 1},
		fields=["name", "full_name", "enabled", "posa_pos_pin", "posa_is_pos_supervisor"],
		ignore_permissions=True,
		limit_page_length=1,
	)
	user_row = user_rows[0] if user_rows else None
	stored_pin = str((user_row or {}).get("posa_pos_pin") or "").strip()

	if not user_row or stored_pin != pin:
		frappe.throw(_("Invalid cashier PIN."))

	return {
		"user": user_row.get("name"),
		"full_name": user_row.get("full_name") or user_row.get("name"),
		"enabled": user_row.get("enabled", 1),
		"is_supervisor": bool(user_row.get("posa_is_pos_supervisor")),
	}
