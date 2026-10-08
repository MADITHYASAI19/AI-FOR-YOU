import { useState, useCallback } from 'react';
import { Info, CheckCircle, XCircle, X } from 'lucide-react';
import { ToastContext } from './toastContext';
import './Toast.css';

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    
    // Give animation time to play before actual unmount
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((title, description, type = 'info', duration = 5000) => {
    const id = idCounter++;
    setToasts(prev => [...prev, { id, title, description, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="toast-container">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`toast-item ${toast.type} ${toast.exiting ? 'exiting' : ''}`}
          >
            <div className="toast-glow" />
            <div className="toast-content">
              <div className="toast-icon">
                {toast.type === 'success' && <CheckCircle size={18} />}
                {toast.type === 'error' && <XCircle size={18} />}
                {toast.type === 'info' && <Info size={18} />}
              </div>
              <div className="toast-text">
                <span className="toast-title">{toast.title}</span>
                {toast.description && <span className="toast-desc">{toast.description}</span>}
              </div>
              <button 
                className="toast-close clickable" 
                onClick={() => removeToast(toast.id)}
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
            {toast.duration > 0 && !toast.exiting && (
              <div 
                className="toast-progress" 
                style={{ animationDuration: `${toast.duration}ms` }} 
              />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
