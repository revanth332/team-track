import React from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'info';
  isLoading?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  isLoading = false
}: ConfirmationModalProps) {
  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/20 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-sm bg-surface-container-high rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDanger ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'}`}>
                  {isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-bold text-on-surface tracking-tight mb-2">{title}</h2>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">{message}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-on-surface-variant bg-surface-container hover:bg-surface-container-highest rounded-2xl transition-all"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-6 py-3.5 text-sm font-bold text-white rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center ${
                    isDanger 
                      ? 'bg-error hover:bg-error/90 shadow-error/20' 
                      : 'bg-primary hover:bg-primary-hover shadow-primary/20'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
