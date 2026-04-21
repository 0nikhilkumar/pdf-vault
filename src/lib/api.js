const DEFAULT_API_BASE_URL = "http://localhost:3000/api";

const trimTrailingSlash = (value) => String(value || "").replace(/\/$/, "");

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
);

export const buildApiUrl = (path) => {
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const withAuthHeader = (accessToken, headers = {}) => {
  if (!accessToken) return headers;
  return { ...headers, Authorization: `Bearer ${accessToken}` };
};

export const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};
