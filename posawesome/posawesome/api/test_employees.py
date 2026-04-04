import importlib.util
import pathlib
import sys
import types
import unittest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]


def _install_frappe_stub():
	frappe_module = types.ModuleType("frappe")
	frappe_module._ = lambda text: text
	frappe_module.throw = lambda message: (_ for _ in ()).throw(Exception(message))
	frappe_module.whitelist = lambda *args, **kwargs: (lambda fn: fn)
	frappe_module.session = types.SimpleNamespace(user="cashier@example.com")
	frappe_module.get_all = lambda *args, **kwargs: []
	sys.modules["frappe"] = frappe_module


def _load_employees_module():
	module_name = "posawesome.posawesome.api.employees"
	file_path = REPO_ROOT / "posawesome" / "posawesome" / "api" / "employees.py"
	spec = importlib.util.spec_from_file_location(module_name, file_path)
	module = importlib.util.module_from_spec(spec)
	sys.modules[module_name] = module
	spec.loader.exec_module(module)
	return module


class TestEmployeesApi(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		_install_frappe_stub()
		cls.employees = _load_employees_module()

	def test_get_terminal_employees_returns_profile_users_with_current_flag(self):
		self.employees.frappe.session.user = "cashier@example.com"
		self.employees.frappe.get_all = lambda doctype, **kwargs: (
			[
				{"user": "cashier@example.com"},
				{"user": "backup@example.com"},
			]
			if doctype == "POS Profile User"
			else [
				{
					"name": "cashier@example.com",
					"full_name": "Main Cashier",
					"enabled": 1,
				},
				{
					"name": "backup@example.com",
					"full_name": "Backup Cashier",
					"enabled": 1,
				},
			]
		)

		result = self.employees.get_terminal_employees("Main POS")

		self.assertEqual(len(result), 2)
		self.assertEqual(result[0]["user"], "cashier@example.com")
		self.assertTrue(result[0]["is_current"])
		self.assertEqual(result[1]["full_name"], "Backup Cashier")
		self.assertFalse(result[1]["is_current"])

	def test_verify_terminal_employee_pin_accepts_valid_terminal_member(self):
		def fake_get_all(doctype, **kwargs):
			if doctype == "POS Profile User":
				return [{"user": "backup@example.com"}]
			if doctype == "User":
				return [
					{
						"name": "backup@example.com",
						"full_name": "Backup Cashier",
						"enabled": 1,
						"posa_pos_pin": "1234",
						"posa_is_pos_supervisor": 0,
					}
				]
			return []

		self.employees.frappe.get_all = fake_get_all

		result = self.employees.verify_terminal_employee_pin(
			"Main POS",
			"backup@example.com",
			"1234",
		)

		self.assertEqual(result["user"], "backup@example.com")
		self.assertEqual(result["full_name"], "Backup Cashier")
		self.assertFalse(result["is_supervisor"])


if __name__ == "__main__":
	unittest.main()
