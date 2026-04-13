import { ref } from 'vue'

declare const frappe: { user_roles: string[] }

// Shared reactive state
export const isManagerMode = ref<boolean>(false)
export const isSessionUserManager = ref<boolean>(false)

// Initialize
export function initManagerMode(): void {
  if (Array.isArray(frappe.user_roles) && frappe.user_roles.includes("Counter Manager")) {
    isManagerMode.value = true
    isSessionUserManager.value = true
  }
  else {
    isManagerMode.value = false
    isSessionUserManager.value = false
  }
}

// Expose setter
export function setManagerMode(value: boolean): void {
  isManagerMode.value = value
}
