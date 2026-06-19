import React from "react";
import ReactDOM from "react-dom/client";
import { Outlet, createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ConnectionConfigPage from "./features/connection/ConnectionConfigPage";
import ChatPage from "./features/chat/ChatPage";
import StatusBar from "./features/status/StatusBar";
import { useInitializeConnection } from "./features/connection/use-gateway-connection";
import "./index.css";

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
// Layout — wraps chat routes with StatusBar at the bottom
// ---------------------------------------------------------------------------

function Layout() {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
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
