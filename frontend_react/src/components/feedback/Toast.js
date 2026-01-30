import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Minimal toast system:
 * - no external deps
 * - global provider placed at App root
 * - used for optimistic UX feedback (e.g., "Draft created")
 */

const ToastContext = createContext(null);

// PUBLIC_INTERFACE
export function ToastProvider({ children }) {
  /** Provides toast state and actions to the app. */
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const next = {
        id,
        kind: toast.kind || "info",
        title: toast.title || "",
        message: toast.message || "",
        ttlMs: typeof toast.ttlMs === "number" ? toast.ttlMs : 4000
      };

      setItems((prev) => [...prev, next]);

      // Auto dismiss
      window.setTimeout(() => remove(id), next.ttlMs);

      return id;
    },
    [remove]
  );

  const api = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

// PUBLIC_INTERFACE
export function useToast() {
  /** Hook to push/dismiss toasts from anywhere inside ToastProvider. */
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within <ToastProvider />");
  }
  return ctx;
}

function ToastViewport({ items, onDismiss }) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions removals"
      style={{
        position: "fixed",
        right: 16,
        top: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: "min(420px, calc(100vw - 32px))"
      }}
    >
      {items.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.kind}`}
          role="status"
          aria-label={t.title || "Notification"}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              {t.title ? <div className="toast__title">{t.title}</div> : null}
              {t.message ? <div className="toast__message">{t.message}</div> : null}
            </div>
            <button
              type="button"
              className="toast__dismiss"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
