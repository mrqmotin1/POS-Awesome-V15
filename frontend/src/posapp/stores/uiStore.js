import { defineStore } from "pinia";
import { ref, computed } from "vue";

export const useUIStore = defineStore("ui", () => {
	// Loading Overlay State
	const isLoading = ref(false);
	const loadingText = ref("Loading...");

	// Freeze Dialog State (Blocking UI)
	const isFrozen = ref(false);
	const freezeTitle = ref("");
	const freezeMessage = ref("");

	// Main POS View State	// Active View (for handling back button)
	const activeView = ref("items"); // 'items', 'payment', 'offers', 'coupons'

	const draftsDialog = ref(false);
	const draftsData = ref([]);

	const ordersDialog = ref(false);
	const ordersData = ref([]);

	const setActiveView = (view) => {
		activeView.value = view;
	};

	const openDrafts = (data) => {
		draftsData.value = data || [];
		draftsDialog.value = true;
	};

	const closeDrafts = () => {
		draftsDialog.value = false;
	};

	const openOrders = (data) => {
		ordersData.value = data || [];
		ordersDialog.value = true;
	};

	const closeOrders = () => {
		ordersDialog.value = false;
	};

	function setLoading(active, text = "Loading...") {
		isLoading.value = active;
		loadingText.value = text;
	}

	function freeze(title, message) {
		freezeTitle.value = title || "Processing";
		freezeMessage.value = message || "Please wait...";
		isFrozen.value = true;
	}

	function unfreeze() {
		isFrozen.value = false;
		freezeTitle.value = "";
		freezeMessage.value = "";
	}

	// POS Profile & Settings
	const posProfile = ref(null);
	const stockSettings = ref({});
	const companyDoc = ref(null);
	const posOpeningShift = ref(null);

	const currency = computed(() => posProfile.value?.currency || "");
	const company = computed(() => posProfile.value?.company || "");

	function setPosProfile(profile) {
		posProfile.value = profile;
	}

	function setStockSettings(settings) {
		stockSettings.value = settings || {};
	}

	function setCompanyDoc(doc) {
		companyDoc.value = doc;
	}

	function setRegisterData(data) {
		if (data.pos_profile) posProfile.value = data.pos_profile;
		if (data.stock_settings) stockSettings.value = data.stock_settings;
		if (data.company) companyDoc.value = data.company;
		if (data.pos_opening_shift) posOpeningShift.value = data.pos_opening_shift;
	}

	const lastInvoiceId = ref(null);
	function setLastInvoice(id) {
		lastInvoiceId.value = id;
	}

	const offers = ref([]);
	function setOffers(data) {
		offers.value = data || [];
	}

	return {
		isLoading,
		loadingText,
		isFrozen,
		freezeTitle,
		freezeMessage,
		activeView,
		setActiveView,
		draftsDialog,
		draftsData,
		openDrafts,
		closeDrafts,
		ordersDialog,
		ordersData,
		openOrders,
		closeOrders,
		posProfile,
		stockSettings,
		companyDoc,
		posOpeningShift,
		lastInvoiceId,
		offers,
		currency,
		company,
		setLoading,
		freeze,
		unfreeze,
		setPosProfile,
		setStockSettings,
		setCompanyDoc,
		setRegisterData,
		setLastInvoice,
		setOffers
	};
});
