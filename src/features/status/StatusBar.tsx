import { useGatewayHealth } from "./use-gateway-health";

const isConnected = (status: string) =>
  status.toLowerCase() === "ok" || status.toLowerCase() === "healthy";

export default function StatusBar() {
  const { data, isLoading, isError, reconnectIn } = useGatewayHealth();

  const connected =
    !isLoading && !isError && data !== undefined && isConnected(data.status);

  return (
    <footer role="status" className="flex items-center justify-between vibrancy-statusbar px-5 text-[11px] dark:text-mac-secondary-label light:text-gray-500"
      style={{ height: "26px" }}>
      {/* Left — Connection indicator */}
      <div className="flex items-center gap-2">
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[6px] w-[6px] animate-pulse rounded-full dark:bg-mac-orange light:bg-orange-500" />
            Connecting…
          </span>
        ) : connected ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[6px] w-[6px] rounded-full dark:bg-mac-green light:bg-green-500 glow-green" />
            Connected
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[6px] w-[6px] animate-pulse rounded-full dark:bg-mac-red light:bg-red-500 glow-red" />
            {reconnectIn !== null ? (
              <span className="dark:text-mac-orange light:text-orange-500 font-medium">
                Connection lost — reconnecting in {reconnectIn}s.
              </span>
            ) : (
              <span className="dark:text-mac-orange light:text-orange-500 font-medium">Connection lost — retrying…</span>
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
