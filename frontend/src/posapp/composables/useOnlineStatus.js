import { ref, onUnmounted, getCurrentInstance } from "vue";

// Singleton state
const isOnline = ref(navigator.onLine);
let listenersCount = 0;

const updateOnlineStatus = () => {
    isOnline.value = navigator.onLine;
};

export function useOnlineStatus() {
    if (listenersCount === 0) {
        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);
    }
    listenersCount++;

    onUnmounted(() => {
        listenersCount--;
        if (listenersCount === 0) {
            window.removeEventListener("online", updateOnlineStatus);
            window.removeEventListener("offline", updateOnlineStatus);
        }
    });

    return {
        isOnline,
    };
}
