// src/components/Modal.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState({ show: false, title: '', content: null });

  const openModal = useCallback((title, content) => {
    setModal({ show: true, title, content });
  }, []);

  const closeModal = useCallback(() => {
    setModal({ show: false, title: '', content: null });
  }, []);

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <div className={`modal-overlay ${modal.show ? 'show' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
        <div className="modal-container glass">
          <div className="modal-header">
            <h3>{modal.title}</h3>
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          <div>{modal.content}</div>
        </div>
      </div>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error('useModal must be used within ModalProvider');
  return context;
}
