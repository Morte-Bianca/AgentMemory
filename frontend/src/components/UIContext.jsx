import React, { useState, useCallback, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { UIContext } from './ui-context';

export const UIProvider = ({ children }) => {
  const [modal, setModal] = useState({ isOpen: false, type: 'alert', message: '', onConfirm: null });
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'info' }); 
  
  useEffect(() => {
    if (toast.isVisible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, isVisible: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.isVisible, toast.message]);

  const showAlert = useCallback((message, type = 'info') => {
    setToast({ isVisible: true, message, type });
  }, []);

  const showConfirm = useCallback((message, onConfirm) => {
    setModal({ isOpen: true, type: 'confirm', message, onConfirm });
  }, []);

  const confirmAction = () => {
    if (modal.onConfirm) modal.onConfirm();
    setModal({ isOpen: false });
  };

  const cancelAction = () => {
    setModal({ isOpen: false });
  };

  return (
    <UIContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {/* Toast Notification */}
      {toast.isVisible && (
        <div style={{
          position: 'fixed', bottom: 32, right: 32, 
          background: 'var(--bg-panel)',
          border: `1px solid ${toast.type === 'error' ? 'var(--text-muted)' : 'var(--primary)'}`,
          color: 'var(--text-main)',
          padding: '16px 24px',
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '8px 8px 0 var(--border)',
          zIndex: 9999,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          textTransform: 'uppercase',
          fontSize: 13,
          letterSpacing: '0.02em',
          animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : toast.type === 'success' ? <CheckCircle2 size={20} /> : <Info size={20} />}
          {toast.message}
          <button onClick={() => setToast(prev => ({...prev, isVisible: false}))} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', marginLeft: 16 }}>
             <X size={16} />
          </button>
        </div>
      )}

      {/* Brutalist Modal */}
      {modal.isOpen && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000,
          padding: 24,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="brutalist-panel" style={{
            width: '100%', maxWidth: 480,
            background: 'var(--bg-color)',
            border: '2px solid var(--primary)',
            boxShadow: '16px 16px 0 var(--border)',
            position: 'relative',
            padding: 40
          }}>
            <h3 style={{ marginBottom: 16, fontSize: 24, display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <AlertCircle size={28} /> ACTION REQUIRED
            </h3>
            <p style={{ lineHeight: 1.6, marginBottom: 40, fontSize: 16, color: 'var(--text-main)' }}>
              {modal.message}
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              <button className="btn" style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }} onClick={cancelAction}>
                CANCEL
              </button>
              <button className="btn btn-primary" onClick={confirmAction}>
                PROCEED
              </button>
            </div>
          </div>
        </div>
      )}
    </UIContext.Provider>
  );
};
