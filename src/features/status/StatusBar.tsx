import { useGatewayHealth } from "./use-gateway-health";

const isConnected = (status: string) =>
  status.toLowerCase() === "ok" || status.toLowerCase() === "healthy";

export default function StatusBar() {
  const { data, isLoading, isError, reconnectIn } = useGatewayHealth();

  const connected =
    !isLoading && !isError && data !== undefined && isConnected(data.status);

  return (
    <footer className="flex items-center justify-between glass-border-t vibrancy-statusbar px-5 text-[10px] dark:text-mac-tertiary-label light:text-gray-400"
      style={{ height: "24px" }}>
      {/* Left — Connection indicator */}
      <div className="flex items-center gap-2">
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full dark:bg-mac-orange light:bg-orange-500" />
            Connecting…
          </span>
        ) : connected ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full dark:bg-mac-green light:bg-green-500 shadow-[0_0_8px_rgba(50,215,75,0.5)]" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full dark:bg-mac-red light:bg-red-500 shadow-[0_0_8px_rgba(255,69,58,0.5)]" />
            {reconnectIn !== null ? (
              <span className="dark:text-mac-red light:text-red-500">
                Connection lost — reconnecting in {reconnectIn}s.
              </span>
            ) : (
              <span className="dark:text-mac-red light:text-red-500">Connection lost — retrying…</span>
            )}
          </span>
        )}
      </div>

      {/* Right — Sessions + version */}
      <div className="flex items-center gap-4">
        {data && (
          <span className="dark:text-mac-tertiary-label light:text-gray-400">
            {data.activeSessions} active session
            {data.activeSessions !== 1 ? "s" : ""}
          </span>
        )}
        <span className="font-mono dark:text-mac-tertiary-label light:text-gray-400">
          v{data?.version ?? "?"}
        </span>
      </div>
    </footer>
  );
}
