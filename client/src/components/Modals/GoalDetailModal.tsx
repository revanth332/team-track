import React from 'react';
import { X, Link as LinkIcon, BookOpen, Video, Info, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuarterlyGoal } from '../../types';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { goalService } from '../../services/api';
import { getProfileImage } from '../../utils/userUtils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface GoalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: QuarterlyGoal | null;
  onEdit: (goal: QuarterlyGoal) => void;
}

export default function GoalDetailModal({ isOpen, onClose, goal, onEdit }: GoalDetailModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => goalService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      showToast('Goal deleted successfully!', 'success');
      setIsDeleteModalOpen(false);
      onClose();
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to delete goal', 'error');
    }
  });

  if (!goal) return null;

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (goal) {
      deleteMutation.mutate(goal.id);
    }
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
            className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${goal.type === 'blog' ? 'bg-green-500/10 text-green-600' : 'bg-green-500/10 text-green-600'}`}>
                  {goal.type === 'blog' ? <BookOpen size={24} /> : <Video size={24} />}
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-on-surface">{goal.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-container-high flex items-center justify-center text-[8px] font-bold text-primary relative">
                      {(() => {
                        const username = goal.assignee_username;
                        if (username) {
                          return (
                            <img 
                              src={getProfileImage(username)} 
                              alt={goal.assignee}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          );
                        }
                        return null;
                      })()}
                      <span className="absolute inset-0 flex items-center justify-center -z-10">
                        {(goal.assignee || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Assignee:</span>
                    <span className="text-xs font-bold text-green-600">{goal.assignee}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onEdit(goal)}
                  className="p-2 rounded-xl hover:bg-primary/10 text-primary transition-colors"
                  title="Edit Goal"
                >
                  <Edit size={20} />
                </button>
                {goal.status === 'Canceled' && user?.admin && (
                  <button 
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    className="p-2 rounded-xl hover:bg-error/10 text-error transition-colors disabled:opacity-50"
                    title="Delete Goal"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-8">
              {/* Description */}
              <div className="space-y-2">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 flex items-center gap-2">
                  <Info size={12} />
                  Description
                </h5>
                <div className="text-sm font-medium text-on-surface-variant leading-relaxed bg-surface-container-low/30 p-6 rounded-2xl prose prose-sm max-w-none prose-primary">
                  <ReactMarkdown>{goal.description}</ReactMarkdown>
                </div>
              </div>

              {/* Links */}
              {goal.links && goal.links.length > 0 && (
                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Resources & Links</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {goal.links.map((link, i) => (
                      <a 
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-surface-container-low/50 rounded-xl hover:bg-primary/5 transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-on-surface-variant/40 group-hover:text-primary transition-colors">
                          <LinkIcon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate">{link.name}</p>
                          <p className="text-[10px] text-on-surface-variant/60 truncate">{link.url}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <ConfirmationModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={confirmDelete}
            title="Delete Goal"
            message={`Are you sure you want to delete the goal "${goal.title}"? This action cannot be undone.`}
            confirmText="Delete Goal"
            isLoading={deleteMutation.isPending}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
