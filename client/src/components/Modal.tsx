import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export function Modal({ isOpen, onClose, title, children, width = '480px' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="vb-modal-overlay" onClick={onClose}>
      <div 
        className="vb-modal" 
        style={{ width, maxWidth: '95%' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vb-modal-header">
          <h2 className="vb-modal-title">{title}</h2>
          <button className="vb-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="vb-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
