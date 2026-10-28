/** Response shapes of the Rubbi API (RL-api, Phase 4). Amounts are decimal strings with up to 7 decimals. */

export interface ApiCard {
  id: string;
  issuer: string; // "MOCK" | "SUDO"
  issuerId: string;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  status: string; // ACTIVE | FROZEN | ...
}

export interface ApiUser {
  id: string;
  stellarAddress: string;
  username: string | null;
  walletBalance: string;
  cardBalance: string;
  card: ApiCard | null;
}

export interface ApiAuthUser {
  id: string;
  stellarAddress: string;
  username: string | null;
}

export interface ApiChallenge {
  transaction: string;
  network_passphrase: string;
}

export interface ApiToken {
  token: string;
  user: ApiAuthUser;
}

export interface ApiCardMe extends ApiCard {
  cardBalance: string;
  walletBalance: string;
}

export interface ApiCardReveal {
  cardId: string;
  issuer: string;
  pan: string | null;
  last4: string;
  expiryMonth: string;
  expiryYear: string;
  status: string;
}

export type CardMovementStatus = "PENDING" | "SETTLED" | "PENDING_TREASURY" | "COMPLETED" | "FAILED";

export interface ApiCardMovement {
  id: string;
  direction: "LOAD" | "UNLOAD";
  amount: string;
  status: CardMovementStatus;
  reference: string;
  txHash: string | null;
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
  completedAt: string | null;
}

export interface ApiPlan {
  id: number;
  merchant: string;
  name: string;
  amount: string;
  period: number; // seconds
  active: boolean;
}

export type SubscriptionStatus = "ACTIVE" | "PAUSED" | "PAST_DUE" | "CANCELLED";

export interface ApiSubscription {
  id: string;
  onChainSubId: string;
  subscriber: string;
  planId: number;
  status: SubscriptionStatus;
  nextDueAt: string;
  lastChargedAt: string | null;
  createdAt: string;
  plan: ApiPlan | null;
}

export type ScheduleStatus = "ACTIVE" | "PAUSED" | "CANCELLED";

export interface ApiSchedule {
  id: string;
  onChainId: string;
  employer: string;
  recipient: string;
  amount: string;
  period: number; // seconds
  label: string;
  status: ScheduleStatus;
  nextDueAt: string;
  lastDisbursedAt: string | null;
  createdAt: string;
}

export interface ApiTransaction {
  id: string;
  type: string;
  account: "WALLET" | "CARD";
  amount: string; // signed delta
  balanceAfter: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiTransactionPage {
  page: number;
  pageSize: number;
  total: number;
  items: ApiTransaction[];
}

export interface ApiDeposit {
  id: string;
  txHash: string;
  eventId: string;
  amountRaw: string;
  amount: string;
  status: string;
  ledger: number;
  confirmedAt: string | null;
  createdAt: string;
}

export interface ApiDashboardStats {
  walletBalance: string;
  cardBalance: string;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  activeSchedules: number;
  incomingSchedules: number;
  recentTransactions: ApiTransaction[];
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
}
