"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Tone = "success" | "info" | "error";
type Toast = { id: number; message: string; tone: Tone };

const ICON: Record<Tone, string> = { success: "check_circle", info: "info", error: "error" };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

/** Call to show a transient confirmation, e.g. toast("Care note added"). */
export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

/**
 * App-wide toast host. Wraps the app content so any client component can call
 * useToast() to confirm an action (saved / revealed / approved) without a full
 * page reaction. Auto-dismisses; dismissible; announced to screen readers.
 */
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message, tone }]);
      setTimeout(() => dismiss(id), 3400);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-host" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast tone-${t.tone}`}>
            <span className="ms" aria-hidden="true" style={{ fontSize: 18 }}>{ICON[t.tone]}</span>
            <span className="toast-msg">{t.message}</span>
            <button className="toast-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <span className="ms" aria-hidden="true" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
