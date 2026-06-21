import { useQuery } from "@tanstack/react-query";
import { getGatewayClient, type AgentInfo } from "../connection/gateway-api";

const DEFAULT_AGENTS: AgentInfo[] = [
  { id: "default", name: "Default Agent", description: "Main Hermes agent" },
];

export function useAgents() {
  return useQuery<AgentInfo[]>({
    queryKey: ["agents"],
    queryFn: () => getGatewayClient().listAgents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    placeholderData: DEFAULT_AGENTS,
  });
}

export type { AgentInfo };
