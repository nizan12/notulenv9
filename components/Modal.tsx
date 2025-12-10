
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string; // New prop for custom width
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, maxWidth = 'max-w-md' }) => {
  const [show, setShow] = useState(false);
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      // Small timeout to ensure DOM is ready for transition class
      setTimeout(() => setShow(true), 10);
      
      // Prevent background scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      setShow(false);
      // Wait for transition duration (300ms) before unmounting
      const timer = setTimeout(() => {
        setRender(false);
        // Restore scrolling
        document.body.style.overflow = 'unset';
      }, 300);
      
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!render) return null;

  // Use React Portal to render the modal directly into document.body
  return createPortal(
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${show ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'}`}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} overflow-hidden transform transition-all duration-300 ${show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
