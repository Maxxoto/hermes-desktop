import { useNavigate } from "react-router-dom";
import { ShieldAlert, X } from "lucide-react";
import { useAuthStore } from "./auth-store";

/**
 * ReAuthBanner — shows a dismissible warning banner when a 401 response
 * has been received from the gateway. The banner prompts the user to
 * update their API key and provides a button to navigate to /connection.
 */
export default function ReAuthBanner() {
  const { needsReauth, setNeedsReauth } = useAuthStore();
  const navigate = useNavigate();

  if (!needsReauth) return null;

  const handleGoToSettings = () => {
    setNeedsReauth(false);
    navigate("/connection");
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-700/50 bg-amber-900/80 px-4 py-2 text-sm text-amber-100">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 flex-shrink-0" />
        <span>Your API key has expired. Update your connection settings.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleGoToSettings}
          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-500 transition-colors cursor-pointer"
        >
          Update Settings
        </button>
        <button
          onClick={() => setNeedsReauth(false)}
          className="p-1 rounded-md text-amber-300 hover:text-amber-100 hover:bg-amber-800 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
