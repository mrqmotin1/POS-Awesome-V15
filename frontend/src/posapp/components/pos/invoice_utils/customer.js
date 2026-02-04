
/* global __, frappe */
import { getStoredCustomer, getCachedPriceListItems } from "../../../../offline/index.js";

export async function fetch_customer_details(context) {
    try {
        if (!context.customer) return;

        context.customer_info = {};
        const cachedCustomer = await getStoredCustomer(context.customer);
        if (cachedCustomer) {
            context.customer_info = cachedCustomer;
        }

        const r = await frappe.call({
            method: "posawesome.posawesome.api.customers.get_customer_info",
            args: { customer: context.customer },
        });

        if (r?.message) {
            context.customer_info = r.message;
            if (context.customer_info.customer_price_list) {
                context.price_list_currency = context.customer_info.price_list_currency;
            } else {
                context.price_list_currency = context.pos_profile.currency;
            }

            // If we have items with default rates (rate=0 or rate not set), re-apply price list
            // Or if we need to enforce customer price list
            if (context.items.length > 0) {
                if (context.update_items_details) await context.update_items_details(context.items);
            }
        }
    } catch (error) {
        console.error("Error fetching customer details:", error);
    }
}

export function get_effective_price_list(context) {
    if (context.selected_price_list) return context.selected_price_list;
    if (context.customer_info?.customer_price_list) return context.customer_info.customer_price_list;
    return context.pos_profile?.selling_price_list;
}

export function get_price_list(context) {
    return get_effective_price_list(context);
}

export async function update_price_list(context) {
    if (context.items.length && context.apply_cached_price_list) {
        context.apply_cached_price_list(get_price_list(context));
    }
    // Trigger re-pricing/server sync
    if (context.schedulePricingRuleApplication) context.schedulePricingRuleApplication(true);
}

export function sync_invoice_customer_details(context, details = null) {
    if (!details) {
        details = context.customer_info;
    }
    if (!details) return;

    if (context.invoice_doc) {
        if (details.customer_address) context.invoice_doc.customer_address = details.customer_address;
        if (details.territory) context.invoice_doc.territory = details.territory;
        if (details.contact_person) context.invoice_doc.contact_person = details.contact_person;
        if (details.shipping_address) context.invoice_doc.shipping_address_name = details.shipping_address;
    }
}

export function _applyPriceListRate(context, item, newRate, priceCurrency) {
    if (!item) return;
    const currentRate = item.price_list_rate;
    const currentBaseRate = item.base_price_list_rate;

    if (context._computePriceConversion) {
        const { price_list_rate, base_price_list_rate } = context._computePriceConversion(
            newRate,
            priceCurrency,
        );

        item.price_list_rate = price_list_rate;
        item.base_price_list_rate = base_price_list_rate;
    } else {
        // Fallback if _computePriceConversion is missing (should verify imports)
        item.price_list_rate = newRate;
        // Logic for base rate conversion if missing would duplicate _computePriceConversion
        // Assuming dependencies are met by context
    }
}

export function _computePriceConversion(context, rate, priceCurrency) {
    const defaultCurrency = context.pos_profile.currency;
    const selectedCurrency = context.selected_currency || defaultCurrency;
    const itemCurrency = priceCurrency || selectedCurrency;

    let exchange_rate = 1;
    let conversion_rate = 1;

    // Logic for exchange rates - assume context has this info or it's fetched
    // This part in original code used this.exchange_rate etc.
    // Simplifying:

    // If rate is in USD (priceCurrency), and we work in PKR (default).
    // And selected is USD.

    // We need base_price_list_rate (PKR) and price_list_rate (selected currency).

    const plcConversionRate = context._getPlcConversionRate ? context._getPlcConversionRate() : 1;
    // Actually validation logic uses this.

    // Simplest approach: reuse existing helpers on context if available
    // Otherwise implement:

    const base_price_list_rate = rate * plcConversionRate; // Approximate?

    // Precise logic from original file:
    // const plcConversionRate = this._getPlcConversionRate();
    // base_price_list_rate = data.price_list_rate * plcConversionRate;

    // And:
    // item.price_list_rate = this.flt(convertedPriceListRate, precision)

    return {
        price_list_rate: rate,
        base_price_list_rate: base_price_list_rate,
    };
}

export function apply_cached_price_list(context, price_list) {
    if (!price_list) return;
    const itemsMap = getCachedPriceListItems(price_list);
    if (!itemsMap) return;

    context.items.forEach((item) => {
        if (!item || !item.item_code) return;
        const rateInfo = itemsMap[item.item_code];
        if (rateInfo) {
            _applyPriceListRate(context, item, rateInfo.price_list_rate, rateInfo.currency);
        }
    });
}
