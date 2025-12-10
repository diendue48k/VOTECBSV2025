import React from 'react';
import { Button } from './Button';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  type?: 'confirm' | 'alert' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  type = 'confirm',
  onConfirm,
  onCancel,
  confirmText = 'Đồng ý',
  cancelText = 'Hủy bỏ'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
        <div className={`p-4 flex items-center gap-3 border-b ${type === 'danger' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          {type === 'danger' ? (
            <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertCircle className="w-5 h-5"/></div>
          ) : (
            <div className="p-2 bg-blue-100 rounded-full text-blue-600"><HelpCircle className="w-5 h-5"/></div>
          )}
          <h3 className={`font-bold text-lg ${type === 'danger' ? 'text-red-800' : 'text-gray-800'}`}>{title}</h3>
        </div>
        
        <div className="p-5 text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          {type !== 'alert' && (
            <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              {cancelText}
            </Button>
          )}
          <Button 
            variant={type === 'danger' ? 'danger' : 'primary'} 
            onClick={onConfirm}
            className="w-full sm:w-auto shadow-md"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};