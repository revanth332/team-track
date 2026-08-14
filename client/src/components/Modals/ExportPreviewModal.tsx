import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from '../../context/ToastContext';

interface ExportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  formattedText: string;
  isLoading?: boolean;
}

export default function ExportPreviewModal({
  isOpen,
  onClose,
  title,
  subtitle,
  formattedText,
  isLoading = false
}: ExportPreviewModalProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    showToast('Formatted updates copied to clipboard!', 'success');
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col z-10"
          >
            {/* Header */}
            <div className="p-6 md:p-8 border-b border-outline-variant/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-on-surface">{title}</h3>
                  <p className="text-xs font-medium text-on-surface-variant/70 mt-0.5">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-surface-container-lowest">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-primary">
                  <Loader2 size={36} className="animate-spin" />
                  <p className="text-sm font-bold">Preparing export preview...</p>
                </div>
              ) : (
                <div className="relative">
                  <pre className="w-full bg-surface-container-low/60 border border-outline-variant/10 rounded-2xl p-6 text-xs font-mono leading-relaxed text-on-surface overflow-x-auto whitespace-pre-wrap max-h-[50vh]">
                    {formattedText}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-outline-variant/10 flex items-center justify-between gap-4 shrink-0">
              <span className="text-xs text-on-surface-variant/60 font-medium hidden sm:inline">
                Click copy to save the formatted text to your clipboard.
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-2xl transition-colors w-full sm:w-auto"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isLoading || !formattedText}
                  onClick={handleCopy}
                  className="primary-gradient text-on-primary px-8 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
