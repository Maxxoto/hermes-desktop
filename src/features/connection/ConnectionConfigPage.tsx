import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { useConnectionStore } from "./connection-store";
import { useTestConnection } from "./use-gateway-connection";
import { useWindowTitle } from "../../hooks/use-window-title";

export default function ConnectionConfigPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEditMode = searchParams.get("edit") === "1";
  const { gatewayUrl, apiKey, isConfigured, setCredentials } =
    useConnectionStore();

  useWindowTitle(isEditMode ? "Settings" : "Connect");

  const [url, setUrl] = useState(gatewayUrl);
  const [key, setKey] = useState(apiKey);

  const testMutation = useTestConnection();

  useEffect(() => {
    // Only auto-redirect on initial setup — not when user opened Settings voluntarily
    if (!isEditMode && isConfigured && gatewayUrl && apiKey) {
      navigate("/chat", { replace: true });
    }
  }, [isEditMode, isConfigured, gatewayUrl, apiKey, navigate]);

  useEffect(() => {
    setUrl(gatewayUrl);
    setKey(apiKey);
  }, [gatewayUrl, apiKey]);

  const handleTestConnection = async () => {
    if (!url.trim() || !key.trim()) return;
    testMutation.mutate({ url: url.trim(), key: key.trim() });
  };

  const handleSave = async () => {
    if (!url.trim() || !key.trim()) return;
    setCredentials(url.trim(), key.trim());

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

  return (
    <div className="flex min-h-dvh items-center justify-center px-4"
      style={{ background: 'var(--mac-window)' }}>
      <div className="w-full max-w-md glass-surface rounded-2xl p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ 
              background: "linear-gradient(135deg, var(--mac-accent) 0%, #0066cc 100%)",
              boxShadow: "0 8px 24px rgba(41, 151, 255, 0.3)"
            }}>
            <span className="text-2xl font-bold text-white">H</span>
          </div>
          <h1 className="text-[20px] font-semibold dark:text-mac-label light:text-black">
            Hermes Desktop
          </h1>
          <p className="mt-2 text-[13px] dark:text-mac-secondary-label light:text-gray-600">
            {isEditMode ? "Gateway Settings" : "Connect to your Hermes Gateway"}
          </p>
        </div>

        {/* Back to Chat (edit mode only) */}
        {isEditMode && (
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="mac-btn w-full mb-5 flex items-center justify-center gap-2"
          >
            ← Back to Chat
          </button>
        )}

        {/* Form */}
        <div className="space-y-5">
          {/* Gateway URL */}
          <div>
            <label
              htmlFor="gateway-url"
              className="mb-2 block text-[12px] font-medium dark:text-mac-secondary-label light:text-gray-600"
            >
              Gateway URL
            </label>
            <input
              id="gateway-url"
              type="url"
              placeholder="https://gateway.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full glass-input px-4 py-2.5 text-[14px]
                dark:text-mac-label dark:placeholder:text-mac-tertiary-label
                light:text-black light:placeholder:text-gray-400"
            />
          </div>

          {/* API Key */}
          <div>
            <label
              htmlFor="api-key"
              className="mb-2 block text-[12px] font-medium dark:text-mac-secondary-label light:text-gray-600"
            >
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full glass-input px-4 py-2.5 text-[14px]
                dark:text-mac-label dark:placeholder:text-mac-tertiary-label
                light:text-black light:placeholder:text-gray-400"
            />
          </div>

          {/* Feedback */}
          {testMutation.isPending && (
            <p className="text-[13px] dark:text-mac-secondary-label light:text-gray-600">
              Testing connection…
            </p>
          )}

          {testMutation.isError && (
            <div role="alert" className="p-3 rounded-lg text-[13px]"
              style={{ background: "rgba(255, 69, 58, 0.1)", border: "1px solid rgba(255, 69, 58, 0.2)" }}>
              <p className="dark:text-mac-red light:text-red-500">
                Connection failed:{" "}
                {testMutation.error instanceof Error
                  ? testMutation.error.message
                  : "Unknown error"}
              </p>
            </div>
          )}

          {testMutation.isSuccess && (
            <div role="status" className="p-3 rounded-lg text-[13px]"
              style={{ background: "rgba(48, 209, 88, 0.1)", border: "1px solid rgba(48, 209, 88, 0.2)" }}>
              <p className="dark:text-mac-green light:text-green-600">
                Connected! Status: <span className="font-semibold">{testMutation.data.status}</span>
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-3">
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
