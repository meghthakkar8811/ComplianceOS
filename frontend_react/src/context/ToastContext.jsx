import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

let globalToastFn = null;
export const toast = (msg, type = 'info') => {
  if (globalToastFn) {
    globalToastFn(msg, type);
  } else {
    console.log(`[Toast ${type}]: ${msg}`);
  }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    const icons = { success: '✓', error: '✕', info: 'ℹ', warn: '⚠' };
    const icon = icons[type] || 'ℹ';
    const item = { id, msg, type, icon, exiting: false };

    setToasts((prev) => [...prev, item]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 240);
    }, 3200);
  }, []);

  useEffect(() => {
    globalToastFn = showToast;
    return () => {
      globalToastFn = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type} ${t.exiting ? 'out' : ''}`}>
            <span style={{ fontSize: '15px', flexShrink: 0 }}>{t.icon}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext) || showToastFallback;
}

function showToastFallback(msg, type) {
  toast(msg, type);
}

