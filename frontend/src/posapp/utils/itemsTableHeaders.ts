/**
 * Interface representing a table header configuration.
 */
export interface TableHeader {
    title: string;
    key: string;
    align?: "start" | "center" | "end";
    sortable?: boolean;
    width?: string;
    cellProps?: Record<string, any> | ((_data: any) => Record<string, any>);
    headerProps?: Record<string, any>;
}

/**
 * Get table headers configuration for items list view.
 * @param context Context: 'pos' or 'purchase'
 * @param posProfile POS profile configuration
 * @returns Array of header configurations
 */
export function getItemsTableHeaders(context: "pos" | "purchase" | string, posProfile?: any): TableHeader[] {
    if (context === "purchase") {
        return [
            {
                title: __("Item"),
                key: "item_name",
                align: "start",
                sortable: true,
                width: "40%",
                cellProps: { class: "item-name-col" },
            },
            {
                title: __("Buying Price"),
                key: "rate",
                align: "end",
                sortable: true,
                width: "25%",
            },
            {
                title: __("Stock"),
                key: "actual_qty",
                align: "end",
                sortable: true,
                width: "20%",
                cellProps: { class: "nowrap-col" },
            },
        ];
    }

    const headers: TableHeader[] = [
        {
            title: __("Name"),
            align: "start",
            sortable: true,
            key: "item_name",
            cellProps: { class: "item-name-col" },
            headerProps: { class: "item-name-col" },
        },
        {
            title: __("Code"),
            align: "start",
            sortable: true,
            key: "item_code",
        },
        {
            title: __("Rate"),
            key: "rate",
            align: "start",
            cellProps: { class: "nowrap-col" },
            headerProps: { class: "selector-col-rate" },
        },
        {
            title: __("AVL. QTY"),
            key: "actual_qty",
            align: "start",
            cellProps: { class: "nowrap-col" },
            headerProps: { class: "selector-col-qty" },
        },
        // { title: __("UOM"), key: "stock_uom", align: "start" },
    ];

    // Remove item code column if configured
    if (posProfile && !posProfile.posa_display_item_code) {
        headers.splice(1, 1);
    }

    // Columns installed apps declare for this profile's UI layout
    // (posawesome_item_selector_columns hook), delivered with the opening data.
    const extraColumns = posProfile?.__onload?.posa_item_selector_columns;
    if (Array.isArray(extraColumns)) {
        extraColumns.forEach((column: any) => {
            const key = column?.fieldname;
            if (!key || headers.some((header) => header.key === key)) return;
            const header: TableHeader = {
                title: __(column.label || key),
                key,
                align: "start",
                sortable: true,
            };
            if (column.width) header.width = `${column.width}px`;
            const afterIndex = headers.findIndex((h) => h.key === column.insert_after);
            const rateIndex = headers.findIndex((h) => h.key === "rate");
            const index = afterIndex >= 0 ? afterIndex + 1 : rateIndex >= 0 ? rateIndex : headers.length;
            headers.splice(index, 0, header);
        });
    }

    return headers;
}
