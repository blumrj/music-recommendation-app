/**
 * Shared Utilities & Helpers
 * Common functions used throughout the application
 */

// ===== ERROR HANDLING =====

export function parseApiError(error: unknown): string {
  if (!error) {
    return "An unknown error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && "response" in error) {
    const axiosError = error as Record<string, unknown>;
    const response = axiosError.response as Record<string, unknown>;
    const data = response?.data as Record<string, unknown>;

    if (data?.error) {
      return String(data.error);
    }

    if ("message" in axiosError) {
      return `Error: ${axiosError.message}`;
    }
  }

  return "An unknown error occurred";
}
