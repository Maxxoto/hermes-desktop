import { useNavigate } from "react-router-dom";
import { useAutoUpdater } from "./hooks/use-auto-updater";
import { useDeepLink } from "./hooks/use-deep-link";

/**
 * App is the root component hook host.
 *
 * Note: Routing is handled by RouterProvider in main.tsx. This component
 * is rendered inside the router tree (via RootLayout) to provide global
 * hooks that need router context (useNavigate for deep-link routing).
 *
 * The actual UI is rendered via route elements + Outlet.
 */
export default function App() {
  const navigate = useNavigate();

  useAutoUpdater();

  useDeepLink({
    onSession: (sessionId) => {
      navigate(`/chat?session=${encodeURIComponent(sessionId)}`);
    },
    onSettings: () => {
      navigate("/connection?edit=1");
    },
  });

  return null;
}
