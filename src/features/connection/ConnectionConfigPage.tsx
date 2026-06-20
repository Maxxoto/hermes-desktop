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
    <div className="flex min-h-dvh items-center justify-center dark:bg-mac-window light:bg-[#ECECEC] px-4">
      <div className="w-full max-w-md glass-surface rounded-xl p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-[17px] font-bold dark:text-mac-label light:text-black">Hermes Desktop</h1>
          <p className="mt-1 text-[13px] dark:text-mac-secondary-label light:text-gray-600">
            Connect to your Hermes Gateway
          </p>
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Gateway URL */}
          <div>
            <label
              htmlFor="gateway-url"
              className="mb-1.5 block text-[13px] font-semibold dark:text-mac-label light:text-black"
            >
              Gateway URL
            </label>
            <input
              id="gateway-url"
              type="url"
              placeholder="https://gateway.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full glass-input px-3 py-1.5 outline-none text-[13px]
                dark:text-mac-label dark:placeholder:text-mac-tertiary-label
                light:text-black light:placeholder:text-gray-400
                transition-all"
            />
          </div>

          {/* API Key */}
          <div>
            <label
              htmlFor="api-key"
              className="mb-1.5 block text-[13px] font-semibold dark:text-mac-label light:text-black"
            >
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full glass-input px-3 py-1.5 outline-none text-[13px]
                dark:text-mac-label dark:placeholder:text-mac-tertiary-label
                light:text-black light:placeholder:text-gray-400
                transition-all"
            />
          </div>

          {/* Test connection feedback */}
          {testMutation.isPending && (
            <p className="text-[13px] dark:text-mac-secondary-label light:text-gray-600">Testing connection…</p>
          )}

          {testMutation.isError && (
            <p className="text-[13px] dark:text-mac-red light:text-red-500">
              Connection failed:{" "}
              {testMutation.error instanceof Error
                ? testMutation.error.message
                : "Unknown error"}
            </p>
          )}

          {testMutation.isSuccess && (
            <p className="text-[13px] dark:text-mac-green light:text-green-600">
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
              className="mac-btn flex-1"
            >
              Test Connection
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!url.trim() || !key.trim()}
              className="mac-btn mac-btn-primary flex-1"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
