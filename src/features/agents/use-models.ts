import { useQuery } from "@tanstack/react-query";
import { getGatewayClient, type ModelInfo } from "../connection/gateway-api";

export function useModels() {
  return useQuery<ModelInfo[]>({
    queryKey: ["models"],
    queryFn: () => getGatewayClient().listModels(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export type { ModelInfo };
