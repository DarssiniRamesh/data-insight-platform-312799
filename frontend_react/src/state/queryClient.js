import { QueryClient } from "@tanstack/react-query";

function isRetryableError(error) {
  // Avoid retries on expected "business" failures (422, 400, 403, 409)
  const status = error?.httpStatus;
  if ([400, 403, 409, 422].includes(status)) return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (!isRetryableError(error)) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: (failureCount, error) => {
        if (!isRetryableError(error)) return false;
        return failureCount < 1;
      }
    }
  }
});
