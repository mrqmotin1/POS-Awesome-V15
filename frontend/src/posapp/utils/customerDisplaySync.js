// utils/customerDisplaySync.js
export function createRandomChannelId() {
	return `cd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildCustomerDisplayUrl(channelId) {
  const url = new URL(window.location.href);
  url.searchParams.set("customer_display", "1");
  url.searchParams.set("channel", channelId);
  return url.toString();
}

function safeClone(data) {
  try {
    return structuredClone(data);
  } catch (e) {
    return JSON.parse(JSON.stringify(data));
  }
}

export function createCustomerDisplaySync(channelId) {
  const CHANNEL_NAME = `posa_customer_display_${channelId}`;
  const bc = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;

  function send(payload) {
    const msg = { type: "CART_SYNC", payload: safeClone(payload), ts: Date.now() };

    if (bc) bc.postMessage(msg);

    // fallback (optional): localStorage event for old browsers
    try {
      localStorage.setItem(CHANNEL_NAME, JSON.stringify(msg));
      localStorage.removeItem(CHANNEL_NAME);
    } catch (e) {}
  }

  function onReceive(handler) {
    if (bc) {
      bc.onmessage = (e) => {
        if (!e?.data || e.data.type !== "CART_SYNC") return;
        handler(e.data.payload);
      };
    }

    window.addEventListener("storage", (e) => {
      if (e.key !== CHANNEL_NAME || !e.newValue) return;
      try {
        const msg = JSON.parse(e.newValue);
        if (msg.type !== "CART_SYNC") return;
        handler(msg.payload);
      } catch (err) {}
    });
  }

  return { send, onReceive };
}
