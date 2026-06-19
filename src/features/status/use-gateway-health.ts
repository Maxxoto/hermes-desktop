import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import type { Query } from "@tanstack/react-query";
import { getGatewayClient } from "../connection/gateway-api";

export interface GatewayHealthData {
  status: string;
  activeSessions: number;
  version: string;
}

const BASE_INTERVAL = 5_000; // 5 seconds
const MAX_INTERVAL = 60_000; // 60 seconds

/**
 * Compute exponential backoff interval based on consecutive failure count.
 * Returns the interval in milliseconds for the next refetch.
 *
 * 0 failures → 5s (BASE)
 * 1 failure  → 10s
 * 2 failures → 20s
 * 3 failures → 40s
 * 4+ failures → 60s (MAX, capped)
 */
export function getBackoffInterval(failureCount: number): number {
  if (failureCount <= 0) return BASE_INTERVAL;
  const interval = BASE_INTERVAL * Math.pow(2, failureCount);
  return Math.min(interval, MAX_INTERVAL);
}

function isHealthy(data: GatewayHealthData | undefined): boolean {
  if (!data) return false;
  const status = data.status?.toLowerCase();
  return status === "ok" || status === "healthy";
}

/**
 * useGatewayHealth — polls the gateway /health endpoint.
 *
 * When the gateway is healthy, polls every 5s.
 * When the gateway is down or unhealthy, uses exponential backoff:
 * 5s → 10s → 20s → 40s → 60s (capped).
 *
 * Also exposes `reconnectIn` (seconds countdown) for the StatusBar UI.
 */
export function useGatewayHealth() {
  // Track consecutive failures for backoff calculation
  const [failureCount, setFailureCount] = useState(0);
  // Countdown for the UI ("Reconnecting in Xs.")
  const [reconnectIn, setReconnectIn] = useState<number | null>(null);
  const intervalRef = useRef<number>(BASE_INTERVAL);

  const query = useQuery<GatewayHealthData>({
    queryKey: ["gateway-health"],
    queryFn: async () => {
      const client = getGatewayClient();
      const health = await client.health();
      const detailed = await client.healthDetailed().catch(() => null);
      return {
        status: health.status,
        activeSessions: detailed?.sessions_active ?? 0,
        version: detailed?.version ?? "?",
      };
    },
    // Dynamic refetch interval — React Query passes the full Query object
    refetchInterval: (q: Query<GatewayHealthData>) => {
      if (q.state.status === "error" || !isHealthy(q.state.data)) {
        // In error / unhealthy state — use backoff
        intervalRef.current = getBackoffInterval(failureCount);
        return intervalRef.current;
      }
      // Healthy — reset to base interval
      intervalRef.current = BASE_INTERVAL;
      return BASE_INTERVAL;
    },
  });

  // Track failure / recovery transitions
  useEffect(() => {
    if (query.isError || (query.data && !isHealthy(query.data))) {
      // Gateway is down or unhealthy — increment failure count
      setFailureCount((prev) => prev + 1);
    } else if (query.data && isHealthy(query.data)) {
      // Gateway recovered — reset failure count
      setFailureCount(0);
    }
  }, [query.isError, query.data]);

  // Countdown timer — shows remaining seconds until next retry
  useEffect(() => {
    // Only count down when we're in a backoff state
    if (failureCount === 0 || (!query.isError && isHealthy(query.data))) {
      setReconnectIn(null);
      return;
    }

    const intervalMs = getBackoffInterval(failureCount);
    setReconnectIn(Math.ceil(intervalMs / 1000));

    const timer = setInterval(() => {
      setReconnectIn((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [failureCount, query.isError, query.data]);

  return {
    ...query,
    failureCount,
    reconnectIn,
  };
}
