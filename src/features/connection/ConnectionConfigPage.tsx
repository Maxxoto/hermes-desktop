import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useConnectionStore } from "./connection-store";
import { useTestConnection } from "./use-gateway-connection";
import { useWindowTitle } from "../../hooks/use-window-title";

// ---------------------------------------------------------------------------
// ConnectionConfigPage — /connection
// ---------------------------------------------------------------------------

export default function ConnectionConfigPage() {
  const navigate = useNavigate();
  const { gatewayUrl, apiKey, isConfigured, setCredentials } =
    useConnectionStore();

  useWindowTitle("Settings");

  const [url, setUrl] = useState(gatewayUrl);
  const [key, setKey] = useState(apiKey);

  const testMutation = useTestConnection();

  // Redirect to chat if already configured
  useEffect(() => {
    if (isConfigured && gatewayUrl && apiKey) {
      navigate("/chat", { replace: true });
    }
  }, [isConfigured, gatewayUrl, apiKey, navigate]);

  // Sync local form state when store changes (e.g. after load_credentials)
  useEffect(() => {
    setUrl(gatewayUrl);
    setKey(apiKey);
  }, [gatewayUrl, apiKey]);

  // ---- handlers ----------------------------------------------------------

  const handleTestConnection = async () => {
    if (!url.trim() || !key.trim()) return;
    testMutation.mutate({ url: url.trim(), key: key.trim() });
  };

  const handleSave = async () => {
    if (!url.trim() || !key.trim()) return;

    setCredentials(url.trim(), key.trim());

    // Persist credentials — Tauri keychain or localStorage fallback
    try {
      const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
      if (isTauri) {
        await invoke("store_credentials", {
          url: url.trim(),
          apiKey: key.trim(),
        });
      } else {
        localStorage.setItem(
          "hermes-desktop-credentials",
          JSON.stringify({ gateway_url: url.trim(), api_key: key.trim() })
        );
      }
      navigate("/chat", { replace: true });
    } catch (err) {
      console.error("Failed to persist credentials:", err);
    }
  };

  // ---- render ------------------------------------------------------------

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-100">Hermes Desktop</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Connect to your Hermes Gateway
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Gateway URL */}
          <div>
            <label
              htmlFor="gateway-url"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              Gateway URL
            </label>
            <input
              id="gateway-url"
              type="url"
              placeholder="https://gateway.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* API Key */}
          <div>
            <label
              htmlFor="api-key"
              className="mb-1.5 block text-sm font-medium text-neutral-300"
            >
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Test connection feedback */}
          {testMutation.isPending && (
            <p className="text-sm text-neutral-400">Testing connection…</p>
          )}

          {testMutation.isError && (
            <p className="text-sm text-red-400">
              Connection failed:{" "}
              {testMutation.error instanceof Error
                ? testMutation.error.message
                : "Unknown error"}
            </p>
          )}

          {testMutation.isSuccess && (
            <p className="text-sm text-emerald-400">
              Connected! Gateway status:{" "}
              <span className="font-semibold">{testMutation.data.status}</span>
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={!url.trim() || !key.trim() || testMutation.isPending}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!url.trim() || !key.trim()}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
