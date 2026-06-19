import { useGatewayHealth } from "./use-gateway-health";

const isConnected = (status: string) =>
  status.toLowerCase() === "ok" || status.toLowerCase() === "healthy";

export default function StatusBar() {
  const { data, isLoading, isError } = useGatewayHealth();

  const connected =
    !isLoading && !isError && data !== undefined && isConnected(data.status);

  return (
    <footer className="flex h-9 items-center justify-between border-t border-gray-800 bg-gray-900 px-4 text-xs text-gray-300">
      {/* Left — Connection indicator */}
      <div className="flex items-center gap-2">
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
            Connecting…
          </span>
        ) : connected ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
            <span className="text-red-400">Connection lost — retrying…</span>
          </span>
        )}
      </div>

      {/* Right — Sessions + version */}
      <div className="flex items-center gap-4">
        {data && (
          <span className="text-gray-400">
            {data.activeSessions} active session
            {data.activeSessions !== 1 ? "s" : ""}
          </span>
        )}
        <span className="font-mono text-gray-500">
          v{data?.version ?? "?"}
        </span>
      </div>
    </footer>
  );
}
