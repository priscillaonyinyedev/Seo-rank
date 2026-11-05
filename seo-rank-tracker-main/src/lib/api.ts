const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("rankpilot-token");
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${response.status})`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
}
