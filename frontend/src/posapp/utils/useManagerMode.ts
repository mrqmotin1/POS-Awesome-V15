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

// Revert only temporary (borrowed) elevation; leave real manager-role users intact
export function revertManagerElevation(): boolean {
  if (isManagerMode.value && !isSessionUserManager.value) {
    isManagerMode.value = false
    return true
  }
  return false
}

// Auto-initialize on module load — frappe.user_roles is available before any component mounts
initManagerMode()
