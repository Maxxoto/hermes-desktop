import { useQuery } from "@tanstack/react-query";
import { getGatewayClient } from "../connection/gateway-api";

export interface GatewayHealthData {
  status: string;
  activeSessions: number;
  version: string;
}

export function useGatewayHealth() {
  return useQuery<GatewayHealthData>({
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
    refetchInterval: 5_000,
  });
}
