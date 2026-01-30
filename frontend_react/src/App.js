import React from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import "./App.css";
import { router } from "./routes/router";
import { queryClient } from "./state/queryClient";
import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary";
import { ToastProvider } from "./components/feedback/Toast";

// PUBLIC_INTERFACE
function App() {
  /** Root application component: provides React Query + Router + global error boundary. */
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <GlobalErrorBoundary>
          <RouterProvider router={router} />
        </GlobalErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
