import { API_BASE_URL, type ApiStellarConfig } from "@/lib/stellar/config";
import type {
  ApiCardMe,
  ApiCardMovement,
  ApiCardReveal,
  ApiChallenge,
  ApiDashboardStats,
  ApiDeposit,
  ApiPlan,
  ApiSchedule,
  ApiSubscription,
  ApiToken,
  ApiTransactionPage,
  ApiUser,
} from "@/types/api";

/**
 * Typed client for the Rubbi API. The SEP-10 JWT lives in memory and is
 * mirrored to sessionStorage (cleared when the tab closes); it is sent as a
 * bearer token, never as a cookie.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const SESSION_KEY = "rubbi.session";

export interface StoredSession {
  token: string;
  address: string;
}

let currentToken: string | null = null;

export const session = {
  get(): StoredSession | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredSession;
      if (typeof parsed.token !== "string" || typeof parsed.address !== "string") return null;
      currentToken = parsed.token;
      return parsed;
    } catch {
      return null;
    }
  },
  set(value: StoredSession) {
    currentToken = value.token;
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    } catch {
      // Private mode or storage disabled: the token stays in memory only.
    }
  },
  clear() {
    currentToken = null;
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  },
  token(): string | null {
    return currentToken;
  },
};

type Listener = (status: number) => void;
const unauthorizedListeners = new Set<Listener>();

/** Called with 401 so the wallet context can drop a stale session. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

async function request<T>(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.auth !== false && currentToken) headers.Authorization = `Bearer ${currentToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError(0, "The Rubbi API is unreachable. Is the backend running and is this origin in its CORS_ORIGINS?");
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && init.auth !== false) {
      for (const listener of unauthorizedListeners) listener(401);
    }
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `API error ${response.status}`;
    throw new ApiError(response.status, message, body);
  }

  return body as T;
}

const json = (value: unknown) => JSON.stringify(value);

export const api = {
  stellar: {
    config: () => request<ApiStellarConfig>("/stellar/config", { auth: false }),
  },
  auth: {
    challenge: (account: string) =>
      request<ApiChallenge>(`/auth/challenge?account=${encodeURIComponent(account)}`, { auth: false }),
    token: (transaction: string) =>
      request<ApiToken>("/auth/token", { method: "POST", body: json({ transaction }), auth: false }),
  },
  users: {
    me: () => request<ApiUser>("/users/me"),
    setUsername: (username: string) => request<ApiUser>("/users/username", { method: "POST", body: json({ username }) }),
  },
  cards: {
    me: () => request<ApiCardMe>("/cards/me"),
    reveal: () => request<ApiCardReveal>("/cards/me/number"),
    freeze: () => request<{ status: string }>("/cards/freeze", { method: "POST", body: json({}) }),
    unfreeze: () => request<{ status: string }>("/cards/unfreeze", { method: "POST", body: json({}) }),
    load: (amount: string) => request<ApiCardMovement>("/cards/load", { method: "POST", body: json({ amount }) }),
    unload: (amount: string) => request<ApiCardMovement>("/cards/unload", { method: "POST", body: json({ amount }) }),
    movements: () => request<ApiCardMovement[]>("/cards/movements"),
  },
  subscriptions: {
    plans: (includeInactive = false) =>
      request<ApiPlan[]>(`/subscriptions/plans${includeInactive ? "?includeInactive=true" : ""}`, { auth: false }),
    plan: (planId: number) => request<ApiPlan>(`/subscriptions/plans/${planId}`, { auth: false }),
    me: () => request<ApiSubscription[]>("/subscriptions/me"),
  },
  payroll: {
    schedules: () => request<ApiSchedule[]>("/payroll/schedules"),
    incoming: () => request<ApiSchedule[]>("/payroll/schedules/incoming"),
    schedule: (id: string) => request<ApiSchedule>(`/payroll/schedules/${id}`),
  },
  transactions: {
    list: (params: { page?: number; pageSize?: number; account?: "WALLET" | "CARD" } = {}) => {
      const query = new URLSearchParams();
      if (params.page) query.set("page", String(params.page));
      if (params.pageSize) query.set("pageSize", String(params.pageSize));
      if (params.account) query.set("account", params.account);
      const qs = query.toString();
      return request<ApiTransactionPage>(`/transactions${qs ? `?${qs}` : ""}`);
    },
  },
  deposits: {
    list: () => request<ApiDeposit[]>("/deposits"),
  },
  dashboard: {
    stats: () => request<ApiDashboardStats>("/dashboard/stats"),
  },
};

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}
