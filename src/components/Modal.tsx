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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-full transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="p-6 overflow-y-auto max-h-[90vh]">
          {children}
        </div>
      </div>
    </div>
  );
};
        <div 
          className="fixed inset-0 transition-opacity bg-black bg-opacity-70 backdrop-blur-sm" 
          onClick={onClose} 
        />
        
        <div className="relative inline-block w-full max-w-4xl text-left bg-slate-800 rounded-2xl shadow-2xl transform transition-all border border-slate-700 max-h-[90vh] overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="p-6 overflow-y-auto max-h-[85vh]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};