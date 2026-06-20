import { useQuery } from "@tanstack/react-query";
import { getGatewayClient, type AgentInfo } from "../connection/gateway-api";

export function useAgents() {
  return useQuery<AgentInfo[]>({
    queryKey: ["agents"],
    queryFn: () => getGatewayClient().listAgents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

export type { AgentInfo };
