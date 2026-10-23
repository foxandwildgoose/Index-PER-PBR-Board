import { monthIndex } from "./months.ts";

export type FreshnessState = "fresh" | "awaiting_publication" | "stale" | "no_data";

export interface FreshnessRecord {
  latestObservedDate: string | null;
  lastAdvancedAt: string | null;
  lastTransportAt: string | null;
  lastAttemptAt: string | null;
  failure: string | null;
  state: FreshnessState;
}

export function emptyFreshness(): FreshnessRecord {
  return {
    latestObservedDate: null,
    lastAdvancedAt: null,
    lastTransportAt: null,
    lastAttemptAt: null,
    failure: null,
    state: "no_data",
  };
}

export function judgeFreshness(input: {
  latestObservedDate: string | null;
  expectedSession: string | null;
}): FreshnessState {
  if (!input.latestObservedDate) return "no_data";
  if (!input.expectedSession) return "stale";
  if (input.latestObservedDate >= input.expectedSession) return "fresh";
  const latestMonth = monthIndex(input.latestObservedDate.slice(0, 7));
  const expectedMonth = monthIndex(input.expectedSession.slice(0, 7));
  if (expectedMonth - latestMonth <= 1) return "awaiting_publication";
  return "stale";
}

export function applyIngestionResult(
  prev: FreshnessRecord,
  run: { ok: boolean; at: string; maxObservationDate: string | null; reason: string | null; expectedSession: string | null },
): FreshnessRecord {
  if (!run.ok) {
    return {
      ...prev,
      lastAttemptAt: run.at,
      failure: run.reason,
      state: prev.latestObservedDate ? "stale" : "no_data",
    };
  }
  const advanced =
    run.maxObservationDate != null &&
    (prev.latestObservedDate == null || run.maxObservationDate > prev.latestObservedDate);
  const latest = advanced ? run.maxObservationDate : prev.latestObservedDate;
  return {
    latestObservedDate: latest,
    lastAdvancedAt: advanced ? run.at : prev.lastAdvancedAt,
    lastTransportAt: run.at,
    lastAttemptAt: run.at,
    failure: null,
    state: judgeFreshness({ latestObservedDate: latest, expectedSession: run.expectedSession }),
  };
}

export const FRESHNESS_KO: Record<FreshnessState, string> = {
  fresh: "기대 세션까지 반영",
  awaiting_publication: "최신 공표 대기",
  stale: "이전 자료 유지",
  no_data: "자료 없음",
};
