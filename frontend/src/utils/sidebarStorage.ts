/**
 * Sidebar collapse state persistence utilities
 */

const SIDEBAR_STORAGE_KEY = "sidebarOpen";

/**
 * Get the saved sidebar state from localStorage
 * Defaults to true (expanded) if no saved state exists
 */
export function getSidebarState(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === null ? true : JSON.parse(saved);
  } catch (error) {
    console.error("Failed to read sidebar state from localStorage:", error);
    return true;
  }
}

/**
 * Save the sidebar state to localStorage
 */
export function setSidebarState(isOpen: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(isOpen));
  } catch (error) {
    console.error("Failed to save sidebar state to localStorage:", error);
  }
}
