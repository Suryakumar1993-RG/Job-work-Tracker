// src/components/Toast.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, show: false }]);

    // Trigger show animation
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, show: true } : t));
    }, 10);

    // Remove after 3.5s
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, show: false } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300);
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="toast-container">
        {toasts.map(toast => {
          let icon = "✓";
          if (toast.type === "error") icon = "✗";
          if (toast.type === "warning") icon = "⚠";
          if (toast.type === "info") icon = "ℹ";

          return (
            <div key={toast.id} className={`toast toast-${toast.type} ${toast.show ? 'show' : ''}`}>
              <div className="toast-icon">{icon}</div>
              <div className="toast-message">{toast.message}</div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
