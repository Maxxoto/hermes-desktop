import { useQuery } from "@tanstack/react-query";
import { getGatewayClient, type ModelInfo } from "../connection/gateway-api";

const DEFAULT_MODELS: ModelInfo[] = [
  { id: "default", name: "Default Model", provider: "default" },
];

export function useModels() {
  return useQuery<ModelInfo[]>({
    queryKey: ["models"],
    queryFn: () => getGatewayClient().listModels(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: DEFAULT_MODELS,
  });
}

export type { ModelInfo };
