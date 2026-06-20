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
    <div className="flex items-center justify-between gap-3 border-b dark:border-mac-orange/50 light:border-orange-400/50 bg-amber-900/80 dark:bg-mac-orange/20 light:bg-orange-100 px-4 py-2 text-[13px] dark:text-mac-label light:text-amber-900">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 flex-shrink-0 dark:text-mac-orange light:text-orange-600" />
        <span>Your API key has expired. Update your connection settings.</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleGoToSettings}
          className="mac-btn mac-btn-primary !h-5 text-[11px] !px-3"
        >
          Update Settings
        </button>
        <button
          onClick={() => setNeedsReauth(false)}
          className="mac-icon-btn !w-6 !h-6 dark:text-mac-secondary-label light:text-amber-700"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
