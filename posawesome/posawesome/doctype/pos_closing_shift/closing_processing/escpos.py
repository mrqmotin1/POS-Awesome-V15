import frappe

# Raw ESC/POS receipt template for POS Closing Shift (80mm thermal roll).
# Control codes are emitted via Jinja string literals (\x1B = ESC, \x1D = GS),
# so the rendered output already contains real ESC/POS bytes.
CLOSING_RAW_TEMPLATE = r"""{%- set company = frappe.get_doc("Company", doc.company) -%}

{%- set ESC = "\x1B" -%}
{%- set GS = "\x1D" -%}

{%- set INIT = ESC + "\x40" -%}
{%- set CENTER = ESC + "\x61\x01" -%}
{%- set LEFT = ESC + "\x61\x00" -%}
{%- set BOLD_ON = ESC + "\x45\x01" -%}
{%- set BOLD_OFF = ESC + "\x45\x00" -%}
{%- set DOUBLE_ON = GS + "\x21\x11" -%}
{%- set DOUBLE_OFF = GS + "\x21\x00" -%}
{%- set CUT = GS + "\x56\x00" -%}

{%- set LINE = "------------------------------------------" -%}

{%- set cash_sales = doc.payment_reconciliation
    | selectattr("mode_of_payment", "equalto", "Cash")
    | list -%}

{%- set card_sales = doc.payment_reconciliation
    | selectattr("mode_of_payment", "equalto", "Card")
    | list -%}

{%- set cash_total =
    ((cash_sales or []) | sum(attribute='expected_amount') | default(0.0))
    -
    ((cash_sales or []) | sum(attribute='opening_amount') | default(0.0))
-%}

{%- set card_total =
    ((card_sales or []) | sum(attribute='expected_amount') | default(0.0))
    -
    ((card_sales or []) | sum(attribute='opening_amount') | default(0.0))
-%}

{%- set opening_amount =
    ((cash_sales or []) | sum(attribute='opening_amount') | default(0.0))
-%}

{%- set total_credit_sales =
    (
        doc.grand_total
        -
        (cash_total + card_total)
    ) | abs | round(2)
-%}

{%- set total_bills = doc.pos_transactions | length -%}

{%- set total_cash =
    ((cash_sales or []) | sum(attribute='expected_amount') | default(0.0))
-%}

{%- set total_cash_count =
    ((cash_sales or []) | sum(attribute='closing_amount') | default(0.0))
-%}

{{ INIT }}{{ CENTER }}{{ BOLD_ON }}{{ company.name }}{{ BOLD_OFF }}
{{ company.registration_details or "" }}
Tel : {{ company.phone_no or "N/A" }}
TRN : {{ company.tax_id or "N/A" }}
{{ LEFT }}{{ LINE }}
Counter Closing Batch No: {{ doc.name.split('-')[-1] }}
{{ LINE }}
Counter      : {{ doc.pos_profile }}
User         : {{ doc.user }}
Closing Time : {{ frappe.utils.format_datetime(doc.period_end_date) }}
{{ BOLD_ON }}OPENING DETAILS{{ BOLD_OFF }}
{{ LINE }}
Time         : {{ frappe.utils.format_datetime(doc.period_start_date) }}
User         : {{ doc.user }}
Opening Balance : {{ "%0.2f"|format(opening_amount) }}
{{ BOLD_ON }}SALES{{ BOLD_OFF }}
{{ LINE }}
Cash Sales      : {{ "%0.2f"|format(cash_total) }}
Card Sales      : {{ "%0.2f"|format(card_total) }}
Credit Sales    : {{ "%0.2f"|format(total_credit_sales) }}
Total Sales     : {{ "%0.2f"|format(doc.grand_total) }}
Total Bills     : {{ total_bills }}
Average Bill    : {{ "%0.2f"|format(doc.grand_total / total_bills if total_bills else 0) }}
{{ BOLD_ON }}SALES RETURNS{{ BOLD_OFF }}
{{ LINE }}
Cash Returns    : {{ "%0.2f"|format(doc.cash_returns|abs) }}
A/c Returns     : {{ "%0.2f"|format(doc.card_returns|abs) }}
TOTAL RETURNS   : {{ "%0.2f"|format((doc.cash_returns + doc.card_returns)|abs) }}
Total Quantity  : {{ "%0.2f"|format(doc.total_quantity) }}

{{ BOLD_ON }}NET CASH BALANCE{{ BOLD_OFF }}
{{ LINE }}
Net Cash Balance: {{ "%0.2f"|format(total_cash) }}
Cash Count      : {{ "%0.2f"|format(total_cash_count) }}
Over Cash       : {{ "%0.2f"|format(total_cash_count - total_cash) }}
{{ LINE }}


{{ CUT }}"""


@frappe.whitelist()
def get_closing_shift_escpos(name):
    """Render the raw ESC/POS receipt string for a POS Closing Shift."""
    doc = frappe.get_doc("POS Closing Shift", name)
    return frappe.render_template(CLOSING_RAW_TEMPLATE, {"doc": doc})
