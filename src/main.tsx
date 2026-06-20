import React from "react";
import ReactDOM from "react-dom/client";
import { Outlet, createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConnectionConfigPage from "./features/connection/ConnectionConfigPage";
import ChatPage from "./features/chat/ChatPage";
import StatusBar from "./features/status/StatusBar";
import { useInitializeConnection } from "./features/connection/use-gateway-connection";
import { setOnUnauthorized } from "./features/connection/gateway-api";
import { useAuthStore } from "./features/connection/auth-store";
import ReAuthBanner from "./features/connection/ReAuthBanner";
import App from "./App";
import "./index.css";

// ---------------------------------------------------------------------------
// Wire 401 detection — GatewayClient calls this when any request returns 401
// ---------------------------------------------------------------------------
setOnUnauthorized(() => useAuthStore.getState().setNeedsReauth(true));

// ---------------------------------------------------------------------------
// Query client
// ---------------------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// ---------------------------------------------------------------------------
// RootLayout — wraps ALL routes, renders global hooks + outlet
// ---------------------------------------------------------------------------

function RootLayout() {
  return (
    <>
      <App />
      <Outlet />
    </>
  );
}

// ---------------------------------------------------------------------------
// Layout — wraps chat routes with StatusBar at the bottom
// ---------------------------------------------------------------------------

function Layout() {
  return (
    <div className="flex flex-col h-screen dark:bg-mac-window light:bg-[#ECECEC]">
      <ReAuthBanner />
      <Outlet />
      <StatusBar />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = createBrowserRouter([
  {
    // Root layout — renders App (auto-updater + deep-link hooks) for all children
    element: <RootLayout />,
    children: [
      {
        path: "/",
        element: <ConnectionConfigPage />,
      },
      {
        path: "/connection",
        element: <ConnectionConfigPage />,
      },
      {
        // Layout route — wraps children with StatusBar
        element: <Layout />,
        children: [
          {
            path: "/chat",
            element: <ChatPage />,
          },
        ],
      },
    ],
  },
]);

// ---------------------------------------------------------------------------
// Bootstrap — runs load_credentials once on mount
// ---------------------------------------------------------------------------

function Bootstrap() {
  useInitializeConnection();
  return null;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Bootstrap />
    </QueryClientProvider>
  </React.StrictMode>,
);
