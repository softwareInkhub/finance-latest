import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClass?: string; // e.g. 'max-w-xs', 'max-w-4xl'
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidthClass = 'max-w-4xl' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-30 p-4">
      <div className={`bg-white rounded-lg shadow-lg w-full ${maxWidthClass} mx-auto relative max-h-[90vh] flex flex-col`}>
        {title ? (
        <div className="flex justify-between items-center border-b px-4 md:px-6 py-3 md:py-4">
          <h2 className="text-base md:text-lg font-semibold">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-2 -mr-2"
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>
        ) : (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl leading-none p-2"
            aria-label="Close modal"
          >
            &times;
          </button>
        )}
        <div className="p-4 md:p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal; 