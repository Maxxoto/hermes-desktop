import { useQuery, useMutation } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { GatewayClient, type HealthResponse } from "./gateway-api";
import { useConnectionStore } from "./connection-store";

// ---------------------------------------------------------------------------
// useInitializeConnection — hydrate store from Rust keychain on mount
// ---------------------------------------------------------------------------

export function useInitializeConnection() {
  const setCredentials = useConnectionStore((s) => s.setCredentials);

  return useQuery({
    queryKey: ["connection", "initialize"],
    queryFn: async () => {
      const creds: { gateway_url: string; api_key: string } | null =
        await invoke("load_credentials");

      if (creds) {
        setCredentials(creds.gateway_url, creds.api_key);
      }

      return creds;
    },
    staleTime: Infinity, // we only run this once on app start
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// useTestConnection — try health() and return result
// ---------------------------------------------------------------------------

export function useTestConnection() {
  return useMutation({
    mutationFn: async ({
      url,
      key,
    }: {
      url: string;
      key: string;
    }): Promise<HealthResponse> => {
      const client = new GatewayClient(url, key);
      return client.health();
    },
  });
}
