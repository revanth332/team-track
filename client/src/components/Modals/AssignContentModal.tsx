import React, { useState } from 'react';
import { X, UserPlus, Loader2, BookOpen, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ideaService, teamService } from '../../services/api';
import { Idea } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface AssignContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: Idea | null;
  type: 'blog' | 'video';
}

export default function AssignContentModal({ isOpen, onClose, idea, type }: AssignContentModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => teamService.getMembers(),
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: (memberId: string) => {
      if (!idea) throw new Error('Idea not found');
      const member = members?.find(m => m.id === memberId);
      if (!member) throw new Error('Member not found');

      const payload = {
        blog_assignee: type === 'blog' ? member.name : idea.blog_assignee,
        blog_assignee_username: type === 'blog' ? member.username : (idea as any).blog_assignee_username,
        video_assignee: type === 'video' ? member.name : idea.video_assignee,
        video_assignee_username: type === 'video' ? member.username : (idea as any).video_assignee_username,
      };
      return ideaService.updateIdea(idea.id, payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
      showToast('Assigned successfully!', 'success');
      onClose();
      setSelectedMemberId('');
    },
    onError: (error: any) => {
      showToast(error.message || 'Failed to assign content', 'error');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMemberId) {
      assignMutation.mutate(selectedMemberId);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && idea && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
            className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'blog' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                  {type === 'blog' ? <BookOpen size={20} /> : <Video size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-on-surface">
                    {type === 'blog' ? 'Assign Blog' : 'Assign Video'}
                  </h3>
                  <p className="text-on-surface-variant text-xs font-medium mt-0.5">
                    Assign this {type} to a team member.
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Idea Title</label>
                  <p className="text-sm font-bold text-on-surface px-1 truncate">{idea.title}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Added By</label>
                  <p className="text-sm font-bold text-primary px-1">{user?.name || idea.username}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 px-1">Assignee Name</label>
                <div className="relative group">
                  <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors" size={18} />
                  <select 
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full bg-surface-container-low/50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:ring-2 focus:ring-primary/10 outline-none transition-all font-medium appearance-none"
                  >
                    <option value="">Select a team member...</option>
                    {members?.map(member => (
                      <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3.5 text-sm font-bold text-on-surface-variant hover:bg-surface-container-low rounded-2xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={assignMutation.isPending || !selectedMemberId}
                  className="flex-1 primary-gradient text-on-primary px-6 py-3.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {assignMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  <span>Confirm</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
