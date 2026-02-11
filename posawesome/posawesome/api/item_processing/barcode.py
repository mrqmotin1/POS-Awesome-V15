import frappe
from frappe.utils import cint, cstr, flt
from typing import Any, Dict, Optional

def _get_scale_barcode_settings():
    """Return the Scale Barcode Settings single document if it exists."""

    try:
        return frappe.get_cached_doc("Scale Barcode Settings")
    except frappe.DoesNotExistError:
        return None
    except Exception:
        frappe.log_error("Unable to load Scale Barcode Settings", "POS Awesome")
        return None


def _extract_numeric_segment(barcode: str, start: int, length: int, decimals: int = 0):
    """Extract a numeric value from ``barcode`` using 1-indexed ``start`` and ``length``."""

    if not (start and length):
        return None

    start_index = max(start - 1, 0)
    end_index = start_index + max(length, 0)
    if len(barcode) < end_index:
        return None

    whole = barcode[start_index:end_index]
    decimal_part = ""
    if decimals and decimals > 0:
        decimal_end = end_index + decimals
        if len(barcode) < decimal_end:
            return None
        decimal_part = barcode[end_index:decimal_end]

    number_str = whole
    if decimal_part:
        number_str = f"{whole}.{decimal_part}"

    try:
        return flt(number_str)
    except Exception:
        return None


def _parse_scale_barcode_data(barcode: str) -> Optional[Dict[str, Any]]:
    """Parse barcode data according to the configured scale barcode settings."""

    barcode_value = cstr(barcode or "").strip()
    if not barcode_value:
        return None

    settings = _get_scale_barcode_settings()
    if not settings:
        return None

    prefix_included = cint(settings.prefix_included_or_not)
    prefix_length = cint(settings.no_of_prefix_characters) if prefix_included else 0
    prefix_value = cstr(settings.prefix or "").strip()

    if prefix_value and not barcode_value.startswith(prefix_value):
        return None

    if prefix_included and prefix_length and len(barcode_value) < prefix_length:
        return None

    item_start = cint(settings.item_code_starting_digit)
    item_digits = cint(settings.item_code_total_digits)
    if not (item_start and item_digits):
        return None

    item_start_index = max(item_start - 1, 0)
    item_end_index = item_start_index + item_digits
    if len(barcode_value) < item_end_index:
        return None

    item_code = barcode_value[item_start_index:item_end_index]
    data: Dict[str, Any] = {"barcode": barcode_value, "item_code": item_code}

    qty = _extract_numeric_segment(
        barcode_value,
        cint(settings.weight_starting_digit),
        cint(settings.weight_total_digits),
        cint(settings.weight_decimals),
    )
    if qty is not None:
        data["qty"] = qty

    if cint(settings.price_included_in_barcode_or_not):
        price = _extract_numeric_segment(
            barcode_value,
            cint(settings.price_starting_digit),
            cint(settings.price_total_digit),
            cint(settings.price_decimals),
        )
        if price is not None:
            data["price"] = price

    return data


@frappe.whitelist()
def parse_scale_barcode(barcode: str):
    """Public API to parse a scale barcode and return decoded data."""

    settings = _get_scale_barcode_settings()
    metadata: Optional[Dict[str, Any]] = None

    if settings:
        metadata = {
            "prefix": cstr(getattr(settings, "prefix", "") or "").strip(),
            "prefix_included_or_not": cint(getattr(settings, "prefix_included_or_not", 0)),
            "no_of_prefix_characters": cint(getattr(settings, "no_of_prefix_characters", 0)),
        }

    data = _parse_scale_barcode_data(barcode)

    if not data:
        return {"settings": metadata} if metadata else None

    if metadata:
        data["settings"] = metadata

    return data


@frappe.whitelist()
def get_items_from_barcode(selling_price_list, currency, barcode):
    scale_data = _parse_scale_barcode_data(barcode)
    item_code = None
    scale_qty = None
    scale_price = None

    if scale_data:
        item_code = scale_data.get("item_code")
        scale_qty = scale_data.get("qty")
        scale_price = scale_data.get("price")

    if not item_code:
        search_item = frappe.db.get_value(
            "Item Barcode",
            {"barcode": barcode},
            ["parent as item_code", "posa_uom"],
            as_dict=1,
        )
        if not search_item:
            return None
        item_code = search_item.item_code
        item_uom = search_item.posa_uom
    else:
        item_uom = None

    if not item_code:
        return None

    try:
        # OPTIMIZE: Remove redundant DB query from exists()
        # frappe.get_cached_doc will raise DoesNotExistError if item is missing
        # saving one DB round-trip per scan.
        item_doc = frappe.get_cached_doc("Item", item_code)
    except frappe.DoesNotExistError:
        return None

    if not item_uom:
        item_uom = getattr(item_doc, "stock_uom", None)

    rate = None
    if scale_price is not None:
        rate = flt(scale_price)
    else:
        rate = frappe.db.get_value(
            "Item Price",
            {
                "item_code": item_code,
                "price_list": selling_price_list,
                "currency": currency,
            },
            "price_list_rate",
        )

    return {
        "item_code": item_doc.name,
        "item_name": item_doc.item_name,
        "barcode": barcode,
        "rate": rate or 0,
        "price_list_rate": rate or 0,
        "uom": item_uom or item_doc.stock_uom,
        "currency": currency,
        "scale_qty": scale_qty,
        "scale_price": scale_price,
    }


@frappe.whitelist()
def search_serial_or_batch_or_barcode_number(search_value, search_serial_no=None, search_batch_no=None):
    """Search for items by serial number, batch number, or barcode."""
    # Search by barcode
    barcode_data = frappe.db.get_value(
        "Item Barcode",
        {"barcode": search_value},
        ["parent as item_code", "barcode"],
        as_dict=True,
    )
    if barcode_data:
        return {"item_code": barcode_data.item_code, "barcode": barcode_data.barcode}

    # Search by batch number if enabled
    if search_batch_no:
        batch_data = frappe.db.get_value(
            "Batch",
            {"name": search_value},
            ["item as item_code", "name as batch_no"],
            as_dict=True,
        )
        if batch_data:
            return {
                "item_code": batch_data.item_code,
                "batch_no": batch_data.batch_no,
            }

    # Search by serial number if enabled
    if search_serial_no:
        serial_data = frappe.db.get_value(
            "Serial No",
            {"name": search_value},
            ["item_code", "name as serial_no"],
            as_dict=True,
        )
        if serial_data:
            return {
                "item_code": serial_data.item_code,
                "serial_no": serial_data.serial_no,
            }

    return {}
