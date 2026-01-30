import React from "react";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";

import "./App.css";
import { router } from "./routes/router";
import { queryClient } from "./state/queryClient";
import { GlobalErrorBoundary } from "./components/error/GlobalErrorBoundary";

// PUBLIC_INTERFACE
function App() {
  /** Root application component: provides React Query + Router + global error boundary. */
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <RouterProvider router={router} />
      </GlobalErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
