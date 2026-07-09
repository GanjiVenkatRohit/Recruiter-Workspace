import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X, Trash2, LogIn, LogOut, FileUp, Save } from 'lucide-react';
import './ToastContainer.css';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleShowToast = (e) => {
      const { message, type, duration = 4000 } = e.detail;
      const id = crypto.randomUUID();
      
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };

    window.addEventListener('show-toast', handleShowToast);
    return () => window.removeEventListener('show-toast', handleShowToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} className="toast-icon success" />;
      case 'error':
        return <AlertCircle size={18} className="toast-icon error" />;
      case 'delete':
        return <Trash2 size={18} className="toast-icon delete" />;
      case 'login':
        return <LogIn size={18} className="toast-icon login" />;
      case 'logout':
        return <LogOut size={18} className="toast-icon logout" />;
      case 'upload':
        return <FileUp size={18} className="toast-icon upload" />;
      case 'save':
        return <Save size={18} className="toast-icon save" />;
      default:
        return <Info size={18} className="toast-icon info" />;
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item animate-slide-in ${toast.type || 'info'}`}>
          {getIcon(toast.type)}
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close-btn" onClick={() => removeToast(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
