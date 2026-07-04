import { getAccessToken as getServerAccessToken, resetAuthCookies } from "../actions/auth.actions";
import { DISABLE_OFFLINE } from "../config/offline";

function getClientAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("session_access_token="));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split("=")[1]);
  } catch {
    return match.split("=")[1] || null;
  }
}

function getClientActiveTenantId(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("active_tenant_id="));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split("=")[1]);
  } catch {
    return match.split("=")[1] || null;
  }
}

async function getAccessToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return getClientAccessToken();
  }
  return getServerAccessToken();
}

async function getActiveTenantId(): Promise<string | null> {
  if (typeof window !== "undefined") {
    return getClientActiveTenantId();
  }
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get("active_tenant_id")?.value || null;
  } catch {
    return null;
  }
}

// development
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export const sendMessageEndpoint = process.env.NEXT_PUBLIC_BACKEND_MESSAGE_URL;

// productiont
// const BASE_URL = process.env.NEXT_PUBLIC_PRODUCTION_API_URL;



async function fetchWithCatch(
  url: string,
  options: RequestInit = {},
): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}${url}`, options);

    // For 204 No Content
    if (response.status === 204) {
      return { detail: "No Content" };
    }

    // Try to parse response (could be error JSON)
    let data: any = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    }

    if (!response.ok) {
      // Check if token is invalid or expired
      if (
        response.status === 401 ||
        (data && data.code === "token_not_valid")
      ) {
        if (typeof window !== "undefined") {
          // Clear client-side cookies
          document.cookie = "session_user=; max-age=0; path=/;";
          document.cookie = "session_access_token=; max-age=0; path=/;";

          // Reset server cookies
          resetAuthCookies().catch((err) => {
            console.error("Failed to reset auth cookies on server", err);
          });

          // Redirect to login if on a protected route
          const currentPath = window.location.pathname;
          if (
            currentPath !== "/login" &&
            currentPath !== "/register" &&
            !currentPath.startsWith("/reset-password")
          ) {
            window.location.href = "/login";
          }
        }
      }

      // If error, throw data so caller .catch gets it
      throw data || { detail: response.statusText };
    }

    return data;
  } catch (error) {
    // Network/parsing errors
    console.log(error);

    throw error;
  }
}

async function buildHeaders(contentType: string | null = "application/json"): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const tenantId = await getActiveTenantId();
  const headers: Record<string, string> = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  headers["Accept"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (tenantId) headers["X-Tenant"] = tenantId;
  return headers;
}

export const apiService = {
  get: async function (url: string, params?: Record<string, any>): Promise<any> {
    if (!DISABLE_OFFLINE && typeof window !== "undefined") {
      const { getIsOfflineStatus } = await import("../hooks/useIsOffline");
      if (getIsOfflineStatus() || !navigator.onLine) {
        const { offlineInterceptor } = await import("./offlineInterceptor");
        return offlineInterceptor.handleGet(url, params);
      }
    }

    const headers = await buildHeaders();

    let finalUrl = url;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalUrl += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    try {
      const res = await fetchWithCatch(finalUrl, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!DISABLE_OFFLINE && typeof window !== "undefined" && url.replace(/^\/api/, "") === "/business/profile/") {
        const tenantId = getClientActiveTenantId();
        if (tenantId) {
          localStorage.setItem(`qstack_business_profile_${tenantId}`, JSON.stringify(res));
        }
      }

      return res;
    } catch (error) {
      if (!DISABLE_OFFLINE && typeof window !== "undefined") {
        const { setGlobalOffline } = await import("../hooks/useIsOffline");
        setGlobalOffline(true);
        const { offlineInterceptor } = await import("./offlineInterceptor");
        try {
          return await offlineInterceptor.handleGet(url, params);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  postWithoutToken: async function (url: string, data: any): Promise<any> {
    return fetchWithCatch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
  },

  post: async function (url: string, data?: any): Promise<any> {
    if (!DISABLE_OFFLINE && typeof window !== "undefined") {
      const { getIsOfflineStatus } = await import("../hooks/useIsOffline");
      if (getIsOfflineStatus() || !navigator.onLine) {
        const { offlineInterceptor } = await import("./offlineInterceptor");
        return offlineInterceptor.handleWrite("POST", url, data);
      }
    }

    const headers = await buildHeaders();

    const options: RequestInit = {
      method: "POST",
      credentials: "include",
      headers,
    };

    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }

    try {
      return await fetchWithCatch(url, options);
    } catch (error: any) {
      const isNetworkError = error instanceof TypeError || error?.message === "Failed to fetch" || !error.status;
      if (!DISABLE_OFFLINE && typeof window !== "undefined" && isNetworkError) {
        const { setGlobalOffline } = await import("../hooks/useIsOffline");
        setGlobalOffline(true);
        const { offlineInterceptor } = await import("./offlineInterceptor");
        try {
          return await offlineInterceptor.handleWrite("POST", url, data);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  postFormData: async function (url: string, formData: FormData): Promise<any> {
    if (!DISABLE_OFFLINE && typeof window !== "undefined") {
      const { getIsOfflineStatus } = await import("../hooks/useIsOffline");
      if (getIsOfflineStatus() || !navigator.onLine) {
        const { offlineInterceptor } = await import("./offlineInterceptor");
        const dataObj: Record<string, any> = {};
        formData.forEach((value, key) => {
          if (typeof value === "string") dataObj[key] = value;
        });
        return offlineInterceptor.handleWrite("POST", url, dataObj);
      }
    }

    const headers = await buildHeaders(null);

    try {
      return await fetchWithCatch(url, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });
    } catch (error: any) {
      const isNetworkError = error instanceof TypeError || error?.message === "Failed to fetch" || !error.status;
      if (!DISABLE_OFFLINE && typeof window !== "undefined" && isNetworkError) {
        const { setGlobalOffline } = await import("../hooks/useIsOffline");
        setGlobalOffline(true);
        const { offlineInterceptor } = await import("./offlineInterceptor");
        const dataObj: Record<string, any> = {};
        formData.forEach((value, key) => {
          if (typeof value === "string") dataObj[key] = value;
        });
        try {
          return await offlineInterceptor.handleWrite("POST", url, dataObj);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  patchFormData: async function (url: string, formData: FormData): Promise<any> {
    if (!DISABLE_OFFLINE && typeof window !== "undefined") {
      const { getIsOfflineStatus } = await import("../hooks/useIsOffline");
      if (getIsOfflineStatus() || !navigator.onLine) {
        const { offlineInterceptor } = await import("./offlineInterceptor");
        const dataObj: Record<string, any> = {};
        formData.forEach((value, key) => {
          if (typeof value === "string") dataObj[key] = value;
        });
        return offlineInterceptor.handleWrite("PATCH", url, dataObj);
      }
    }

    const headers = await buildHeaders(null);

    try {
      return await fetchWithCatch(url, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: formData,
      });
    } catch (error: any) {
      const isNetworkError = error instanceof TypeError || error?.message === "Failed to fetch" || !error.status;
      if (!DISABLE_OFFLINE && typeof window !== "undefined" && isNetworkError) {
        const { setGlobalOffline } = await import("../hooks/useIsOffline");
        setGlobalOffline(true);
        const { offlineInterceptor } = await import("./offlineInterceptor");
        const dataObj: Record<string, any> = {};
        formData.forEach((value, key) => {
          if (typeof value === "string") dataObj[key] = value;
        });
        try {
          return await offlineInterceptor.handleWrite("PATCH", url, dataObj);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  put: async function (url: string, data: any): Promise<any> {
    if (!DISABLE_OFFLINE && typeof window !== "undefined") {
      const { getIsOfflineStatus } = await import("../hooks/useIsOffline");
      if (getIsOfflineStatus() || !navigator.onLine) {
        const { offlineInterceptor } = await import("./offlineInterceptor");
        return offlineInterceptor.handleWrite("PUT", url, data);
      }
    }

    const headers = await buildHeaders();

    try {
      return await fetchWithCatch(url, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      const isNetworkError = error instanceof TypeError || error?.message === "Failed to fetch" || !error.status;
      if (!DISABLE_OFFLINE && typeof window !== "undefined" && isNetworkError) {
        const { setGlobalOffline } = await import("../hooks/useIsOffline");
        setGlobalOffline(true);
        const { offlineInterceptor } = await import("./offlineInterceptor");
        try {
          return await offlineInterceptor.handleWrite("PUT", url, data);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  patch: async function (url: string, data: any): Promise<any> {
    if (!DISABLE_OFFLINE && typeof window !== "undefined") {
      const { getIsOfflineStatus } = await import("../hooks/useIsOffline");
      if (getIsOfflineStatus() || !navigator.onLine) {
        const { offlineInterceptor } = await import("./offlineInterceptor");
        return offlineInterceptor.handleWrite("PATCH", url, data);
      }
    }

    const headers = await buildHeaders();

    try {
      const res = await fetchWithCatch(url, {
        method: "PATCH",
        credentials: "include",
        headers,
        body: JSON.stringify(data),
      });

      if (!DISABLE_OFFLINE && typeof window !== "undefined" && url.replace(/^\/api/, "") === "/business/profile/") {
        const tenantId = getClientActiveTenantId();
        if (tenantId) {
          localStorage.setItem(`qstack_business_profile_${tenantId}`, JSON.stringify(res));
        }
      }

      return res;
    } catch (error: any) {
      const isNetworkError = error instanceof TypeError || error?.message === "Failed to fetch" || !error.status;
      if (!DISABLE_OFFLINE && typeof window !== "undefined" && isNetworkError) {
        const { setGlobalOffline } = await import("../hooks/useIsOffline");
        setGlobalOffline(true);
        const { offlineInterceptor } = await import("./offlineInterceptor");
        try {
          return await offlineInterceptor.handleWrite("PATCH", url, data);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },

  delete: async function (url: string): Promise<any> {
    if (!DISABLE_OFFLINE && typeof window !== "undefined") {
      const { getIsOfflineStatus } = await import("../hooks/useIsOffline");
      if (getIsOfflineStatus() || !navigator.onLine) {
        const { offlineInterceptor } = await import("./offlineInterceptor");
        return offlineInterceptor.handleWrite("DELETE", url, null);
      }
    }

    const headers = await buildHeaders(null);

    try {
      return await fetchWithCatch(url, {
        method: "DELETE",
        headers,
      });
    } catch (error: any) {
      const isNetworkError = error instanceof TypeError || error?.message === "Failed to fetch" || !error.status;
      if (!DISABLE_OFFLINE && typeof window !== "undefined" && isNetworkError) {
        const { setGlobalOffline } = await import("../hooks/useIsOffline");
        setGlobalOffline(true);
        const { offlineInterceptor } = await import("./offlineInterceptor");
        try {
          return await offlineInterceptor.handleWrite("DELETE", url, null);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  },
};

export const getBackendErrorMessage = (error: any): string => {
  if (!error) return "An unexpected error occurred.";
  
  if (typeof error === "string") return error;
  
  if (error.detail && typeof error.detail === "string") return error.detail;
  
  if (Array.isArray(error.non_field_errors) && error.non_field_errors.length > 0) {
    return error.non_field_errors[0];
  }

  if (typeof error === "object") {
    const messages: string[] = [];
    for (const key in error) {
      if (Object.prototype.hasOwnProperty.call(error, key)) {
        const val = error[key];
        if (Array.isArray(val)) {
          messages.push(`${key}: ${val.join(", ")}`);
        } else if (typeof val === "string") {
          messages.push(`${key}: ${val}`);
        }
      }
    }
    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return error.message || "An unexpected error occurred.";
};
