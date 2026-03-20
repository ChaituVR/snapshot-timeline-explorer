import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-6xl p-0 my-8 text-left bg-zinc-900 border-2 border-zinc-700 shadow-2xl transform transition-all">
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-10 w-8 h-8 flex items-center justify-center bg-red-600 text-white border-2 border-zinc-700 hover:bg-red-700 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
