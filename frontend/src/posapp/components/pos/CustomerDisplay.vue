<template>
  <div
		class="pos-main-container dynamic-container"
		:class="rtlClasses"
		:style="[responsiveStyles, rtlStyles]"
	>
    <v-row dense class="ma-0 dynamic-main-row">
        <v-col xl="12" lg="12" md="12" sm="12" cols="12" class="pos dynamic-col">
          <header class="cd-header">
            <div class="cd-title">Current Order</div>
          </header>

          <div v-if="!cart.items.length" class="display-empty-state">
            <h2>{{ __("Waiting for cart items") }}</h2>
            <p>{{ __("Items added in POS will appear here automatically.") }}</p>
          </div>

          <div v-else class="display-table-wrap">
            <table class="display-table">
              <thead>
                <tr>
                  <th>{{ __("Item") }}</th>
                  <th>{{ __("Qty") }}</th>
                  <th>{{ __("Rate") }}</th>
                  <th>{{ __("Amount") }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in cart.items" :key="row.item_code">
                  <td>{{ row.item_name }}</td>
                  <td>{{ row.qty }}</td>
                  <td>{{ Number(row.rate || 0).toFixed(2) }}</td>
                  <td>{{ Number(row.amount || 0).toFixed(2) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <footer class="display-footer">
            <div class="display-total-label">{{ __("Total") }}</div>
            <div class="display-total-value">{{ formatCurrency(totals.grand_total) }}</div>
          </footer>
        </v-col>
        <!-- <v-col xl="4" lg="4" md="4" sm="4" cols="12" class="pos dynamic-col">
        </v-col> -->
    </v-row>
    </div>
</template>

<script setup>
import { reactive } from "vue";
import { createCustomerDisplaySync } from "../../utils/customerDisplaySync.js";
import { useResponsive } from "../../composables/useResponsive.js";
import { useRtl } from "../../composables/useRtl.js";

const responsive = useResponsive();
const rtl = useRtl();

// NOTE: We'll receive a "payload" from main window that contains the cart doc.
// Keep it flexible because POSAwesome structures vary a bit by version.
const cart = reactive({ items: [] });
const totals = reactive({
  net_total: 0,
  discount_total: 0,
  grand_total: 0,
});

function formatCurrency(v) {
  const n = Number(v || 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function applyPayload(p) {
    // Expected payload example:
    // { items: [...], net_total, grand_total, taxes, discount_amount ... }
    cart.items = Array.isArray(p?.items) ? p.items : [];

    totals.net_total = p?.net_total ?? p?.subtotal ?? 0;
    totals.grand_total = p?.grand_total ?? p?.rounded_total ?? 0;

    // try to infer tax/discount if your payload provides them
    totals.tax_total = p?.tax_total ?? p?.total_taxes_and_charges ?? 0;
    totals.discount_total = p?.discount_total ?? p?.discount_amount ?? 0;
}

const sync = createCustomerDisplaySync();
    sync.onReceive((payload) => applyPayload(payload));
</script>

<style scoped>
    .customer-display { height: 100vh; display: flex; flex-direction: column; background: #fff; }
    .cd-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid #eee; }
    .cd-title { font-size: 20px; font-weight: 700; }
    .cd-total { font-size: 18px; }
    .cd-total span { font-weight: 800; }

    .cd-body { flex: 1; overflow: auto; padding: 10px 18px; }
    .cd-table { width: 100%; border-collapse: collapse; }
    .cd-table th, .cd-table td { padding: 10px 8px; border-bottom: 1px solid #f0f0f0; text-align: left; }
    .cd-table th.qty, .cd-table td.qty,
    .cd-table th.price, .cd-table td.price,
    .cd-table th.amount, .cd-table td.amount { text-align: right; width: 110px; }
    .name { font-weight: 600; }
    .meta { font-size: 12px; opacity: 0.7; margin-top: 2px; }
    .empty { text-align: center; padding: 20px; opacity: 0.7; }

    .cd-footer { border-top: 1px solid #eee; padding: 12px 18px; }
    .line { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand { font-size: 18px; font-weight: 800; }

    .dynamic-container {
        /* add space for the navbar with better spacing */
        /*padding-top: calc(25px + var(--dynamic-lg));*/
        /* Navbar height (25px) + larger spacing */
        transition: all 0.3s ease;
    }
    .dynamic-main-row {
        padding: 0;
        margin: 0;
    }
    .dynamic-col {
        padding: var(--dynamic-sm);
        transition: padding 0.3s ease;
        margin-top: var(--dynamic-sm);
        /* Add top margin for better separation */
    }
    @media (max-width: 768px) {
        .dynamic-container {
            padding-top: calc(56px + var(--dynamic-md));
            /* Consistent navbar height + medium spacing */
        }
        .dynamic-col {
            padding: var(--dynamic-xs);
            margin-top: var(--dynamic-xs);
        }
    }
    .customer-display-screen {
	height: 100%;
	display: grid;
	grid-template-rows: auto 1fr auto;
	gap: 12px;
	color: #f9fafb;
}

.display-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	background: rgba(17, 24, 39, 0.82);
	border: 1px solid rgba(148, 163, 184, 0.22);
	border-radius: 14px;
	padding: 16px 20px;
	backdrop-filter: blur(6px);
}

.display-title-block h1 {
	margin: 0;
	font-size: clamp(24px, 2.6vw, 38px);
	font-weight: 800;
}

.display-subtitle {
	margin: 4px 0 0;
	color: #cbd5e1;
	font-size: clamp(14px, 1.2vw, 18px);
}

.display-meta {
	text-align: right;
	color: #e2e8f0;
	font-size: clamp(13px, 1.1vw, 16px);
}

.display-meta p {
	margin: 0;
}

.display-table-wrap {
	overflow: auto;
	border-radius: 14px;
	border: 1px solid rgba(148, 163, 184, 0.2);
	background: rgba(15, 23, 42, 0.78);
}

.display-table {
	width: 100%;
	border-collapse: collapse;
}

.display-table th,
.display-table td {
	padding: 14px 16px;
	border-bottom: 1px solid rgba(148, 163, 184, 0.17);
	font-size: clamp(14px, 1.2vw, 20px);
}

.display-table th {
	position: sticky;
	top: 0;
	background: rgba(15, 23, 42, 0.62);
	text-transform: uppercase;
	font-size: clamp(12px, 1vw, 14px);
	letter-spacing: 0.04em;
  color: white;
}

.display-table td:nth-child(2),
.display-table td:nth-child(3),
.display-table td:nth-child(4),
.display-table th:nth-child(2),
.display-table th:nth-child(3),
.display-table th:nth-child(4) {
	text-align: right;
}

.display-empty-state {
	display: grid;
	place-items: center;
	text-align: center;
	border-radius: 14px;
	padding: 28px;
	border: 1px dashed rgba(148, 163, 184, 0.35);
	background: rgba(15, 23, 42, 0.62);
}

.display-empty-state h2 {
	margin: 0 0 8px;
	font-size: clamp(20px, 2vw, 30px);
}

.display-empty-state p {
	margin: 0;
	color: #cbd5e1;
	font-size: clamp(14px, 1.1vw, 18px);
}

.display-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background: rgba(3, 105, 161, 0.25);
	border: 1px solid rgba(56, 189, 248, 0.38);
	border-radius: 14px;
	padding: 14px 20px;
}

.display-total-label {
	font-size: clamp(16px, 1.6vw, 24px);
	font-weight: 700;
}

.display-total-value {
	font-size: clamp(26px, 3vw, 44px);
	font-weight: 900;
	color: #fef08a;
}


</style>
