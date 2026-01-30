/**
 * Environment config for Create React App.
 * Do not access process.env directly across the app; centralize here.
 */

// PUBLIC_INTERFACE
export function getApiBaseUrl() {
  /** Returns the backend base URL (defaults to localhost:3001). */
  return process.env.REACT_APP_API_BASE_URL || "http://localhost:3001";
}
