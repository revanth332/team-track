import React, { useState } from 'react';
import { X, Loader2, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services/api';
import { useToast } from '../../context/ToastContext';

interface TaskReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  status: 'Approved' | 'Rejected';
}

export default function TaskReviewModal({ isOpen, onClose, taskId, status }: TaskReviewModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [comments, setComments] = useState('');

  const reviewMutation = useMutation({
    mutationFn: (review: { status: 'Approved' | 'Rejected', review_comments?: string }) => 
      taskService.reviewTask(taskId, review),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      showToast(`Task ${status.toLowerCase()} successfully`, 'success');
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || `Failed to ${status.toLowerCase()} task`, 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reviewMutation.mutate({ status, review_comments: comments });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="bg-surface rounded-[2rem] p-8 w-full max-w-md relative shadow-2xl overflow-hidden border border-outline-variant/10"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'Approved' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                  {status === 'Approved' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-on-surface">{status} Task</h3>
                  <p className="text-xs text-on-surface-variant font-medium opacity-60">
                    Provide feedback for this submission
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block flex items-center gap-2">
                    <MessageSquare size={14} /> Review Comments (Optional)
                  </span>
                  <textarea
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    className="w-full bg-surface-container-high/50 border border-outline-variant/10 rounded-2xl px-5 py-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium min-h-[140px] placeholder:text-on-surface-variant/40"
                    placeholder="Type your feedback"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 rounded-2xl font-bold text-sm text-on-surface-variant hover:bg-surface-container transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center gap-2 ${
                    status === 'Approved' 
                      ? 'bg-success text-on-success shadow-success/20 hover:shadow-success/40' 
                      : 'bg-error text-on-error shadow-error/20 hover:shadow-error/40'
                  }`}
                >
                  {reviewMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <span>Confirm</span>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
